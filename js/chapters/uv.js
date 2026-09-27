// Chapter 6: UV and UF, the germ stages. UV-C at 254 nm damages DNA; the dose (mJ/cm²) sets
// how many logs of each germ are inactivated (uvDose and logKill in ro.js, from the US EPA UV
// Disinfection Guidance Manual 2006 and Chevrefils et al. 2006). UF hollow fibres with pores of
// about 0.01 µm hold back bacteria, cysts and most viruses, but let dissolved salts through.
import { THREE, M, box, rod, canvasTexture, approach, clamp } from '../kit.js';
import { C, dots, pathOf, uvChamber, uvDose, logKill, pctKilled, fmtPct, lampOutput, DESIGN_DOSE, RATED_LPM, pipe, fitNarrow } from '../ro.js';

const Y = 2.0, CX0 = -3.3, CX1 = 0.1, UX0 = 1.1, UX1 = 3.3;
const N = 160;
const GERMS = {
  ecoli: { name: 'E. coli (bacterium)', color: C.microbe, size: 1.5, uf: true },
  crypto: { name: 'Cryptosporidium (cyst)', color: 0x7aa2ff, size: 1.9, uf: true },
  virus: { name: 'Virus (adenovirus, the toughest)', color: 0xd9e35a, size: 0.9, uf: true },
};
const kindOf = (i) => (i % 4 === 0 ? 'ecoli' : i % 4 === 1 ? 'crypto' : i % 4 === 2 ? 'virus' : i % 8 === 3 ? 'salt' : 'water');

export default {
  id: 'uv',
  short: 'UV and UF',
  title: 'UV light and UF fibres',
  subtitle: 'One scrambles germs’ DNA, the other strains them out. Neither touches salt.',
  view: { pos: [0.3, 3.7, 9.4], target: [0.2, 2.1, 0] },
  learn: `<p>RO already holds back germs, but seals can leak and water can sit in the tank. So most purifiers add a germ-killing stage or two.</p>
    <p>A <b>UV lamp</b> glows with <b>UV-C</b> light at <b>254 nanometres</b>, the colour DNA absorbs best. It scrambles the germs' genes so they cannot multiply. What matters is the <b>dose</b>: brightness × time, in mJ/cm². Good home units give at least <b>40 mJ/cm²</b> at their rated flow. Run water faster, or let the lamp age, and the dose falls.</p>
    <p><b>UF</b> (ultrafiltration) uses bundles of hollow <b>fibres</b> with pores about <b>0.01 µm</b> across. Bacteria and cysts are far too big to get in; most viruses are held back too. Dissolved salts slip straight through, and UF works without electricity.</p>
    <p>So which do you need? If your water is <b>city water with low TDS</b>, under about 300 ppm, <b>UV and UF</b> are enough and waste no water. If it is salty borewell water, only <b>RO</b> removes the dissolved salts.</p>
    <p class="tip"><b>Try it:</b> open the tap wide and let the lamp get old. Which germ survives first?</p>`,
  terms: [
    { t: 'UV-C', d: 'Short-wave ultraviolet light, around 254 nm, that damages the DNA and RNA of germs.' },
    { t: 'UV dose', d: 'Light intensity × time, in millijoules per square centimetre (mJ/cm²).' },
    { t: 'Log reduction', d: 'Each "log" kills 90%: 1-log = 90%, 2-log = 99%, 4-log = 99.99%.' },
    { t: 'Ultrafiltration (UF)', d: 'Filtering through pores about 0.01 µm wide: it catches germs but not dissolved salts.' },
    { t: 'Cyst', d: 'A tough, shelled stage of a parasite like Cryptosporidium or Giardia that shrugs off chlorine.' },
  ],
  defaults: { flow: 2, age: 0, germ: 'ecoli', ufOn: true },
  controls: [
    { key: 'flow', type: 'range', label: 'Water flow', min: 0.5, max: 6, step: 0.1, ends: ['trickle', 'tap wide open'], fmt: (v) => v.toFixed(1) + ' L/min' },
    { key: 'age', type: 'range', label: 'Lamp age', min: 0, max: 24, step: 1, ends: ['new', '2 years'], fmt: (v) => Math.round(v) + ' months' },
    { key: 'germ', type: 'seg', label: 'Watch', options: [{ v: 'ecoli', label: 'E. coli' }, { v: 'crypto', label: 'Cysts' }, { v: 'virus', label: 'Virus' }] },
    { key: 'ufOn', type: 'toggle', label: 'UF cartridge fitted' },
  ],
  quiz: [
    { q: 'What does UV light do to germs?', options: ['Filters them out', 'Damages their DNA so they cannot multiply', 'Boils them', 'Removes their salt'], answer: 1, why: 'UV-C at 254 nm is absorbed by DNA and RNA and scrambles them. The germs stay in the water but are harmless.' },
    { q: 'If you double the flow through a UV chamber, what happens to the dose?', options: ['It doubles', 'It halves', 'It stays the same', 'It becomes zero'], answer: 1, why: 'Each drop spends half as long near the lamp, so it gets half the dose.' },
    { q: 'Your city water is 150 ppm TDS. What do you need?', options: ['RO, always', 'UV and/or UF is usually enough', 'Nothing can clean it', 'Just a sediment filter'], answer: 1, why: 'The TDS is already low, so the job is killing or catching germs, and UV and UF waste no water.' },
  ],
  reel: [
    { ms: 5400, caption: 'A UV lamp at 254 nm scrambles germs’ DNA. Faster flow means a smaller dose.', set: { age: 6, germ: 'virus', ufOn: true }, anim: { flow: [1, 6] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const floor = box(9.6, 0.08, 2.6, M.matte(0x3a404c)); floor.position.set(0, -0.04, 0); root.add(floor);
    const uv = uvChamber(CX0, CX1, 0.45); uv.position.y = Y; uv.setXray(true); root.add(uv);
    const glow = rod(CX0, CX1, 0.44, 0.44, M.ghost(0xb58cff, 0.12), 32); glow.position.y = Y; root.add(glow);
    // UF: a clear housing with a bundle of hollow fibres along X.
    const uf = new THREE.Group(); uf.position.y = Y; root.add(uf);
    uf.add(rod(UX0, UX1, 0.42, 0.42, M.clear(0xdfeaff, 0.18), 32, true));
    const fib = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, UX1 - UX0 - 0.2, 8, 1), M.plastic(0xf2f4f7, { roughness: 0.7 }), 37);
    const o = new THREE.Object3D(); let fi = 0;
    for (let r = 0; r < 4 && fi < 37; r++) { const n = r === 0 ? 1 : r * 6; for (let k = 0; k < n && fi < 37; k++) { const a = (k / n) * Math.PI * 2; o.position.set((UX0 + UX1) / 2, Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1); o.rotation.set(0, 0, Math.PI / 2); o.updateMatrix(); fib.setMatrixAt(fi++, o.matrix); } }
    fib.count = fi; uf.add(fib);
    for (const x of [UX0, UX1]) { const c = rod(x - 0.06, x + 0.06, 0.44, 0.44, M.plastic(0x2a2e37), 32); uf.add(c); }
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 1.1, 32, 1, true), M.clear(0xdfeaff, 0.25)); glass.position.set(4.25, 0.55, 0); root.add(glass);
    const gw = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.8, 32), M.clear(0x3f9dff, 0.35, { depthWrite: false })); gw.position.set(4.25, 0.42, 0); root.add(gw);
    const bypass = pipe([[CX1 + 0.1, Y, 0], [UX0 - 0.1, Y, 0]], 0.07);
    root.add(pipe([[-4.6, Y, 0], [CX0 - 0.1, Y, 0]], 0.07), bypass, pipe([[UX1 + 0.1, Y, 0], [4.25, Y, 0], [4.25, 1.2, 0]], 0.07));

    const path = pathOf([[-4.6, Y, 0], [4.25, Y, 0], [4.25, 0.5, 0]]);
    const xAt = (x) => (x + 4.6) / path.total;       // fraction along the path at a given x (the first leg is straight)
    const D = dots(N, 0.05); root.add(D);
    const q = Float32Array.from({ length: N }, (_, i) => (i * 0.6180339) % 1);
    const u = Float32Array.from({ length: N }, (_, i) => (i * 0.7548776) % 1);
    const p = new THREE.Vector3(), col = new THREE.Color();

    const lab = {
      uv: stage.label('UV-C lamp, 254 nm', [(CX0 + CX1) / 2, Y + 0.8, 0], root, 'hot'),
      uf: stage.label('UF hollow fibres, 0.01 µm pores', [(UX0 + UX1) / 2, Y + 0.8, 0], root),
      in: stage.label('In', [-4.3, Y + 0.35, 0], root),
      out: stage.label('Out', [4.25, 1.55, 0.3], root),
    };

    // Log reduction bars for the three germs, with the 4-log (99.99%) line.
    let cur = { dose: 40 };
    const X0 = 250, X1 = 960, bx = (l) => X0 + (clamp(l, 0, 6) / 6) * (X1 - X0);
    const chart = canvasTexture(1024, 330, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 28px sans-serif'; g.fillText(`UV dose ${cur.dose.toFixed(0)} mJ/cm²: how many logs killed`, 22, 40);
      g.font = '19px sans-serif';
      for (let l = 0; l <= 6; l++) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(bx(l), 60, 1, 220); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText(l === 6 ? '6+' : String(l), bx(l) - 6, 305); }
      g.strokeStyle = '#ffffff'; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(bx(4), 60); g.lineTo(bx(4), 280); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#fff'; g.fillText('99.99%', bx(4) + 6, 78);
      Object.entries(GERMS).forEach(([k, G], j) => {
        const l = logKill(k, cur.dose), y = 100 + j * 62;
        g.fillStyle = '#' + new THREE.Color(G.color).getHexString(); g.fillRect(X0, y, Math.max(3, bx(l) - X0), 40);
        g.fillStyle = '#e8eef8'; g.font = (k === cur.germ ? 'bold ' : '') + '21px sans-serif'; g.fillText(G.name.split(' (')[0], 20, y + 28);
      });
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.48), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(-0.4, 0.78, 0.9); root.add(board);

    let t = 0, key = '';
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage); t += dt;
        const dose = uvDose(s.flow, s.age), out = lampOutput(s.age);
        uv.lamp.material.color.setHSL(0.74, 0.8, 0.35 + 0.35 * out);
        glow.material.opacity = 0.05 + 0.12 * out;
        uf.visible = s.ufOn; lab.uf.visible = s.ufOn; bypass.visible = true;
        const kill = { ecoli: pctKilled(logKill('ecoli', dose)) / 100, crypto: pctKilled(logKill('crypto', dose)) / 100, virus: pctKilled(logKill('virus', dose)) / 100 };
        const speed = 0.25 + 0.2 * s.flow;
        const c0 = xAt(CX0), c1 = xAt(CX1), f0 = xAt(UX0), f1 = xAt(UX1);
        for (let i = 0; i < N; i++) {
          u[i] = (u[i] + (dt * speed) / path.total) % 1;
          const kind = kindOf(i), g = GERMS[kind], k = u[i];
          path.at(k, p);
          let size = 1, hex = kind === 'salt' ? C.salt : C.water;
          // Swirl round the lamp inside the chamber.
          const inC = k > c0 && k < c1, a = q[i] * 6.283 + p.x * 1.3, rr = 0.2 + 0.18 * ((i * 7) % 5) / 5;
          if (inC) { p.y = Y + Math.cos(a) * rr; p.z = Math.sin(a) * rr; }
          else { p.y += Math.cos(a) * 0.04; p.z = Math.sin(a) * 0.04; }
          if (g) {
            size = g.size; hex = g.color;
            // This germ is inactivated partway along the chamber if it falls in the killed share.
            const dies = q[i] < kill[kind];
            if (dies && k > c0 + (c1 - c0) * (0.2 + 0.7 * (q[i] / Math.max(1e-6, kill[kind])))) hex = C.dead;
            if (s.ufOn && g.uf && k > f0) {                      // caught on the outside of the fibres
              const stopX = UX0 + 0.2 + q[i] * (UX1 - UX0 - 0.4);
              p.set(stopX, Y + Math.cos(a) * 0.36, Math.sin(a) * 0.36);
            }
          } else if (s.ufOn && k > f0 && k < f1) { p.y = Y + Math.cos(a) * 0.08; p.z = Math.sin(a) * 0.08; }
          D.put(i, p.x, p.y, p.z, size); D.setColorAt(i, col.setHex(hex));
        }
        D.done();
        const nk = `${dose.toFixed(1)}|${s.germ}`;
        if (nk !== key) { key = nk; cur = { dose, germ: s.germ }; chart.redraw(); }
        const narrow = stage.host.clientWidth < 560;
        lab.in.visible = lab.out.visible = !narrow;
      },
      readout: (s) => {
        const dose = uvDose(s.flow, s.age), G = GERMS[s.germ], logs = logKill(s.germ, dose);
        return `<div class="big">${G.name.split(' (')[0]}: ${fmtPct(pctKilled(logs))} inactivated</div>
          <div class="row"><span>UV dose</span><b>${dose.toFixed(0)} mJ/cm²</b></div>
          <div class="row"><span>Lamp output</span><b>${Math.round(lampOutput(s.age) * 100)}% of new</b></div>
          <div class="row"><span>Log reduction by UV</span><b>${logs >= 6 ? '6+' : logs.toFixed(1)}-log</b></div>
          <div class="row"><span>After UF</span><b>${s.ufOn ? 'caught, dead or alive' : 'no UF fitted'}</b></div>
          <small>Designed for ${DESIGN_DOSE} mJ/cm² at ${RATED_LPM} L/min with a new lamp. Salts pass both stages: only RO removes them.</small>`;
      },
    };
  },
};
