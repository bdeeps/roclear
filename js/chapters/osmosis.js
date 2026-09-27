// Chapter 2: osmosis and reverse osmosis in a U-tube with a semi-permeable membrane.
// Osmotic pressure by van 't Hoff (osmoticBar in ro.js). Net water flow ∝ (π − P):
// positive means water moves into the salty side (osmosis), negative means it is squeezed out (RO).
import { THREE, M, rod, beam, box, sphere, arrow, canvasTexture, approach, clamp } from '../kit.js';
import { C, dots, osmoticBar, barToMetres, BAR_PSI, fitNarrow } from '../ro.js';

const XA = 1.7, YB = 1.0, YTOP = 4.4, R = 0.5, BASE = 2.9;   // arm offset, bottom tube height, top, radius, rest level
const NW = 150, NS = 70, NX = 36;                           // water, salt ions, crossing water

export default {
  id: 'osmosis',
  short: 'Osmosis, reversed',
  title: 'Osmosis, and how to reverse it',
  subtitle: 'Water sneaks towards salt. Push hard enough and it goes the other way.',
  view: { pos: [0.6, 3.9, 9.4], target: [0.9, 2.8, 0] },
  learn: `<p>Put fresh water on one side of a special skin and salty water on the other. The skin is a <b>semi-permeable membrane</b>: water molecules can get through, but dissolved salt cannot.</p>
    <p>Water moves on its own <b>towards the salty side</b>, as if trying to dilute it. This is <b>osmosis</b>. It is how plant roots drink and why a cucumber goes limp in salty pickle. The salty side rises until the extra weight of water pushes back just as hard. That push is the <b>osmotic pressure</b>.</p>
    <p>The chemist <b>van 't Hoff</b> found a simple rule: <b>π = iMRT</b>. Double the salt and you double the pressure. Water with 1,000 ppm of salt has about <b>0.8 bar</b>; seawater, about <b>27 bar</b>.</p>
    <p>Now push on the salty side <b>harder than π</b>. The flow flips: fresh water is squeezed <b>out</b> of the salty water. That is <b>reverse osmosis</b>. A home purifier's pump gives about 5 bar, plenty for well water but far too little for the sea, where plants push 55 to 70 bar.</p>
    <p class="tip"><b>Try it:</b> with no push, watch the salty side rise. Then press harder until the arrow flips. Now make it seawater and try again.</p>`,
  terms: [
    { t: 'Semi-permeable membrane', d: 'A skin that lets some molecules (water) through but blocks others (dissolved salts).' },
    { t: 'Osmosis', d: 'Water moving through a membrane from the less salty side to the more salty side, all by itself.' },
    { t: 'Osmotic pressure (π)', d: 'The push needed to stop osmosis. It grows with how much is dissolved.' },
    { t: 'Reverse osmosis', d: 'Pushing harder than the osmotic pressure, so water flows out of the salty side instead.' },
    { t: 'ppm', d: 'Parts per million: milligrams of dissolved stuff in each litre of water.' },
  ],
  defaults: { salt: 1000, pressure: 0 },
  controls: [
    { key: 'salt', type: 'log', label: 'Salt in the right arm', min: 100, max: 40000, ends: ['well water', 'seawater'], fmt: (v) => Math.round(v).toLocaleString('en-IN') + ' ppm' },
    { key: 'pressure', type: 'range', label: 'Push on the piston', min: 0, max: 70, step: 0.1, ends: ['0 bar', '70 bar'], fmt: (v) => v.toFixed(1) + ' bar' },
    { key: 'presets', type: 'buttons', label: 'Try', items: [
      { label: 'Home pump, 5.5 bar', act: (s) => { s.pressure = 5.5; } },
      { label: 'Seawater', act: (s) => { s.salt = 35000; } },
      { label: 'No push', act: (s) => { s.pressure = 0; } },
    ] },
  ],
  quiz: [
    { q: 'In osmosis, which way does water move?', options: ['From the salty side to the fresh side', 'From the fresh side to the salty side', 'It does not move', 'Only the salt moves'], answer: 1, why: 'Water moves towards where it is "less concentrated", the salty side, as if to dilute it.' },
    { q: 'What makes it reverse osmosis?', options: ['Heating the water', 'Pushing on the salty side harder than the osmotic pressure', 'Adding more salt', 'Using a thicker membrane'], answer: 1, why: 'Once the push beats π, the flow flips and fresh water is squeezed out of the salty side.' },
    { q: 'Seawater has an osmotic pressure of about 27 bar. Why can’t a home purifier turn it into drinking water?', options: ['Its pump gives only about 5 bar', 'Seawater is too cold', 'The membrane is too thick', 'It could, just slowly'], answer: 0, why: 'Below 27 bar, water would actually flow into the seawater. Desalination plants use 55 to 70 bar.' },
  ],
  reel: [
    { ms: 5200, caption: 'Water sneaks through a membrane towards the salty side. That is osmosis.', set: { salt: 3000, pressure: 0 }, view: { pos: [0.2, 3.4, 7.6], target: [0.3, 2.6, 0] }, spin: 0 },
    { ms: 5600, caption: 'Push harder than the osmotic pressure and the flow flips: reverse osmosis.', set: { salt: 3000 }, anim: { pressure: [0, 6] }, view: { pos: [0.6, 3.2, 7.4], target: [0.4, 2.5, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const glass = M.clear(0xdfeaff, 0.16);
    // The U: two upright arms and a horizontal bottom tube, with rounded elbows.
    const arm = (x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, YTOP - YB, 40, 1, true), glass); m.position.set(x, (YB + YTOP) / 2, 0); root.add(m); };
    arm(-XA); arm(XA);
    const bottom = rod(-XA, XA, R, R, glass, 40, true); bottom.position.y = YB; root.add(bottom);
    for (const x of [-XA, XA]) { const e = sphere(R, glass, 32); e.position.set(x, YB, 0); e.castShadow = false; root.add(e); }
    const stand = box(4.8, 0.12, 1.4, M.matte(0x5a5f6a)); stand.position.set(0, 0.3, 0); root.add(stand);
    for (const x of [-XA, XA]) { const leg = box(0.08, 0.55, 0.08, M.metal(0x7a8394)); leg.position.set(x, 0.6, 0); root.add(leg); }

    // Water: the bottom tube is always full; the arms fill to their levels.
    const fresh = M.clear(0x3f9dff, 0.35, { depthWrite: false }), salty = M.clear(0xffb46a, 0.3, { depthWrite: false });
    const wl = rod(-XA, 0, R - 0.03, R - 0.03, fresh, 32), wr = rod(0, XA, R - 0.03, R - 0.03, salty, 32);
    const el = sphere(R - 0.03, fresh, 24), er = sphere(R - 0.03, salty, 24); el.position.set(-XA, YB, 0); er.position.set(XA, YB, 0); wl.position.y = wr.position.y = YB;
    const colL = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 1, 32), fresh), colR = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 1, 32), salty);
    colL.position.x = -XA; colR.position.x = XA;
    root.add(wl, wr, el, er, colL, colR);
    const setCol = (m, top) => { const h = Math.max(0.01, top - YB); m.scale.y = h; m.position.y = YB + h / 2; };

    // The membrane: a thin disc across the bottom tube, dotted with gaps.
    const tex = canvasTexture(256, 256, (g, w, h) => { g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa6b8'; for (let i = 0; i < 700; i++) { g.beginPath(); g.arc((i * 97.3) % w, (i * 57.1) % h, 1.6, 0, 7); g.fill(); } });
    const mem = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.05, 40), new THREE.MeshStandardMaterial({ map: tex.tex, transparent: true, opacity: 0.8, roughness: 0.6 }));
    mem.rotation.z = Math.PI / 2; mem.position.set(0, YB, 0); root.add(mem);

    // Piston on the salty arm.
    const piston = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 0.14, 32), M.metal(0x9aa3b2, { roughness: 0.3 }));
    const stem = beam([0, 0, 0], [0, 1.5, 0], 0.06, M.metal(0xb9bec8));
    const handle = box(0.9, 0.12, 0.2, M.plastic(0x2a2e37)); handle.position.y = 1.55;
    piston.add(disc, stem, handle); piston.position.x = XA; root.add(piston);
    const push = arrow(0xffb547, 0.8, 0.22, 0.05); push.rotation.x = Math.PI; root.add(push);

    const flow = arrow(0x8ef0ff, 1, 0.24, 0.05); flow.position.set(0, YB, 0.72); root.add(flow);

    // Particles. Ions only in the right side; water everywhere; a stream of crossing water.
    const W = dots(NW, 0.045), S = dots(NS, 0.085), X = dots(NX, 0.05);
    for (let i = 0; i < NW; i++) W.setColorAt(i, new THREE.Color(C.water));
    for (let i = 0; i < NS; i++) S.setColorAt(i, new THREE.Color(i % 2 ? C.salt : 0xc49bff));
    for (let i = 0; i < NX; i++) X.setColorAt(i, new THREE.Color(0xbff4ff));
    root.add(W, S, X);
    const rnd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    // A point inside one side of the U (side −1 left, +1 right), up to the water level.
    const inside = (side, a, b, c, level, out) => {
      const armH = level - YB, tubeL = XA, total = armH + tubeL;
      const d = a * total, rr = (R - 0.12) * Math.sqrt(b), th = c * Math.PI * 2;
      if (d < tubeL) out.set(side * (0.12 + d * (XA - 0.12) / tubeL), YB + rr * Math.cos(th), rr * Math.sin(th));
      else out.set(side * XA + rr * Math.cos(th), YB + (d - tubeL), rr * Math.sin(th));
      return out;
    };

    const labels = {
      left: stage.label('Fresh water', [-XA, YB - 0.85, 0.3], root),
      right: stage.label('', [XA + 0.3, YB - 0.85, 0.3], root, 'hot'),
      mem: stage.label('Membrane', [0, YB + 0.75, -0.3], root),
      flow: stage.label('', [0, YB + 0.95, 0.72], root, 'hot'),
    };

    // A board comparing the push with the osmotic pressure.
    let cur = { pi: 0.8, P: 0 };
    const X0 = 70, X1 = 690, bx = (p) => X0 + (Math.log10(1 + p) / Math.log10(71)) * (X1 - X0);
    const chart = canvasTexture(760, 300, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.88)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText('Your push vs osmotic pressure (bar)', 22, 42);
      g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.strokeStyle = 'rgba(255,255,255,.12)';
      for (const t of [0, 1, 2, 5, 10, 20, 50, 70]) { g.beginPath(); g.moveTo(bx(t), 60); g.lineTo(bx(t), 240); g.stroke(); g.fillText(String(t), bx(t) - 6, 266); }
      g.fillStyle = 'rgba(92,225,169,.18)'; g.fillRect(bx(4), 60, bx(6.5) - bx(4), 180);
      g.fillStyle = 'rgba(255,122,61,.18)'; g.fillRect(bx(55), 60, bx(70) - bx(55), 180);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('home pump', bx(4) - 6, 288); g.fillText('sea plants', bx(55) - 40, 288);
      const bar = (y, v, color, text) => { g.fillStyle = color; g.fillRect(X0, y, Math.max(3, bx(v) - X0), 46); g.fillStyle = '#0b0d12'; g.font = 'bold 22px sans-serif'; if (bx(v) - X0 > 260) g.fillText(text, X0 + 10, y + 30); else { g.fillStyle = color; g.fillText(text, bx(v) + 10, y + 30); } };
      bar(80, cur.pi, '#ffb547', `osmotic pressure ${cur.pi.toFixed(1)}`);
      bar(160, cur.P, '#8ef0ff', `your push ${cur.P.toFixed(1)}`);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.5), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(4.1, 3.3, -0.3); board.rotation.y = -0.2; root.add(board);

    const u = Float32Array.from({ length: NX }, (_, i) => i / NX);
    const p = new THREE.Vector3();
    let d = 0, net = 0, t = 0, key = '';
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); fitNarrow(stage); t += dt;
        const pi = osmoticBar(s.salt), dP = pi - s.pressure;               // > 0: osmosis into the salty side
        net = approach(net, dP, 4, dt);
        // Level difference, not to scale (0.8 bar is really 8 m of water): a squashed, readable version.
        d = approach(d, 1.25 * Math.tanh(dP / 3), 0.8, dt);
        const hL = BASE - d, hR = BASE + d;
        setCol(colL, hL); setCol(colR, hR);
        piston.position.y = hR + 0.07;
        const pl = 0.4 + 0.5 * Math.log10(1 + s.pressure);
        push.visible = s.pressure > 0.05; push.set(pl); push.position.set(XA, hR + 1.75 + pl, 0);
        const mag = Math.abs(net), dir = Math.sign(net);
        flow.visible = mag > 0.03;
        flow.rotation.z = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        flow.position.x = -dir * 0.6;
        flow.set(0.4 + 0.5 * Math.tanh(mag / 2));
        salty.color.setHSL(0.08, 0.9, clamp(0.72 - 0.08 * Math.log10(s.salt / 100), 0.45, 0.72));
        // Jiggling particles.
        for (let i = 0; i < NW; i++) {
          const side = i % 2 ? 1 : -1, lev = side > 0 ? hR : hL;
          inside(side, rnd(i, 1), rnd(i, 2), rnd(i, 3) + t * 0.05 * (rnd(i, 4) - 0.5), lev - 0.05, p);
          W.put(i, p.x + Math.sin(t * 3 + i) * 0.03, p.y + Math.cos(t * 2.7 + i) * 0.03, p.z);
        }
        W.done();
        const nIons = Math.round(clamp(8 + 14 * Math.log10(s.salt / 100), 4, NS));
        for (let i = 0; i < NS; i++) {
          inside(1, rnd(i, 5), rnd(i, 6), rnd(i, 7) + t * 0.04 * (rnd(i, 8) - 0.5), hR - 0.08, p);
          S.put(i, p.x + Math.sin(t * 2 + i) * 0.03, p.y + Math.cos(t * 2.3 + i) * 0.03, p.z, i < nIons ? 1 : 0);
        }
        S.done();
        // Water crossing the membrane, from fresh to salty (osmosis) or salty to fresh (RO).
        const speed = 0.9 * Math.tanh(mag / 1.5);
        for (let i = 0; i < NX; i++) {
          u[i] = (u[i] + dt * speed) % 1;
          const k = u[i], x = dir * (-0.9 + 1.8 * k), rr = (R - 0.15) * rnd(i, 9), th = rnd(i, 10) * 6.283;
          X.put(i, x, YB + rr * Math.cos(th), rr * Math.sin(th), mag > 0.03 ? 1 : 0);
        }
        X.done();
        const nk = `${Math.round(s.salt)}|${s.pressure.toFixed(1)}|${stage.host.clientWidth < 560}`;
        if (nk !== key) {
          key = nk; cur = { pi, P: s.pressure }; chart.redraw();
          const narrow = stage.host.clientWidth < 560;
          labels.right.element.innerHTML = `Salty water <b>${Math.round(s.salt).toLocaleString('en-IN')} ppm</b>`;
          labels.flow.element.innerHTML = Math.abs(dP) < 0.05 ? 'Balanced: no flow' : dP > 0 ? (narrow ? 'Osmosis →' : 'Osmosis: water flows in →') : (narrow ? '← Reverse osmosis' : '← Reverse osmosis: water squeezed out');
          board.visible = !narrow;
        }
      },
      readout: (s) => {
        const pi = osmoticBar(s.salt), dP = s.pressure - pi;
        const state = Math.abs(dP) < 0.05 ? 'Balanced' : dP > 0 ? 'Reverse osmosis' : 'Osmosis';
        return `<div class="big">${state}</div>
          <div class="row"><span>Osmotic pressure π</span><b>${pi.toFixed(2)} bar (${(pi * BAR_PSI).toFixed(0)} psi)</b></div>
          <div class="row"><span>Your push</span><b>${s.pressure.toFixed(1)} bar</b></div>
          <div class="row"><span>Net push on the water</span><b>${dP >= 0 ? '+' : '−'}${Math.abs(dP).toFixed(2)} bar</b></div>
          <div class="row"><span>π as a column of water</span><b>${barToMetres(pi).toFixed(0)} m tall</b></div>
          <small>π = iφMRT for salt (NaCl) at 25 °C. Water levels are not to scale.</small>`;
      },
    };
  },
};
