// Chapter 5: the reject stream. Recovery r = permeate ÷ feed; the rest carries the salt away.
// Sums in recoverySums (ro.js): litres wasted per litre = (1 − r)/r; concentration factor 1/(1 − r);
// concentrate TDS from a salt balance. Scale risk is a rough guide based on how salty the
// concentrate gets: calcium carbonate and sulphate crystallise on the membrane sooner as it
// concentrates (exact limits depend on hardness, alkalinity, pH and temperature), which is why
// home units without antiscalant dosing usually run at 20–40% recovery.
import { THREE, M, box, rod, canvasTexture, approach, clamp } from '../kit.js';
import { C, dots, pathOf, recoverySums, cartridge, pipe, fitNarrow } from '../ro.js';

const YH = 2.5, FAMILY_L = 20;   // membrane height; a family of four drinking and cooking ≈ 20 L a day
const N = 180;

const risk = (conc) => (conc < 2000 ? { t: 'low', life: 'about 2 years', c: 'ok' } : conc < 4000 ? { t: 'moderate', life: 'about 1 year', c: '' } : { t: 'high', life: 'a few months', c: 'no' });

export default {
  id: 'reject',
  short: 'Where the rest goes',
  title: 'Where the rest of the water goes',
  subtitle: 'For every glass you drink, two or three go down the drain.',
  view: { pos: [0.6, 3.8, 9.8], target: [0.5, 2.3, 0] },
  learn: `<p>The membrane cannot keep the salt it rejects. Something has to carry it away, or the surface would clog within minutes. That something is the <b>reject</b> water, also called <b>concentrate</b> or brine.</p>
    <p>The share of the incoming water that ends up in your glass is the <b>recovery</b>. A typical home purifier recovers only about <b>25 to 40%</b>, so for every litre you drink, about <b>2 to 3 litres</b> go down the drain. A small <b>flow restrictor</b> on the reject line sets this balance and keeps the pressure up on the membrane.</p>
    <p>Why not recover more? The less water that leaves as reject, the <b>saltier</b> it gets. Push too far and hardness salts <b>crystallise</b> as scale on the membrane, and it dies early. Better membranes and designs now reach 50 to 60% or more, and India's National Green Tribunal has pushed makers towards <b>60%</b> and above.</p>
    <p>Reject water is too salty to drink, but it is fine for <b>mopping</b>, flushing toilets and washing cars. Use it on plants only now and then: the salt builds up in the soil.</p>
    <p class="tip"><b>Try it:</b> slide the recovery up and watch the drain bucket shrink, but the reject get saltier and the scale grow.</p>`,
  terms: [
    { t: 'Recovery', d: 'The share of the feed water that comes out as purified water.' },
    { t: 'Reject (concentrate)', d: 'The water that carries the rejected salts to the drain.' },
    { t: 'Flow restrictor', d: 'A narrow tube or valve on the reject line that sets how much water leaves and keeps the pressure up.' },
    { t: 'Concentration factor', d: 'How many times saltier the reject is than the feed: 1 ÷ (1 − recovery), roughly.' },
    { t: 'Scale', d: 'Hard crystals, mostly calcium carbonate and sulphate, that form when water gets too concentrated.' },
  ],
  defaults: { recovery: 0.3, feed: 800 },
  controls: [
    { key: 'recovery', type: 'range', label: 'Recovery', min: 0.15, max: 0.8, step: 0.01, ends: ['wasteful', 'thrifty'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'feed', type: 'range', label: 'TDS of your water', min: 200, max: 3000, step: 10, ends: ['city tap', 'salty borewell'], fmt: (v) => Math.round(v).toLocaleString('en-IN') + ' ppm' },
    { key: 'presets', type: 'buttons', label: 'Set', items: [
      { label: 'Older purifier, 20%', act: (s) => { s.recovery = 0.2; } },
      { label: 'Typical, 30%', act: (s) => { s.recovery = 0.3; } },
      { label: 'Water saver, 60%', act: (s) => { s.recovery = 0.6; } },
    ] },
  ],
  quiz: [
    { q: 'A purifier has 25% recovery. How much water goes to the drain for each litre you drink?', options: ['0.25 L', '1 L', '3 L', '4 L'], answer: 2, why: 'You need 4 L of feed for 1 L of product, so 3 L leave as reject.' },
    { q: 'Why not run at 90% recovery?', options: ['The water would taste sweet', 'The reject would be so salty that scale forms and the membrane clogs', 'The pump would stop', 'It would be illegal to drink'], answer: 1, why: 'With little water left to carry the salt, it becomes very concentrated and crystallises on the membrane.' },
    { q: 'What is a good use for reject water?', options: ['Drinking', 'Cooking rice', 'Mopping floors and flushing', 'Filling a fish tank'], answer: 2, why: 'It is safe to touch but too salty to drink or use often on plants or fish.' },
  ],
  reel: [
    { ms: 5600, caption: 'A typical home RO sends two or three litres down the drain for every litre you drink.', set: { feed: 800 }, anim: { recovery: [0.25, 0.6] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const floor = box(8.4, 0.08, 2.6, M.matte(0x3a404c)); floor.position.set(0.4, -0.04, 0); root.add(floor);
    // Housing (clear) with the membrane roll inside, and a layer of scale that grows.
    const housing = cartridge(-1.6, 1.6, 0.42, 0xe8f1ff, { clear: true }); housing.position.set(0, YH, 0); root.add(housing);
    const roll = rod(-1.45, 1.45, 0.34, 0.34, M.plastic(0xf4f1e8, { roughness: 0.6 }), 32); roll.position.y = YH; root.add(roll);
    const scaleMat = M.matte(0xe9e4d8, { transparent: true, opacity: 0, roughness: 1 });
    const scale = rod(0.1, 1.46, 0.345, 0.37, scaleMat, 32); scale.position.y = YH; root.add(scale);
    // The 1-litre jug and the drain bucket.
    const cup = (x, r, h, color) => {
      const g = new THREE.Group(); g.position.set(x, 0, 0);
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, h, 32, 1, true), M.clear(color, 0.25)); wall.position.y = h / 2;
      const water = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.03, r * 0.9 - 0.03, 1, 32), M.clear(color, 0.55, { depthWrite: false }));
      g.add(wall, water); root.add(g);
      g.set = (k) => { const hh = Math.max(0.005, h * clamp(k, 0, 1)); water.scale.y = hh; water.position.y = hh / 2; };
      return g;
    };
    const jug = cup(3.3, 0.42, 1.0, 0x8ef0ff);            // 1 litre
    const bucket = cup(-1.3, 0.8, 1.35, 0xc98a4b);        // holds up to 9 litres, same scale by volume would be huge, so height ∝ litres/9
    const restrictor = rod(-0.12, 0.12, 0.05, 0.05, M.plastic(0xffb547), 12); restrictor.position.set(2.0, 1.55, 0.2); restrictor.rotation.z = Math.PI / 2; root.add(restrictor);

    // Flow paths.
    const feed = pathOf([[-4.0, YH, 0], [-1.75, YH, 0], [1.5, YH, 0.15]]);
    const perm = pathOf([[1.5, YH, 0], [1.9, YH, 0], [3.1, YH - 0.2, 0], [3.3, 1.2, 0]]);
    const rej = pathOf([[1.5, YH - 0.2, 0.2], [1.8, YH - 0.35, 0.2], [2.0, 1.8, 0.2], [2.0, 1.2, 0.2], [0.2, 1.6, 0.25], [-1.1, 1.6, 0.25], [-1.25, 1.2, 0.2]]);
    root.add(pipe(feed.points.slice(0, 2), 0.06), pipe(perm.points.slice(1), 0.05, 0x8ef0ff, 0.5), pipe(rej.points.slice(1), 0.05, 0xffd9b0, 0.5));
    const D = dots(N, 0.055); root.add(D);
    const u = Float32Array.from({ length: N }, (_, i) => (i * 0.618) % 1);
    const q = Float32Array.from({ length: N }, (_, i) => (i * 0.7548776) % 1);
    const p = new THREE.Vector3(), col = new THREE.Color();

    const lab = {
      feed: stage.label('Feed water in', [-3.3, YH + 0.45, 0], root),
      mem: stage.label('RO membrane', [-0.4, YH + 0.75, 0], root),
      scale: stage.label('Scale builds up', [0.9, YH - 0.8, 0.4], root, 'hot'),
      jug: stage.label('', [3.3, 1.3, 0.3], root, ''),
      bucket: stage.label('', [-1.3, 1.95, 0.3], root, 'hot'),
      restrictor: stage.label('Flow restrictor', [1.25, 1.95, 0.3], root),
    };

    // Waste per litre against recovery.
    let cur = { r: 0.3 };
    const X0 = 70, X1 = 690, Y0 = 250, Y1 = 60, px = (r) => X0 + ((r - 0.1) / 0.7) * (X1 - X0), py = (w) => Y0 - (clamp(w, 0, 9) / 9) * (Y0 - Y1);
    const chart = canvasTexture(760, 320, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 28px sans-serif'; g.fillText('Litres to the drain per litre you drink', 20, 38);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(px(0.25), Y1, px(0.4) - px(0.25), Y0 - Y1);
      g.fillStyle = 'rgba(92,225,169,.12)'; g.fillRect(px(0.6), Y1, px(0.8) - px(0.6), Y0 - Y1);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif'; g.fillText('typical home RO', px(0.25) + 4, Y1 + 22); g.fillText('60%+ target', px(0.6) + 6, Y1 + 22);
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1;
      for (let v = 0; v <= 9; v += 3) { g.beginPath(); g.moveTo(X0, py(v)); g.lineTo(X1, py(v)); g.stroke(); g.fillText(String(v), 36, py(v) + 6); }
      for (let r = 0.1; r <= 0.81; r += 0.1) g.fillText(Math.round(r * 100) + '%', px(r) - 16, 290);
      g.strokeStyle = '#ffb547'; g.lineWidth = 4; g.beginPath();
      for (let r = 0.1; r <= 0.8001; r += 0.005) { const y = py((1 - r) / r); r === 0.1 ? g.moveTo(px(r), y) : g.lineTo(px(r), y); }
      g.stroke();
      const wv = (1 - cur.r) / cur.r; g.fillStyle = '#8ef0ff'; g.beginPath(); g.arc(px(cur.r), py(wv), 11, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('recovery', X1 - 70, 314);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.47), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(3.4, 4.05, -0.8); board.rotation.y = -0.15; root.add(board);

    let t = 0, fillK = 0, grow = 0, key = '';
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage); t += dt;
        const R = recoverySums(s.recovery, s.feed);
        // Fill a litre in 6 s; the bucket gets the matching reject (bucket height = litres ÷ 9).
        fillK += dt / 6; if (fillK > 1.25) fillK = 0;
        jug.set(Math.min(1, fillK)); bucket.set((Math.min(1, fillK) * R.wastePerLitre) / 9);
        const rk = risk(R.conc);
        const target = rk.t === 'low' ? 0.05 : rk.t === 'moderate' ? 0.4 : 0.85;
        grow = approach(grow, target, 1.2, dt);
        scaleMat.opacity = grow; scale.scale.set(1, 1 + grow * 0.5, 1 + grow * 0.5);
        for (let i = 0; i < N; i++) {
          u[i] = (u[i] + dt * 0.28) % 1;
          const toPerm = q[i] < s.recovery, k = u[i];
          // First half of the cycle: in the feed pipe and membrane; second half: out one side or the other.
          if (k < 0.5) { feed.at(k * 2, p); p.y += (q[i] - 0.5) * 0.25; p.z += (((i * 37) % 11) / 11 - 0.5) * 0.25; col.setHex(C.water); }
          else if (toPerm) { perm.at((k - 0.5) * 2, p); col.setHex(C.pure); }
          else { rej.at((k - 0.5) * 2, p); col.setHex(C.reject); }
          D.put(i, p.x, p.y, p.z, 1); D.setColorAt(i, col);
        }
        D.done();
        const nk = `${Math.round(s.recovery * 100)}|${Math.round(s.feed)}`;
        if (nk !== key) {
          key = nk; cur = { r: s.recovery }; chart.redraw();
          lab.jug.element.innerHTML = '1 L purified';
          lab.bucket.element.innerHTML = `${R.wastePerLitre.toFixed(1)} L to the drain`;
          const narrow = stage.host.clientWidth < 560;
          lab.restrictor.visible = lab.feed.visible = !narrow;
        }
        lab.scale.visible = grow > 0.2;
      },
      readout: (s) => {
        const R = recoverySums(s.recovery, s.feed), rk = risk(R.conc);
        return `<div class="big">${R.wastePerLitre.toFixed(1)} L wasted per litre</div>
          <div class="row"><span>Feed needed per litre</span><b>${R.feedPerLitre.toFixed(1)} L</b></div>
          <div class="row"><span>Family of four, a day (${FAMILY_L} L)</span><b>${Math.round(R.wastePerLitre * FAMILY_L)} L down the drain</b></div>
          <div class="row"><span>Reject water TDS</span><b>${Math.round(R.conc).toLocaleString('en-IN')} ppm (${R.cf.toFixed(1)}×)</b></div>
          <div class="row"><span>Scale risk, membrane life</span><b class="${rk.c}">${rk.t}, ${rk.life}</b></div>
          <small>95% salt rejection. Scale risk and life are a rough guide: they depend on hardness, pH and pre-treatment.</small>`;
      },
    };
  },
};
