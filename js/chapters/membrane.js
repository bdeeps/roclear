// Chapter 3: the spiral-wound thin-film composite membrane, unrolled, and what gets through.
// Sizes: water molecule ≈ 0.28 nm; hydrated Na⁺ ≈ 0.72 nm and Cl⁻ ≈ 0.66 nm across
// (Nightingale, J. Phys. Chem. 63, 1959); viruses 20–300 nm; bacteria about 0.5–5 µm;
// UF pores about 10 nm (0.01 µm). RO polyamide has no fixed holes: its free-volume gaps are
// a few tenths of a nanometre, the "0.0001 µm" figure makers quote. Salt rejection of home
// elements is 90–99% (FilmTec TW30-1812-75: 98% stabilised under test conditions).
import { THREE, M, box, canvasTexture, approach, clamp } from '../kit.js';
import { C, dots, fitNarrow } from '../ro.js';

const H = 2.4, YC = 1.7;                   // element height and centre height
const R0 = 0.22, GAP = 0.1, TURNS = 3.2;    // core tube radius, layer spacing per turn, turns
const XR = 3.9;                             // the outer end of the leaf stays here
const NS = 220;                             // samples along the leaf
const LOOK = {
  water: { name: 'Water molecule', nm: 0.28, pass: true, note: 'Gets through, by dissolving into the polymer and hopping across it.' },
  salt: { name: 'Sodium ion (with its water shell)', nm: 0.72, pass: false, note: 'Held back: 95 to 99% of dissolved salts stay behind.' },
  virus: { name: 'Virus', nm: 100, nm0: 20, nm1: 300, pass: false, note: 'Held back by an intact membrane. Leaky seals are why UV comes next.' },
  bacterium: { name: 'Bacterium', nm: 1000, nm0: 500, nm1: 5000, pass: false, note: 'Thousands of times too big. The sediment filter even catches some.' },
};

// The leaf's centre-line: an Archimedean spiral from the core outwards, arc-length sampled.
function spiralTable() {
  const pts = [], S = [0];
  const b = GAP / (Math.PI * 2), th1 = TURNS * Math.PI * 2;
  for (let i = 0; i <= 2000; i++) { const th = (i / 2000) * th1, r = R0 + 0.04 + b * th; pts.push([r * Math.cos(th), r * Math.sin(th)]); }
  for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = S[S.length - 1];
  const at = (s) => {
    s = clamp(s, 0, L); let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    const k = (s - S[lo]) / Math.max(1e-9, S[hi] - S[lo]), a = pts[lo], c = pts[hi];
    const tx = c[0] - a[0], tz = c[1] - a[1], tl = Math.hypot(tx, tz) || 1;
    return { x: a[0] + (c[0] - a[0]) * k, z: a[1] + (c[1] - a[1]) * k, tx: tx / tl, tz: tz / tl };
  };
  return { L, at };
}

// A ribbon mesh along a curve in XZ, extruded along Y; positions are rewritten when it unrolls.
function ribbon(mat) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array((NS + 1) * 2 * 3), uv = new Float32Array((NS + 1) * 2 * 2), idx = [];
  for (let i = 0; i <= NS; i++) { uv.set([i / NS, 0, i / NS, 1], i * 4); if (i < NS) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.castShadow = true;
  m.write = (pts) => { for (let i = 0; i <= NS; i++) { const [x, z] = pts[i]; pos.set([x, YC - H / 2, z, x, YC + H / 2, z], i * 6); } g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); };
  return m;
}

export default {
  id: 'membrane',
  short: 'The membrane',
  title: 'What gets through the membrane',
  subtitle: 'A sheet thinner than a soap bubble, rolled up like a carpet.',
  view: { pos: [1.7, 3.7, 7.8], target: [2.0, 2.5, 0] },
  learn: `<p>Cut open an RO cartridge and you find a <b>spiral-wound</b> element: flat envelopes of membrane rolled round a <b>perforated tube</b>, with a plastic mesh, the <b>feed spacer</b>, between the layers.</p>
    <p>The membrane is a <b>thin-film composite</b>. A strong spongy backing holds up a <b>polyamide</b> skin only about 0.1 to 0.2 micrometres thick, a few hundred times thinner than a hair. That skin does all the work.</p>
    <p>It has no real holes. Water molecules <b>dissolve</b> into the polymer and hop across; bigger, charged <b>ions</b> wrapped in their shell of water are held back. So RO removes about <b>95 to 99%</b> of dissolved salts, and viruses and bacteria, which are hundreds to thousands of times bigger, have no chance.</p>
    <p>Feed water sweeps <b>along</b> the surface, not straight into it. This <b>cross-flow</b> keeps washing the rejected salt away. Only a part of the water soaks through, then spirals inward along the <b>permeate carrier</b> to the central tube.</p>
    <p class="tip"><b>Try it:</b> unroll the element, then switch off cross-flow and watch the surface clog. Pick things to compare on the size ruler.</p>`,
  terms: [
    { t: 'Spiral-wound element', d: 'Membrane envelopes and mesh spacers rolled round a perforated tube: lots of area in a small can.' },
    { t: 'Thin-film composite', d: 'A membrane made of an ultra-thin polyamide skin on a thicker porous support.' },
    { t: 'Cross-flow', d: 'Feed water flowing along the membrane surface, sweeping away what it rejects.' },
    { t: 'Salt rejection', d: 'The share of dissolved salt the membrane holds back, usually 95 to 99%.' },
    { t: 'Fouling', d: 'A layer of dirt, scale or slime that builds up on a membrane and slows the flow.' },
  ],
  defaults: { unroll: 0.6, crossflow: true, look: 'salt' },
  controls: [
    { key: 'unroll', type: 'range', label: 'Unroll the element', min: 0, max: 1, step: 0.01, ends: ['rolled', 'opened out'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'crossflow', type: 'toggle', label: 'Cross-flow sweep', hint: 'Off: the feed pushes straight at the surface and nothing washes it clean.' },
    { key: 'look', type: 'seg', label: 'Compare on the ruler', options: [{ v: 'water', label: 'Water' }, { v: 'salt', label: 'Salt' }, { v: 'virus', label: 'Virus' }, { v: 'bacterium', label: 'Bacterium' }], fmt: (v) => (LOOK[v].pass ? 'passes' : 'held back') },
  ],
  quiz: [
    { q: 'How does water get through an RO membrane?', options: ['Through big open holes', 'It dissolves into the thin polymer skin and diffuses across', 'It is boiled across', 'It goes round the edge'], answer: 1, why: 'The polyamide has no fixed pores. Water moves through it by solution and diffusion; ions barely do.' },
    { q: 'Why does the feed water flow along the surface?', options: ['To keep washing away the salt the membrane rejects', 'To cool the membrane', 'To make it spin', 'It is just easier to build'], answer: 0, why: 'Cross-flow sweeps the rejected salts and dirt to the drain, so the membrane does not clog so quickly.' },
    { q: 'A bacterium is about 1 µm. How does that compare with a water molecule?', options: ['About the same', 'About 10 times bigger', 'About 3,500 times bigger', 'Smaller'], answer: 2, why: '1 µm is 1,000 nm, and a water molecule is about 0.28 nm across.' },
  ],
  reel: [
    { ms: 5600, caption: 'Unroll an RO cartridge: a membrane sheet with a skin a few hundred times thinner than a hair.', set: { crossflow: true, look: 'salt' }, anim: { unroll: [0, 0.75] }, view: { pos: [1.8, 3.4, 7.0], target: [1.9, 2.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const sp = spiralTable();
    const memMat = M.plastic(0xf4f1e8, { side: THREE.DoubleSide, roughness: 0.6 });
    const netTex = canvasTexture(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(63,169,255,.95)'; g.lineWidth = 3; for (let i = -h; i < w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); } });
    netTex.tex.wrapS = netTex.tex.wrapT = THREE.RepeatWrapping; netTex.tex.repeat.set(14, 3);
    const netMat = new THREE.MeshStandardMaterial({ map: netTex.tex, transparent: true, side: THREE.DoubleSide, roughness: 0.5, depthWrite: false });
    const carMat = M.matte(0x5a6270, { side: THREE.DoubleSide });
    // Layer offsets across the leaf: permeate carrier behind, membrane, feed spacer in front.
    const layers = [{ m: ribbon(carMat), off: -0.03, trim: 0 }, { m: ribbon(memMat), off: 0, trim: 0.7 }, { m: ribbon(netMat), off: 0.03, trim: 1.5 }];
    layers.forEach((l) => root.add(l.m));
    const foul = ribbon(M.ghost(C.sediment, 0)); root.add(foul);

    // The perforated core tube.
    const holes = canvasTexture(128, 256, (g, w, h) => { g.fillStyle = '#dfe3ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2e37'; for (let y = 12; y < h; y += 24) for (let x = 12; x < w; x += 32) { g.beginPath(); g.arc(x + ((y / 24) % 2) * 16, y, 5, 0, 7); g.fill(); } });
    holes.tex.wrapS = THREE.RepeatWrapping; holes.tex.repeat.set(3, 1);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, H + 0.5, 32), new THREE.MeshStandardMaterial({ map: holes.tex, roughness: 0.4 })); core.castShadow = true;
    const caps = [0, 1].map((k) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(R0 * 0.8, R0 * 0.8, 0.05, 24), M.glow(0x8ef0ff)); c.position.y = k ? (H + 0.5) / 2 + 0.01 : -(H + 0.5) / 2 - 0.01; return c; });
    const coreG = new THREE.Group(); coreG.add(core, ...caps); root.add(coreG);
    const stand = box(9.4, 0.08, 2.6, M.matte(0x3a404c)); stand.position.set(1.0, 0.3, 0); root.add(stand);

    // Particles: feed in front of the flat leaf; permeate behind it, heading for the core.
    const NF = 150, NP = 60;
    const F = dots(NF, 0.05), P = dots(NP, 0.04);
    const kindOf = (i) => (i % 5 === 0 ? 'salt' : i % 17 === 0 ? 'bacterium' : i % 13 === 0 ? 'virus' : 'water');
    const colOf = { water: C.water, salt: C.salt, virus: 0xd9e35a, bacterium: C.microbe };
    const sizeOf = { water: 0.8, salt: 1.1, virus: 1.4, bacterium: 2.6 };
    for (let i = 0; i < NF; i++) F.setColorAt(i, new THREE.Color(colOf[kindOf(i)]));
    for (let i = 0; i < NP; i++) P.setColorAt(i, new THREE.Color(C.pure));
    root.add(F, P);
    const rnd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };

    const lab = {
      core: stage.label('Perforated tube: clean water out', [0, YC + H / 2 + 0.55, 0], root),
      feed: stage.label('Feed spacer + feed water', [0, 0, 0], root),
      mem: stage.label('Membrane', [0, 0, 0], root, 'hot'),
      perm: stage.label('Permeate carrier', [0, 0, 0], root),
    };
    const arrUp = stage.label('↑ feed sweeps along, out as reject', [0, 0, 0], root, 'hot');

    // Size ruler, log scale from 0.1 nm to 100 µm.
    let look = 'salt';
    const RX0 = 40, RX1 = 980, lx = (nm) => RX0 + ((Math.log10(nm) + 1) / 6) * (RX1 - RX0);
    const ruler = canvasTexture(1024, 360, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 26px sans-serif'; g.fillText('How big is it? (each step is 10× bigger)', 24, 40);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(RX0, 300); g.lineTo(RX1, 300); g.stroke();
      g.font = '18px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)';
      [[0.1, '0.1 nm'], [1, '1 nm'], [10, '10 nm'], [100, '100 nm'], [1000, '1 µm'], [10000, '10 µm'], [100000, '100 µm']].forEach(([v, t]) => { g.fillRect(lx(v) - 1, 292, 2, 16); g.fillText(t, lx(v) - 22, 332); });
      const band = (a, b, y, color, text) => { g.fillStyle = color; g.fillRect(lx(a), y, Math.max(6, lx(b) - lx(a)), 26); g.fillStyle = '#e8eef8'; g.font = '17px sans-serif'; g.fillText(text, Math.min(lx(a), w - 250), y - 6); };
      band(0.1, 0.5, 250, 'rgba(255,255,255,.5)', 'RO gaps');
      band(10, 20, 250, 'rgba(142,240,255,.6)', 'UF pores');
      band(5000, 5200, 250, 'rgba(160,122,76,.9)', 'sediment filter');
      band(60000, 90000, 250, 'rgba(200,200,200,.4)', 'a hair');
      const items = [['water', 0.28, 0.28, '#4fc3ff'], ['salt', 0.66, 0.72, '#ff9f43'], ['virus', 20, 300, '#d9e35a'], ['bacterium', 500, 5000, '#5ce1a9']];
      items.forEach(([k, a, b, c], j) => {
        const on = k === look, y = 90 + j * 38;
        g.globalAlpha = on ? 1 : 0.45; g.fillStyle = c; g.fillRect(lx(a) - 4, y, Math.max(8, lx(b) - lx(a) + 8), 22);
        g.font = (on ? 'bold ' : '') + '18px sans-serif'; g.fillText(LOOK[k].name.replace(' (with its water shell)', ''), lx(b) + 14, y + 17); g.globalAlpha = 1;
      });
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.41), new THREE.MeshBasicMaterial({ map: ruler.tex, transparent: true, toneMapped: false }));
    board.position.set(4.3, 4.1, -1.0); board.rotation.y = -0.2; root.add(board);

    const tmp = [];
    for (let i = 0; i <= NS; i++) tmp.push([0, 0]);
    let k = -1, xs = XR, fouling = 0, t = 0, shownLook = '', ang = 0;
    const base = [], nrm = [];
    for (let i = 0; i <= NS; i++) { base.push([0, 0]); nrm.push([0, 0]); }
    const layout = (unroll) => {
      // Arc length still rolled up; the rest lies flat along +X, ending at XR.
      const Lmax = Math.min(sp.L * 0.78, 5.6), flat = unroll * Lmax, sc = sp.L - flat;
      const c = sp.at(sc);
      // Rotate the spiral so its tangent at sc points along +X, then shift it to meet the flat part.
      ang = Math.atan2(c.tz, c.tx);
      const ca = Math.cos(-ang), sa = Math.sin(-ang);
      const rot = (x, z) => [x * ca - z * sa, x * sa + z * ca];
      const [cx, cz] = rot(c.x, c.z);
      xs = XR - flat;
      const ox = xs - cx, oz = -cz;
      for (let i = 0; i <= NS; i++) {
        const s = (i / NS) * sp.L;
        if (s <= sc) { const q = sp.at(s), [x, z] = rot(q.x, q.z), [tx, tz] = rot(q.tx, q.tz); base[i] = [x + ox, z + oz]; nrm[i] = [-tz, tx]; }
        else { base[i] = [xs + (s - sc), 0]; nrm[i] = [0, 1]; }
      }
      coreG.position.set(ox, YC, oz); coreG.rotation.y = ang;
      for (const l of layers) {
        // Stagger the outer ends (only once opened out) so each layer shows.
        const sMax = sp.L - Math.min(l.trim, flat * 0.4);
        for (let i = 0; i <= NS; i++) { const j = Math.min(i, Math.floor((sMax / sp.L) * NS)); tmp[i] = [base[j][0] + nrm[j][0] * l.off, base[j][1] + nrm[j][1] * l.off]; }
        l.m.write(tmp);
      }
      for (let i = 0; i <= NS; i++) tmp[i] = [base[i][0] + nrm[i][0] * 0.05, base[i][1] + nrm[i][1] * 0.05];
      foul.write(tmp);
      // Which side is the front? Flip layer order so the spacer faces the camera on the flat part.
      lab.core.position.set(ox, YC + H / 2 + 0.55, oz);
      const fx = (xs + XR) / 2;
      lab.feed.position.set(Math.max(xs + 0.6, fx + 0.6), YC - H / 2 - 0.25, 0.3);
      lab.mem.position.set(Math.max(xs + 0.4, fx - 0.6), YC - H / 2 - 0.55, 0.2);
      lab.perm.position.set(Math.max(xs + 0.3, fx), YC + H / 2 + 0.25, -0.2);
      arrUp.position.set(XR - 0.2, YC + H / 2 + 0.6, 0.3);
    };

    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage); t += dt;
        if (Math.abs(s.unroll - k) > 1e-4) { k = s.unroll; layout(k); }
        const flatLen = XR - xs, open = flatLen > 0.6;
        const narrow = stage.host.clientWidth < 560;
        lab.feed.visible = lab.mem.visible = lab.perm.visible = open && !narrow;
        arrUp.visible = open && !narrow;
        fouling = clamp(fouling + dt * (s.crossflow ? -0.35 * fouling - 0.02 : 0.09), 0, 1);
        foul.material.opacity = 0.75 * fouling;
        const flux = 1 / (1 + 2.5 * fouling);                   // relative permeate flow
        const v = s.crossflow ? 0.55 : 0.04;
        F.visible = P.visible = open;
        if (open) {
          for (let i = 0; i < NF; i++) {
            const kind = kindOf(i), x = xs + 0.15 + rnd(i, 1) * (flatLen - 0.3);
            let y = YC - H / 2 + ((rnd(i, 2) + t * v * (0.8 + 0.4 * rnd(i, 3))) % 1) * H;
            let z = 0.1 + rnd(i, 4) * 0.12;
            if (!s.crossflow && kind !== 'water') z = 0.075 + 0.03 * rnd(i, 5);  // stuck on the surface
            if (!s.crossflow && kind !== 'water' && rnd(i, 6) > fouling) y = -10;
            F.put(i, x, y, z, y < 0 ? 0 : sizeOf[kind]);
          }
          F.done();
          for (let i = 0; i < NP; i++) {
            const u = (rnd(i, 7) + t * 0.25 * flux) % 1;             // 0 at the far end, 1 at the core
            const x = XR - 0.1 - u * (flatLen - 0.1);
            P.put(i, x, YC - H / 2 + 0.15 + rnd(i, 8) * (H - 0.3), -0.07, u < 0.98 ? 1 : 0);
          }
          P.done();
        }
        caps.forEach((c) => { c.material.color.setHSL(0.5, 0.9, 0.55 + 0.2 * Math.sin(t * 4) * flux); });
        if (s.look !== shownLook) { shownLook = s.look; look = s.look; ruler.redraw(); }
      },
      readout: (s) => {
        const L = LOOK[s.look];
        const size = L.nm0 ? `${L.nm0 >= 1000 ? L.nm0 / 1000 + '–' + L.nm1 / 1000 + ' µm' : L.nm0 + '–' + L.nm1 + ' nm'}` : L.nm + ' nm';
        const vsWater = L.nm / 0.28;
        return `<div class="big">${L.name.replace(' (with its water shell)', '')}: ${L.pass ? 'passes' : 'held back'}</div>
          <div class="row"><span>Size</span><b>${size}</b></div>
          <div class="row"><span>Compared with a water molecule</span><b>${vsWater < 1.5 ? 'the same' : Math.round(vsWater).toLocaleString('en-IN') + '× bigger'}</b></div>
          <div class="row"><span>Flow through the membrane</span><b>${Math.round(100 / (1 + 2.5 * fouling))}%</b></div>
          <small>${L.note}</small>`;
      },
    };
  },
};
