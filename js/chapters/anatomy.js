// Chapter 1: take a wall-mounted home RO purifier apart. Water and impurities flow
// through the stages: sediment → carbon → pump → RO membrane → post-carbon → UV → UF
// → mineral/TDS controller → tank → tap, with the reject line to the drain.
import { THREE, M, box, rod, exploder, clamp } from '../kit.js';
import { C, pathOf, dots, cartridge, bowl, pump, solenoid, uvChamber, tank, tap, pipe, PUMP_BAR, elementFlow, tdsChain, fitNarrow } from '../ro.js';

const V = (x, y, z = 0.1) => new THREE.Vector3(x, y, z);
const Y = { pre: 1.2, uv: 2.3, uf: 1.75, mem: 2.85 };    // rows inside the case
const FEED_TDS = 800, REC = 0.3, REJ = 0.95;           // a typical borewell feed, a typical home unit
const N = 260;

// Build the feed path and both exits, and note where each stage sits (fraction along the route).
function routes() {
  const feed = [V(-3.0, 2.2, 0), V(-2.3, 2.2, 0), V(-2.3, 1.15, 0), V(-2.15, 1.15, 0), V(-2.15, 2.2, 0)];
  const m = {};
  const mark = (k, arr) => { m[k] = arr.length - 1; };
  mark('sed', feed);
  feed.push(V(-1.85, 2.2, 0), V(-1.85, Y.pre), V(-1.3, Y.pre), V(0.0, Y.pre)); mark('carbon', feed);
  feed.push(V(0.35, Y.pre), V(0.55, Y.pre)); mark('sv', feed);
  feed.push(V(1.05, Y.pre), V(1.3, Y.pre)); mark('pump', feed);
  feed.push(V(1.38, Y.pre, -0.35), V(1.38, Y.mem, -0.35), V(1.25, Y.mem), V(-1.25, Y.mem)); mark('mem', feed);
  const perm = [V(-1.25, Y.mem), V(-1.45, Y.mem, 0.1), V(-1.45, Y.uv), V(-1.3, Y.uv), V(-0.35, Y.uv)];
  const pm = { pc: perm.length - 1 };
  perm.push(V(-0.2, Y.uv), V(0.8, Y.uv)); pm.uv = perm.length - 1;
  perm.push(V(1.15, Y.uv), V(1.15, Y.uf), V(1.0, Y.uf), V(0.05, Y.uf)); pm.uf = perm.length - 1;
  perm.push(V(-0.6, Y.uf)); pm.min = perm.length - 1;
  perm.push(V(-0.8, Y.uf, -0.4), V(-0.8, 3.45, -0.4), V(-0.8, 3.6, -0.1)); pm.tank = perm.length - 1;
  perm.push(V(0.35, 3.45, -0.35), V(0.35, 3.2, -0.45), V(0.35, 0.75, -0.45), V(0.35, 0.75, 0.55)); pm.tap = perm.length - 1;
  const rej = [V(-1.25, Y.mem), V(-1.4, Y.mem, -0.25), V(-1.52, 2.55, -0.25), V(-1.52, 1.9, -0.25), V(-1.52, 0.3, -0.25), V(-1.52, -0.55, -0.25)];
  const P = pathOf([...feed, ...perm.slice(1)]), R = pathOf([...feed, ...rej.slice(1)]);
  const fP = {}, fR = {};
  for (const k in m) { fP[k] = P.lengths[m[k]] / P.total; fR[k] = R.lengths[m[k]] / R.total; }
  for (const k in pm) fP[k] = P.lengths[feed.length - 1 + pm[k]] / P.total;
  return { P, R, fP, fR, feed, perm, rej };
}

export default {
  id: 'anatomy',
  short: 'Inside a purifier',
  title: 'Inside an RO water purifier',
  subtitle: 'Eight stages on the wall, one tiny membrane doing the hard part.',
  view: { pos: [1.5, 3.6, 7.4], target: [-1.25, 2.8, 0] },
  learn: `<p>An RO purifier is a row of filters, each catching something different, joined by thin plastic pipes. Follow the water from the wall:</p>
    <p>A <b>sediment pre-filter</b> traps sand and rust. An <b>activated carbon</b> filter soaks up chlorine and smells, which would otherwise damage the membrane. A <b>booster pump</b> then squeezes the water to about <b>5 bar</b>, five times the push of the air around you.</p>
    <p>The star is the <b>RO membrane</b>, a sheet wrapped round a tube. Only water squeezes through it. Dissolved salts, most germs and metals stay behind and are washed away down the <b>reject line</b>, together with most of the water. The clean <b>permeate</b> then passes a <b>post-carbon</b> polish, a <b>UV lamp</b> and a <b>UF</b> filter to kill or catch any germs, and a <b>mineral cartridge</b>, before it waits in the <b>storage tank</b> for the tap.</p>
    <p>A <b>solenoid valve</b> shuts the inlet when the pump stops, and a <b>float switch</b> in the tank turns everything off when it is full.</p>
    <p class="tip"><b>Try it:</b> switch on X-ray and follow the coloured dots. Brown is dirt, yellow is chlorine, orange is dissolved salt and green is germs. Where does each one leave?</p>`,
  terms: [
    { t: 'RO', d: 'Reverse osmosis: pushing water through a membrane so hard that it leaves the dissolved salts behind.' },
    { t: 'Permeate', d: 'The purified water that has passed through the membrane.' },
    { t: 'Reject', d: 'The salty water that carries away what the membrane held back. Also called concentrate or brine.' },
    { t: 'Activated carbon', d: 'Charcoal full of tiny pores that grabs chlorine, smells and some chemicals onto its huge surface.' },
    { t: 'Solenoid valve', d: 'An electric tap that opens the inlet only while the pump runs.' },
  ],
  defaults: { explode: 0, xray: true, running: true, tapOpen: false },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray casing' },
    { key: 'running', type: 'toggle', label: 'Switched on' },
    { key: 'tapOpen', type: 'toggle', label: 'Tap open', hint: 'Let the tank fill up: the float switch stops the pump when it is full.' },
  ],
  quiz: [
    { q: 'Why does the carbon filter come before the RO membrane?', options: ['To add minerals', 'Chlorine would damage the thin membrane', 'To heat the water', 'To slow the water down'], answer: 1, why: 'Most home RO membranes are polyamide, which chlorine attacks. The carbon removes it first.' },
    { q: 'What does the booster pump do?', options: ['Pushes water hard against the membrane', 'Sucks air out of the tank', 'Spins the UV lamp', 'Adds salt'], answer: 0, why: 'City and borewell water is too weak to force water through the membrane, so the pump raises it to about 5 bar.' },
    { q: 'Where do the salts go?', options: ['They stay stuck in the membrane forever', 'Into the storage tank', 'Down the reject line with the extra water', 'They evaporate'], answer: 2, why: 'The membrane holds them back and the flowing reject water carries them to the drain.' },
  ],
  reel: [
    { ms: 5400, caption: 'A home RO purifier is a row of filters, a pump and one very fine membrane.', set: { xray: false, running: true, tapOpen: true }, anim: { explode: [0, 0.85] }, view: { pos: [1.6, 3.6, 9.8], target: [-0.3, 2.8, 0] }, spin: 0.45 },
    { ms: 5600, caption: 'Only water squeezes through the membrane. Salt and germs go down the drain.', set: { explode: 0, xray: true, running: true, tapOpen: true }, view: { pos: [2.6, 3.6, 8.0], target: [-0.4, 2.4, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const unit = new THREE.Group(); unit.position.y = 0.6; root.add(unit);
    const wall = box(7.4, 6.2, 0.1, M.matte(0x2a3140, { transparent: true, opacity: 0.6 })); wall.position.set(-0.4, 3.1, -0.8); wall.castShadow = false; root.add(wall);
    const counter = box(4.2, 0.12, 1.8, M.matte(0x5a5f6a)); counter.position.set(0.2, 0.06, 0.2); root.add(counter);

    // Casing: back plate, see-through shell and front cover.
    const shellMat = M.plastic(0xf2f4f7, { transparent: true, opacity: 1, roughness: 0.35, side: THREE.DoubleSide });
    const shell = box(3.3, 4.35, 1.3, shellMat); shell.position.set(0, 2.75, -0.05);
    shell.add(new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry), new THREE.LineBasicMaterial({ color: 0x9aa6b8, transparent: true, opacity: 0.6 })));
    const frontMat = M.plastic(0x1d2330, { transparent: true, opacity: 1, roughness: 0.25 });
    const front = box(3.1, 1.9, 0.05, frontMat); front.position.set(0, 3.9, 0.64);
    const panel = box(0.9, 0.35, 0.02, M.glow(0x2a6fb8)); panel.position.set(0.8, 3.3, 0.68);
    unit.add(shell, front, panel);
    const setXray = (on) => { for (const [m, o] of [[shellMat, 0.08], [frontMat, 0.12]]) { m.opacity = on ? o : 1; m.depthWrite = !on; } shell.castShadow = !on; };

    // Parts, positioned along the routes.
    const sed = bowl(1.05, 0.26); sed.position.set(-2.22, 1.62, 0);
    const pre = cartridge(-1.25, 0.0, 0.16, 0x2b2f38, { band: 0x3fa9ff });
    const sv = solenoid(); sv.position.set(0.35, Y.pre, 0.1);
    const pmp = pump(); pmp.position.set(0.95, Y.pre, 0.1);
    const mem = cartridge(-1.2, 1.2, 0.24, 0xf4f6fa, { band: 0x2f86d6 });
    const post = cartridge(-1.3, -0.35, 0.14, 0x2b2f38, { band: 0x5ce1a9 });
    const uv = uvChamber(-0.15, 0.75, 0.16);
    const uf = cartridge(0.05, 1.0, 0.15, 0xdfe8f5, { band: 0x8ef0ff });
    const mineral = cartridge(-0.6, 0.0, 0.14, 0xe9dcc3, { band: 0xffb547 });
    const tdsKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16), M.plastic(0x3fa9ff)); tdsKnob.rotation.x = Math.PI / 2; tdsKnob.position.set(-0.3, Y.uf + 0.22, 0.25);
    const restrictor = rod(-0.12, 0.12, 0.05, 0.05, M.plastic(0xffb547), 12); restrictor.rotation.z = Math.PI / 2; restrictor.position.set(-1.52, 2.2, -0.25);
    const tk = tank(2.9, 1.3, 1.0); tk.position.set(0, 4.1, -0.1);
    const tp = tap(); tp.position.set(0.35, 0.72, 0.62);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.5, 24, 1, true), M.clear(0xdfeaff, 0.25)); glass.position.set(0.35, 0.37, 1.0); root.add(glass);
    const glassWater = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 1, 24), M.clear(0x3f9dff, 0.5)); glassWater.position.set(0.35, 0.12, 1.0); root.add(glassWater);
    const drain = rod(-0.1, 0.1, 0.09, 0.09, M.plastic(0x5a5f6a), 16); drain.rotation.z = Math.PI / 2; drain.position.set(-1.52, 0.02, -0.25); root.add(drain);
    [pre, mem, post, uf, mineral].forEach((c) => { c.position.z = 0.1; });
    pre.position.y = Y.pre; mem.position.y = Y.mem; post.position.y = Y.uv; uv.position.set(0, Y.uv, 0.1); uf.position.y = Y.uf; mineral.position.y = Y.uf;
    unit.add(sed, pre, sv, pmp, mem, post, uv, uf, mineral, tdsKnob, restrictor, tk, tp);

    // Pipes and the particles in them, in the unit's frame.
    const { P, R, fP, fR, feed, perm, rej } = routes();
    unit.add(pipe(feed), pipe(perm), pipe(rej, 0.035, 0xffd9b0, 0.5));
    // The TDS controller's bypass: a thin line from after the carbon to the mineral stage.
    unit.add(pipe([V(0.05, Y.pre, -0.25), V(0.05, 1.5, -0.25), V(-0.3, 1.5, -0.25), V(-0.3, Y.uf, -0.1)], 0.022, 0x8ef0ff, 0.45));

    // Each dot has a kind and a route. Water: 30% permeate (recovery), 70% reject.
    // Sediment stops in the pre-filter, chlorine in the carbon, salts go to reject (5% get through,
    // 95% rejection), germs go to reject except a few that the UV lamp inactivates and UF catches.
    const kinds = [];
    for (let i = 0; i < N; i++) {
      const r = (i * 0.6180339) % 1, q = (i * 0.7548776) % 1;
      let kind = 'water';
      if (r < 0.1) kind = 'sediment'; else if (r < 0.18) kind = 'chlorine'; else if (r < 0.36) kind = 'salt'; else if (r < 0.43) kind = 'microbe';
      const permRoute = kind === 'water' ? q < REC : kind === 'salt' ? q < 0.1 : kind === 'microbe' ? q < 0.15 : q < 0.5;
      kinds.push({ kind, route: permRoute ? 'P' : 'R', u: (i / N) });
    }
    const ds = dots(N, 0.05); unit.add(ds);
    const col = new THREE.Color(), p = new THREE.Vector3();

    const setExplode = exploder([
      { obj: shell, off: [0, 0, -1.6] }, { obj: front, off: [0, 0.6, 2.2] }, { obj: panel, off: [0, 0.6, 2.2] },
      { obj: tk, off: [0, 1.6, 0] }, { obj: mem, off: [0, 0.3, 1.8] }, { obj: post, off: [0, 0, 1.4] }, { obj: uv, off: [0, 0, 2.0] },
      { obj: uf, off: [0.3, 0, 2.2] }, { obj: mineral, off: [-0.3, 0, 1.9] }, { obj: pre, off: [0, -0.2, 1.6] }, { obj: pmp, off: [0.5, -0.2, 2.0] },
      { obj: sv, off: [0, -0.2, 1.2] }, { obj: sed, off: [-0.9, 0, 0.6] },
    ]);

    const minor = [];
    const L = (t, obj, pos, cls, main) => { const l = stage.label(t, pos, obj, cls); if (!main) minor.push(l); return l; };
    L('1 Sediment pre-filter', sed, [-0.2, -0.85, 0.3], '', true);
    L('2 Carbon', pre, [-0.62, -0.3, 0.2]);
    L('Solenoid valve', sv, [0, -0.3, 0.2]);
    L('3 Booster pump', pmp, [0.1, -0.42, 0.2], '', true);
    L('4 RO membrane', mem, [0, 0.4, 0.2], 'hot');
    L('5 Post-carbon', post, [-0.8, 0.28, 0.15]);
    L('6 UV lamp', uv, [0.3, 0.3, 0.15]);
    L('7 UF', uf, [0.55, -0.28, 0.15]);
    L('8 Mineral + TDS controller', mineral, [-0.35, -0.3, 0.15]);
    L('9 Storage tank', tk, [-0.6, 0.45, 0.5]);
    L('Float switch', tk.float, [-0.5, 0.2, 0]);
    L('Tap', tp, [0.45, 0, 0.3]);
    L('Reject to drain', root, [-2.05, 0.45, -0.25], 'hot', true);
    L('Flow restrictor', restrictor, [0.3, 0.8, 0]);

    let level = 0.55, run = 1, pumpOn = true, t = 0, glassK = 0.2;
    const api = {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage);
        t += dt;
        setExplode(s.explode); setXray(s.xray); uv.setXray(s.xray);
        minor.forEach((l) => { l.visible = stage.host.clientWidth >= 620; });
        // The float switch: stop at 95% full, start again below 80%.
        if (!s.running) pumpOn = false; else if (level >= 0.95) pumpOn = false; else if (level < 0.8) pumpOn = true;
        run = clamp(run + ((pumpOn ? 1 : 0) - run) * Math.min(1, dt * 3), 0, 1);
        level = clamp(level + dt * (0.03 * run - (s.tapOpen ? 0.045 : 0)), 0.05, 1);
        tk.setLevel(level);
        glassK = s.tapOpen ? Math.min(0.95, glassK + dt * 0.08) : glassK;
        if (glassK >= 0.95) glassK = 0.1;
        glassWater.scale.y = 0.46 * glassK; glassWater.position.y = 0.14 + 0.23 * glassK;
        uv.lamp.material.color.setHex(run > 0.1 || s.tapOpen ? 0xb58cff : 0x3a3450);
        pmp.position.x = 0.95 + Math.sin(t * 90) * 0.006 * run;
        const show = s.explode < 0.05;
        ds.visible = show;
        if (!show) return;
        for (let i = 0; i < N; i++) {
          const d = kinds[i], path = d.route === 'P' ? P : R, f = d.route === 'P' ? fP : fR;
          d.u += (dt * 0.9 * run) / path.total;
          if (d.u > 1) d.u -= 1;
          const u = d.u;
          let vis = true, c = C[d.kind];
          if (d.kind === 'sediment' && u > f.sed) vis = false;
          if (d.kind === 'chlorine' && u > f.carbon) vis = false;
          if (d.kind === 'microbe' && d.route === 'P') { if (u > fP.uv) c = C.dead; if (u > fP.uf) vis = false; }
          if (d.kind === 'water' && d.route === 'R' && u > f.mem) c = C.reject;
          path.at(u, p);
          const j = ((i * 7919) % 13) / 13 - 0.5;
          ds.put(i, p.x + j * 0.04, p.y + j * 0.05, p.z, vis ? (d.kind === 'water' ? 0.8 : 1.1) : 0);
          ds.setColorAt(i, col.setHex(c));
        }
        ds.done();
      },
      readout: (s) => {
        const q = elementFlow(PUMP_BAR, FEED_TDS, REC), td = tdsChain(FEED_TDS, REJ, 0);
        if (!s.running) return '<div class="big">Switched off</div>The solenoid valve has closed the inlet.';
        if (!pumpOn) return `<div class="big">Tank full</div>The float switch has stopped the pump. Open the tap to use some water.`;
        return `<div class="big">${FEED_TDS} → ${Math.round(td.perm)} ppm</div>
          <div class="row"><span>Pump pressure</span><b>${PUMP_BAR} bar (${Math.round(PUMP_BAR * 14.5)} psi)</b></div>
          <div class="row"><span>Pure water made</span><b>about ${Math.round(q)} L per hour</b></div>
          <div class="row"><span>Water to the drain</span><b>${((1 - REC) / REC).toFixed(1)} L per litre made</b></div>
          <small>A 75-gallon-a-day membrane, 800 ppm borewell water, 30% recovery, 95% salt rejection.</small>`;
      },
    };
    return api;
  },
};
