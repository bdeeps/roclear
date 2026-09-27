// Chapter 4: TDS, the membrane's cut, and the TDS controller that blends some
// pre-filtered water back in. Limits: BIS IS 10500:2012, TDS 500 mg/L acceptable and
// 2,000 mg/L permissible where there is no alternative source; fluoride 1.0 / 1.5 mg/L;
// arsenic 0.01 mg/L. Taste bands: WHO, "TDS in drinking-water" background document (2003):
// under 300 mg/L excellent, 300–600 good, 600–900 fair, 900–1,200 poor, above 1,200 unacceptable.
// RO removal of fluoride and arsenic: typically about 85–95% (arsenic(V) better than arsenic(III));
// 90% is used here for both.
import { THREE, M, box, rod, tube, canvasTexture, approach, clamp } from '../kit.js';
import { C, dots, tdsChain, cartridge, pipe, fitNarrow } from '../ro.js';

const XF = -3.3, XM = -1.6, XR = 0.1, XV = 1.35, XT = 2.7, YG = 0.45;   // feed, membrane, RO glass, valve, tap glass
const EXTRA = {
  none: null,
  fluoride: { name: 'Fluoride', feed: 3.0, unit: 'mg/L', ok: 1.0, max: 1.5, removal: 0.9 },
  arsenic: { name: 'Arsenic', feed: 0.05, unit: 'mg/L', ok: 0.01, max: 0.01, removal: 0.9 },
};
const perDot = 15;   // ppm per dot in the glasses

export default {
  id: 'tds',
  short: 'TDS and taste',
  title: 'TDS: how much is dissolved',
  subtitle: 'The membrane strips almost everything; a small valve puts some back.',
  view: { pos: [0.3, 3.4, 9.6], target: [0.2, 2.3, 0] },
  learn: `<p>Even clear water carries dissolved stuff: calcium, magnesium, sodium, chloride, bicarbonate and more. Together they are the <b>total dissolved solids</b>, or <b>TDS</b>, measured in <b>ppm</b> (the same as mg per litre).</p>
    <p>India's drinking-water standard, <b>BIS IS 10500</b>, says up to <b>500 mg/L</b> is acceptable, and up to <b>2,000 mg/L</b> is allowed only where there is no other source. City tap water is often 100 to 300 ppm; borewells in many places give 500 to 1,500 or more.</p>
    <p>An RO membrane removes about <b>95%</b> of TDS, so 1,000 ppm becomes about 50. That is safe, but can taste <b>flat</b>. So many purifiers have a <b>TDS controller</b>: a small valve that blends a little <b>pre-filtered</b> water back in for taste and minerals.</p>
    <p>Careful: that blended water has <b>not</b> been through the membrane. If your borewell has <b>fluoride</b> or <b>arsenic</b>, which RO removes well, the controller lets some of it straight back into your glass.</p>
    <p class="tip"><b>Try it:</b> start with borewell water and open the TDS controller to taste. Then add fluoride and see what happens to the limit.</p>`,
  terms: [
    { t: 'TDS', d: 'Total dissolved solids: everything dissolved in the water, in mg per litre.' },
    { t: 'ppm', d: 'Parts per million. For water, 1 ppm is 1 mg in a litre.' },
    { t: 'BIS IS 10500', d: 'India’s drinking-water standard, from the Bureau of Indian Standards.' },
    { t: 'TDS controller', d: 'A valve that mixes some pre-filtered, un-membraned water into the RO water to raise its TDS.' },
    { t: 'Fluorosis', d: 'Damage to teeth and bones from drinking too much fluoride for years, common in parts of India.' },
  ],
  defaults: { feed: 1000, rejection: 0.95, blend: 0, extra: 'none' },
  controls: [
    { key: 'feed', type: 'range', label: 'TDS of your water', min: 50, max: 3000, step: 10, ends: ['city tap', 'salty borewell'], fmt: (v) => Math.round(v).toLocaleString('en-IN') + ' ppm' },
    { key: 'rejection', type: 'range', label: 'Membrane salt rejection', min: 0.85, max: 0.99, step: 0.005, ends: ['worn out', 'new'], fmt: (v) => (v * 100).toFixed(1) + '%' },
    { key: 'blend', type: 'range', label: 'TDS controller (blend back)', min: 0, max: 0.5, step: 0.01, ends: ['closed', 'wide open'], fmt: (v) => Math.round(v * 100) + '% of the glass' },
    { key: 'extra', type: 'seg', label: 'Also in the water', options: [{ v: 'none', label: 'Nothing' }, { v: 'fluoride', label: 'Fluoride' }, { v: 'arsenic', label: 'Arsenic' }], fmt: (v) => (EXTRA[v] ? `${EXTRA[v].feed} mg/L` : '') },
    { key: 'presets', type: 'buttons', label: 'Water from', items: [
      { label: 'City tap, 200', act: (s) => { s.feed = 200; } },
      { label: 'Borewell, 1,200', act: (s) => { s.feed = 1200; } },
      { label: 'Salty, 2,500', act: (s) => { s.feed = 2500; } },
    ] },
  ],
  quiz: [
    { q: 'Borewell water at 1,000 ppm goes through a membrane with 95% rejection. What comes out?', options: ['About 950 ppm', 'About 500 ppm', 'About 50 ppm', 'Zero'], answer: 2, why: '95% is removed, so 5% of 1,000, about 50 ppm, is left.' },
    { q: 'What does the TDS controller do?', options: ['Adds salt from a packet', 'Blends some pre-filtered, un-membraned water back in', 'Measures the pump speed', 'Cleans the membrane'], answer: 1, why: 'It lets a little of the incoming water bypass the membrane, raising TDS for taste.' },
    { q: 'Why can the TDS controller be risky with fluoride-rich borewell water?', options: ['It adds fluoride tablets', 'The blended water skips the membrane, so its fluoride comes straight back', 'It heats the water', 'It is not risky'], answer: 1, why: 'The membrane removes most fluoride, but the bypass water keeps all of it.' },
  ],
  reel: [
    { ms: 5000, caption: 'Borewell water at 1,200 ppm comes out of the membrane at about 60 ppm.', set: { rejection: 0.95, blend: 0, extra: 'none' }, anim: { feed: [300, 1200] }, spin: 0 },
    { ms: 5000, caption: 'A TDS controller blends a little unfiltered water back in, and anything in it too.', set: { feed: 1200, rejection: 0.95, extra: 'fluoride' }, anim: { blend: [0, 0.3] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const table = box(8.2, 0.1, 2.2, M.matte(0x3a404c)); table.position.set(-0.3, -0.05, 0); root.add(table);
    // Glasses: a clear cup with water and dots for dissolved solids.
    const glass = (x, r, h, label, cls) => {
      const g = new THREE.Group(); g.position.set(x, 0, 0);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.88, h, 32, 1, true), M.clear(0xdfeaff, 0.22)); cup.position.y = h / 2;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.05, 32), M.clear(0xdfeaff, 0.35)); base.position.y = 0.025;
      const water = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.03, r * 0.88 - 0.03, h * 0.8, 32), M.clear(0x3f9dff, 0.28, { depthWrite: false })); water.position.y = h * 0.42;
      const d = dots(200, 0.045);
      g.add(cup, base, water, d); root.add(g);
      const l = stage.label(label, [0, h + 0.3, 0], g, cls);
      return { g, d, r, h, l };
    };
    const feedG = glass(XF, 0.7, 1.9, '', ''), roG = glass(XR, 0.5, 1.3, '', ''), tapG = glass(XT, 0.55, 1.4, '', 'hot');
    const mem = cartridge(XM - 0.75, XM + 0.75, 0.24, 0xf4f6fa, { band: 0x2f86d6 }); mem.position.set(0, 1.25, 0); root.add(mem);
    const valve = new THREE.Group(); valve.position.set(XV, 1.1, 0);
    valve.add(rod(-0.2, 0.2, 0.1, 0.1, M.metal(0xd4a64a, { roughness: 0.3 }), 20));
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24), M.plastic(0x3fa9ff)); knob.position.y = 0.2; valve.add(knob);
    const notch = box(0.04, 0.03, 0.14, M.plastic(0xffffff)); notch.position.set(0, 0.27, 0.05); knob.add(notch); notch.position.y = 0.07;
    root.add(valve);
    // Pipes: feed → membrane → RO glass → valve → tap glass; bypass from the feed over the top; reject down.
    root.add(pipe([[XF + 0.5, 1.7, 0], [XF + 0.9, 1.25, 0], [XM - 0.9, 1.25, 0]], 0.05));
    root.add(pipe([[XM + 0.9, 1.25, 0], [XR - 0.2, 1.25, 0], [XR - 0.2, 1.1, 0]], 0.05, 0x8ef0ff, 0.5));
    root.add(pipe([[XR + 0.35, 1.0, 0], [XV - 0.25, 1.1, 0]], 0.05, 0x8ef0ff, 0.5));
    root.add(pipe([[XV + 0.25, 1.1, 0], [XT - 0.2, 1.55, 0], [XT - 0.2, 1.3, 0]], 0.05, 0x8ef0ff, 0.5));
    const bypass = pipe([[XF + 0.3, 1.8, -0.2], [XF + 0.6, 2.45, -0.2], [XV, 2.45, -0.2], [XV, 1.35, -0.1]], 0.04, 0xffd9b0, 0.5); root.add(bypass);
    root.add(pipe([[XM + 0.6, 1.0, 0], [XM + 0.7, 0.35, 0.3], [XM + 0.7, 0.05, 0.4]], 0.04, 0xffd9b0, 0.5));
    const lab = {
      mem: stage.label('RO membrane', [XM, 1.75, 0], root),
      valve: stage.label('TDS controller', [XV, 0.62, 0.3], root),
      bypass: stage.label('Pre-filtered water skips the membrane', [(XF + XV) / 2 + 0.3, 2.75, -0.2], root),
      reject: stage.label('Reject', [XM + 1.2, 0.3, 0.4], root),
    };

    // A TDS scale board with BIS limits and taste bands.
    let cur = { feed: 1000, perm: 50, out: 50 };
    const X0 = 40, X1 = 980, sx = (v) => X0 + (clamp(v, 0, 3000) / 3000) * (X1 - X0);
    const chart = canvasTexture(1024, 300, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText('TDS (ppm = mg per litre)', 24, 42);
      const bands = [[0, 300, 'rgba(92,225,169,.35)', 'excellent'], [300, 600, 'rgba(142,240,255,.28)', 'good'], [600, 900, 'rgba(255,213,71,.25)', 'fair'], [900, 1200, 'rgba(255,181,71,.25)', 'poor'], [1200, 3000, 'rgba(255,90,61,.2)', 'unacceptable taste']];
      bands.forEach(([a, b, c, t]) => { g.fillStyle = c; g.fillRect(sx(a), 120, sx(b) - sx(a), 70); g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '19px sans-serif'; g.fillText(t, sx(a) + 6, 212); });
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.setLineDash([8, 6]);
      for (const [v, t] of [[500, 'BIS acceptable 500'], [2000, 'BIS permissible 2,000']]) { g.beginPath(); g.moveTo(sx(v), 100); g.lineTo(sx(v), 200); g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 19px sans-serif'; g.fillText(t, sx(v) + 6, 98); }
      g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '18px sans-serif';
      for (let v = 0; v <= 3000; v += 500) g.fillText(v.toLocaleString('en-IN'), sx(v) - 12, 290);
      const mark = (v, c, t, row) => { g.fillStyle = c; g.beginPath(); g.moveTo(sx(v), 190); g.lineTo(sx(v) - 11, 170); g.lineTo(sx(v) + 11, 170); g.fill(); g.font = 'bold 20px sans-serif'; g.fillText(t, clamp(sx(v) - 30, 10, w - 130), 244 + row * 22); };
      mark(cur.feed, '#ffb547', 'your water', 0); mark(cur.perm, '#8ef0ff', 'after RO', 0); mark(cur.out, '#5ce1a9', 'at the tap', 1);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 1.44), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(2.9, 3.45, -0.8); board.rotation.y = -0.12; root.add(board);

    const rnd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    const extraCol = new THREE.Color(0xff3b6b), saltCol = new THREE.Color(C.salt), hardCol = new THREE.Color(0xc49bff);
    const fill = (G, ppm, extraN, t) => {
      const n = clamp(Math.round(ppm / perDot), 0, 200 - 12), hw = G.h * 0.8;
      for (let i = 0; i < 200; i++) {
        const on = i < n || (i >= 188 && i < 188 + extraN);
        const rr = (G.r - 0.1) * Math.sqrt(rnd(i, 1)), th = rnd(i, 2) * 6.283 + t * 0.2 * (rnd(i, 3) - 0.5);
        G.d.put(i, rr * Math.cos(th), 0.08 + rnd(i, 4) * (hw - 0.1) + Math.sin(t * 2 + i) * 0.02, rr * Math.sin(th), on ? (i >= 188 ? 1.5 : 1) : 0);
        G.d.setColorAt(i, i >= 188 ? extraCol : i % 3 ? saltCol : hardCol);
      }
      G.d.done();
    };
    let t = 0, key = '';
    const shown = { feed: 1000, perm: 50, out: 50 };
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage); t += dt;
        const r = tdsChain(s.feed, s.rejection, s.blend);
        shown.feed = approach(shown.feed, s.feed, 6, dt); shown.perm = approach(shown.perm, r.perm, 6, dt); shown.out = approach(shown.out, r.out, 6, dt);
        const X = EXTRA[s.extra];
        const xOut = X ? (1 - s.blend) * X.feed * (1 - X.removal) + s.blend * X.feed : 0;
        const xn = (v) => (X ? clamp(Math.round((v / X.ok) * 3), 0, 12) : 0);
        fill(feedG, shown.feed, xn(X ? X.feed : 0), t);
        fill(roG, shown.perm, xn(X ? X.feed * (1 - X.removal) : 0), t);
        fill(tapG, shown.out, xn(xOut), t);
        knob.rotation.y = -s.blend * 5;
        bypass.material.opacity = 0.15 + 0.7 * (s.blend / 0.5);
        feedG.l.element.innerHTML = `Your water <b>${Math.round(shown.feed)} ppm</b>`;
        roG.l.element.innerHTML = `After RO <b>${Math.round(shown.perm)} ppm</b>`;
        tapG.l.element.innerHTML = `At the tap <b>${Math.round(shown.out)} ppm</b>`;
        const narrow = stage.host.clientWidth < 560;
        lab.bypass.visible = lab.reject.visible = board.visible = !narrow;
        const nk = `${Math.round(shown.feed)}|${Math.round(shown.perm)}|${Math.round(shown.out)}`;
        if (nk !== key) { key = nk; cur = { ...shown }; chart.redraw(); }
      },
      readout: (s) => {
        const r = tdsChain(s.feed, s.rejection, s.blend), X = EXTRA[s.extra];
        const verdict = r.out <= 500 ? '<span class="ok">within the BIS acceptable limit</span>' : r.out <= 2000 ? 'only BIS-permissible' : '<span class="no">over the BIS limit</span>';
        let extra = '';
        if (X) {
          const xo = (1 - s.blend) * X.feed * (1 - X.removal) + s.blend * X.feed;
          extra = `<div class="row"><span>${X.name} at the tap</span><b>${xo.toFixed(X.feed < 1 ? 3 : 2)} ${X.unit} ${xo <= X.ok ? '<span class="ok">OK</span>' : '<span class="no">over the limit</span>'}</b></div>`;
        }
        const note = s.feed < 300 ? 'Water this fresh does not need RO: UV or UF is enough, and wastes nothing.' : r.out < 50 ? 'Very low TDS is not dangerous, but it tastes flat and carries few minerals.' : `Limits: BIS IS 10500. ${X ? `${X.name}: acceptable ${X.ok} ${X.unit}.` : ''}`;
        return `<div class="big">${Math.round(r.out)} ppm at the tap</div>
          <div class="row"><span>Your water</span><b>${Math.round(s.feed)} ppm</b></div>
          <div class="row"><span>After the membrane</span><b>${Math.round(r.perm)} ppm</b></div>
          <div class="row"><span>Verdict</span><b>${verdict}</b></div>${extra}
          <small>${note}</small>`;
      },
    };
  },
};
