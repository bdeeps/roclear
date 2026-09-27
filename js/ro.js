// ROClear's shared physics and parts: osmotic pressure, membrane flux, mixing and
// recovery sums, UV dose, impurity colours, a path helper for flowing particles,
// and 3D builders for the cartridges, pump, tank and tap of a home RO purifier.
import { THREE, M, rod, box, tube, clamp, lerp } from './kit.js';

// ---------------------------------------------------------------- osmosis
// Van 't Hoff: π = i·φ·M·R·T. For NaCl i = 2 (Na⁺ and Cl⁻). The osmotic coefficient φ ≈ 0.93
// corrects for ions that are not fully independent in real solutions (Robinson & Stokes,
// Electrolyte Solutions, 1959). R = 0.08314 L·bar/(mol·K), molar mass of NaCl 58.44 g/mol.
// Checks: 1,000 ppm → 0.79 bar (the usual rule of thumb is about 0.7 to 0.8 bar per 1,000 ppm);
// seawater at 35,000 ppm → 27.6 bar (quoted values 25 to 28 bar).
export const R_GAS = 0.08314, NACL = 58.44, PHI = 0.93;
export function osmoticBar(ppm, T = 25) {
  const molar = ppm / 1000 / NACL;                  // mol/L (1 ppm ≈ 1 mg/L in dilute water)
  return 2 * PHI * molar * R_GAS * (T + 273.15);
}
export const BAR_PSI = 14.5038;
// Pressure as a height of water: 1 bar ≈ 10.2 m of water (ρ = 1000 kg/m³, g = 9.81 m/s²).
export const barToMetres = (bar) => (bar * 1e5) / (1000 * 9.81);

// ---------------------------------------------------------------- membrane
// A standard home RO element (DuPont FilmTec TW30-1812-75 product data): 75 US gallons a day
// (about 12 L/h) at 3.4 bar (50 psi), 250 ppm feed, 25 °C, 15% recovery, 98% stabilised rejection.
// Solution-diffusion model: water flow Q = A·(ΔP − Δπ). With Δπ ≈ 0.2 bar at 250 ppm this gives
// A ≈ 12 / 3.2 ≈ 3.75 L/h per bar of net driving pressure for the whole element.
export const A_ELEMENT = 3.75;          // L/h per bar
export const GPD_75 = 75 * 3.785 / 24;  // 11.8 L/h
export function elementFlow(pBar, feedPpm, recovery = 0.3) {
  // Average osmotic pressure along the element: the feed side gets saltier towards the end.
  const cf = 1 / (1 - recovery);
  const piAvg = osmoticBar(feedPpm * (1 + cf) / 2);
  return Math.max(0, A_ELEMENT * (pBar - piAvg));
}
// Home booster pumps (diaphragm type, e.g. 75–100 GPD models) push about 4 to 6.5 bar (60–95 psi).
export const PUMP_BAR = 5.5;

// Permeate TDS after the membrane, and the final TDS after the TDS controller blends some
// pre-filtered (not RO-treated) water back in. blend = fraction of the product from the bypass.
export function tdsChain(feed, rejection = 0.95, blend = 0) {
  const perm = feed * (1 - rejection);
  const out = (1 - blend) * perm + blend * feed;
  return { perm, out };
}
// The blend fraction that brings the output up to a target TDS (0 if RO alone is above it).
export const blendFor = (feed, rejection, target) => {
  const perm = feed * (1 - rejection);
  return feed <= perm ? 0 : clamp((target - perm) / (feed - perm), 0, 1);
};

// Recovery: permeate ÷ feed. Everything else leaves as reject (concentrate).
// Salt balance: feed·Cf = perm·Cp + reject·Cc, so Cc = Cf·(1 − r·(1 − R)) / (1 − r).
export function recoverySums(r, feedPpm, rejection = 0.95) {
  const wastePerLitre = (1 - r) / r;
  const cf = 1 / (1 - r);                                   // concentration factor
  const conc = feedPpm * (1 - r * (1 - rejection)) / (1 - r);
  return { wastePerLitre, cf, conc, feedPerLitre: 1 / r };
}

// ---------------------------------------------------------------- UV
// Dose (fluence) = irradiance × time, in mJ/cm². Home units are designed like NSF/ANSI 55 Class A
// systems: at least 40 mJ/cm² at the rated flow with a new lamp. Dose falls as flow rises
// (less time in the chamber) and as the lamp ages. Low-pressure mercury lamps lose about 20–30%
// of their UV-C output over about 9,000 hours, so makers say to replace them yearly.
export const DESIGN_DOSE = 40, RATED_LPM = 2;
export const lampOutput = (months) => clamp(1 - 0.25 * (months / 12), 0.4, 1);
export const uvDose = (lpm, months) => DESIGN_DOSE * (RATED_LPM / Math.max(0.1, lpm)) * lampOutput(months);
// Dose needed per log (×10) of kill, from dose-response tables:
// E. coli: about 1.5 mJ/cm² per log over 1 to 7 logs (Chevrefils et al., IUVA News 8(1), 2006).
// Cryptosporidium, Giardia and viruses: US EPA UV Disinfection Guidance Manual (2006), Table 1.4:
// Crypto 2-log 5.8, 3-log 12, 4-log 22; virus (adenovirus-based) 1-log 58, 2-log 100, 3-log 143, 4-log 186.
const LOGTAB = {
  ecoli: [[0, 0], [2, 1], [10.7, 7]],
  crypto: [[0, 0], [1.6, 0.5], [2.5, 1], [5.8, 2], [12, 3], [22, 4], [40, 5]],
  virus: [[0, 0], [58, 1], [100, 2], [143, 3], [186, 4]],
};
export function logKill(kind, dose) {
  const t = LOGTAB[kind];
  for (let i = 1; i < t.length; i++) if (dose <= t[i][0]) return lerp(t[i - 1][1], t[i][1], (dose - t[i - 1][0]) / (t[i][0] - t[i - 1][0]));
  const a = t[t.length - 2], b = t[t.length - 1];
  return b[1] + (dose - b[0]) * (b[1] - a[1]) / (b[0] - a[0]);
}
export const pctKilled = (logs) => 100 * (1 - Math.pow(10, -logs));
export const fmtPct = (p) => (p >= 99.99 ? '99.99%+' : p >= 99 ? p.toFixed(2) + '%' : p.toFixed(0) + '%');

// ---------------------------------------------------------------- colours
export const C = {
  water: 0x4fc3ff, sediment: 0xa07a4c, chlorine: 0xd9e35a, salt: 0xff9f43, microbe: 0x5ce1a9, dead: 0x6a7280,
  reject: 0xc98a4b, pure: 0x8ef0ff,
};

// ---------------------------------------------------------------- paths
// A polyline sampled by arc length, so things can travel along it at a steady speed.
export function pathOf(points) {
  const P = points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p)));
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
  const total = L[L.length - 1];
  return {
    points: P, total, lengths: L,
    at(u, out = new THREE.Vector3()) {
      const d = clamp(u, 0, 1) * total;
      let lo = 0, hi = L.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= d) lo = m; else hi = m; }
      const k = (d - L[lo]) / Math.max(1e-9, L[hi] - L[lo]);
      return out.copy(P[lo]).lerp(P[hi], k);
    },
  };
}

// Instanced dots with per-instance colour.
export function dots(n, r = 0.045, seg = 8) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const c = new THREE.Color(0xffffff);
  for (let i = 0; i < n; i++) m.setColorAt(i, c);
  const o = new THREE.Object3D();
  m.put = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(1e-4, s)); o.updateMatrix(); m.setMatrixAt(i, o.matrix); };
  m.done = () => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; };
  return m;
}

// ---------------------------------------------------------------- parts
// An inline cartridge along X from x0 to x1: a body with rounded end caps and hose barbs.
export function cartridge(x0, x1, r, color, { clear = false, band = null } = {}) {
  const g = new THREE.Group();
  const mat = clear ? M.clear(color, 0.35) : M.plastic(color, { roughness: 0.4 });
  const body = rod(x0 + r * 0.25, x1 - r * 0.25, r, r, mat, 32);
  const capMat = M.plastic(0xeef1f5, { roughness: 0.35 });
  const c0 = rod(x0, x0 + r * 0.3, r * 0.55, r * 1.02, capMat, 32);
  const c1 = rod(x1 - r * 0.3, x1, r * 1.02, r * 0.55, capMat, 32);
  const barbMat = M.plastic(0xdfe3ea);
  g.add(body, c0, c1, rod(x0 - 0.12, x0, 0.04, 0.05, barbMat, 12), rod(x1, x1 + 0.12, 0.05, 0.04, barbMat, 12));
  if (band) g.add(rod((x0 + x1) / 2 - 0.12, (x0 + x1) / 2 + 0.12, r * 1.02, r * 1.02, M.plastic(band), 32));
  g.body = body; g.mat = mat;
  return g;
}

// A clear filter bowl hanging from a head, with a spun white core inside (the sediment pre-filter).
export function bowl(h = 1.1, r = 0.26) {
  const g = new THREE.Group();
  const head = box(r * 2.6, 0.2, r * 2.6, M.plastic(0x2f86d6)); head.position.y = h / 2 + 0.1;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, h, 32, 1, true), M.clear(0xcfe8ff, 0.3));
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(r * 0.92, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.clear(0xcfe8ff, 0.3)); bottom.position.y = -h / 2; bottom.scale.y = 0.4;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, h * 0.92, 24), M.matte(0xf3eee2)); core.castShadow = true;
  const dirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.64, r * 0.64, h * 0.92, 24, 1, true), M.ghost(C.sediment, 0.0));
  g.add(head, shell, bottom, core, dirt);
  g.dirt = dirt;
  return g;
}

// The booster pump: a motor can with a pump head, lying along X.
export function pump() {
  const g = new THREE.Group();
  g.add(rod(-0.35, 0.2, 0.2, 0.2, M.metal(0x3a404c, { roughness: 0.4, metalness: 0.6 }), 28));
  g.add(rod(0.2, 0.42, 0.24, 0.24, M.plastic(0x2a2e37), 28));
  const fanCap = rod(-0.45, -0.35, 0.18, 0.2, M.plastic(0x23262f), 28); g.add(fanCap);
  const foot = box(0.7, 0.06, 0.45, M.metal(0x7a8394)); foot.position.y = -0.24; g.add(foot);
  return g;
}

// The solenoid valve: a small brass body with a black coil on top.
export function solenoid() {
  const g = new THREE.Group();
  g.add(rod(-0.13, 0.13, 0.07, 0.07, M.metal(0xd4a64a, { roughness: 0.3 }), 16));
  const coil = box(0.2, 0.2, 0.18, M.plastic(0x1e2129)); coil.position.y = 0.15; g.add(coil);
  return g;
}

// The UV chamber: a steel tube with a glowing lamp inside a quartz sleeve, along X.
export function uvChamber(x0, x1, r = 0.17) {
  const g = new THREE.Group();
  const steel = M.metal(0xc8ced8, { roughness: 0.25, transparent: true, opacity: 1 });
  const shell = rod(x0, x1, r, r, steel, 32, true);
  const sleeve = rod(x0 - 0.05, x1 + 0.05, r * 0.42, r * 0.42, M.clear(0xe6f6ff, 0.35), 20);
  const lamp = rod(x0 + 0.05, x1 - 0.05, r * 0.26, r * 0.26, M.glow(0xb58cff), 16);
  const ends = [rod(x0 - 0.06, x0, r * 1.05, r * 1.05, M.plastic(0x2a2e37), 32), rod(x1, x1 + 0.06, r * 1.05, r * 1.05, M.plastic(0x2a2e37), 32)];
  g.add(shell, sleeve, lamp, ...ends);
  g.lamp = lamp; g.steel = steel;
  g.setXray = (on) => { steel.opacity = on ? 0.25 : 1; steel.depthWrite = !on; };
  return g;
}

// The storage tank: a box with a translucent shell and a water block that rises and falls.
export function tank(w, h, d) {
  const g = new THREE.Group();
  const shellMat = M.clear(0xe8f1ff, 0.22);
  const shell = box(w, h, d, shellMat); shell.castShadow = false;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry), new THREE.LineBasicMaterial({ color: 0x9aa6b8, transparent: true, opacity: 0.6 }));
  const water = box(w - 0.08, 1, d - 0.08, M.clear(0x3f9dff, 0.45, { depthWrite: false })); water.castShadow = false;
  const floatArm = box(0.5, 0.03, 0.03, M.plastic(0xffffff)); const floatBall = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), M.plastic(0xffffff));
  const flt = new THREE.Group(); floatArm.position.x = -0.25; floatBall.position.x = -0.5; flt.add(floatArm, floatBall); flt.position.set(w / 2 - 0.15, h / 2 - 0.25, 0);
  g.add(shell, edges, water, flt);
  g.setLevel = (k) => { const hh = Math.max(0.01, (h - 0.08) * k); water.scale.y = hh; water.position.y = -h / 2 + 0.04 + hh / 2; flt.rotation.z = clamp((k - 0.8) * 2, -0.5, 0.25); };
  g.float = flt;
  return g;
}

// A chrome tap: a short upright with a curved spout, facing +Z.
export function tap() {
  const g = new THREE.Group();
  const chrome = M.metal(0xdfe4ec, { roughness: 0.15 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.1, 20), chrome);
  g.add(base, tube([[0, 0, 0], [0, 0.18, 0.05], [0, 0.2, 0.25], [0, 0.05, 0.38]], 0.04, chrome, false, 30));
  const lever = box(0.04, 0.2, 0.04, M.plastic(0x2f86d6)); lever.position.set(0, 0.28, 0.02); g.add(lever);
  g.spout = new THREE.Vector3(0, 0.02, 0.38);
  return g;
}

// A clear pipe along a path.
export const pipe = (pts, r = 0.035, color = 0xe8f1ff, op = 0.45) => tube(pts, r, M.clear(color, op), false, Math.max(40, pts.length * 12));

// On a phone the readout covers the top of the stage, so nudge the picture down a little.
// Chapters call this every frame and undo it in dispose().
export function fitNarrow(stage, amt = 0.16) {
  const want = stage.host.clientWidth < 560 ? -amt : 0;
  if ((stage.shift?.[1] || 0) !== want) stage.setShift(0, want);
}
