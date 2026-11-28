/* art/split3d_live.js — LIVE three.js woodblock for s08 (MK.three, see ENGINE.md "Live 3D").
   Top-down ortho view, footprint 90..910 x 170..1230 (same as the 2D block of s04/s05/s08), thickness 60: base slab (floor z 0..48) + raised border
   (beveled, to z 60, inset 40) around the carved field (130..870 x 210..1190, relief depth 12), end caps (70,120,860,70)/(70,1210,860,70) as boxes.
   Two builds of the same block: `whole` (intact, p < .35) and `halves` = ExtrudeGeometry of the left/right polygons split along MK.fx.crackPath(808,500,120,1280,40).
   Halves hinge in depth about their outer long edges (x = 90 / 910) + lateral slide, via an AnimationClip scrubbed with mixer.setTime(p*4).
   A PointLight-like blue light sits in the gap (print.bl meshes mix palette blue where it reaches) over an emissive blue core plane; splinters = InstancedMesh.
   var live = MK.art.splitLive();  live.update({p}); live.renderMain(P); (2D rays here) live.renderShards(P)  -> false when three is unavailable. */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {}, D2R = Math.PI / 180, H = 1400, E = MK.ease, range = MK.range, clamp = MK.clamp;
  var Y = function (y) { return H - y; };
  var K = 4, BASE = 48, NSH = 150, LIFE = 1.3, PX = [90, 910];
  var X0 = 90, X1 = 910, Y0 = 170, Y1 = 1230, FX0 = 130, FX1 = 870, FY0 = 210, FY1 = 1190;
  var PR = {
    base: { fill: 'paper', h: 'grain', a: 0, t0: .15, t1: .75, alb: .85, bl: 1, o: 6 },
    border: { fill: 'red', h: 'grain', a: 0, t0: 0, t1: .55, alb: .85, bl: 1, o: 6 },
    cap: { fill: 'paper', h: 'grain', a: 90, t0: .6, t1: 1, alb: .85, bl: 1, o: 5 },
    pin: { fill: 'paper', t0: 0, t1: 0, o: 2 },
    pdot: { fill: 'ink', t0: 0, t1: 0 },
    mark: { fill: 'paper', h: 'line', a: 60, t0: .8, t1: .8 },
    mink: { fill: 'ink', t0: 0, t1: 0 },
    core: { fill: 'blue', t0: 0, t1: 0, only: 'fill' },
    shard: { fill: 'paper', h: 'grain', a: 0, t0: 0, t1: .45, alb: .85 }
  };

  function build() {
    var THREE = window.THREE, T = MK.three, CR = MK.fx.crackPath(808, 500, 120, 1280, 40), root = new THREE.Group(), fxg = new THREE.Group(), i, k;
    function cx(y) {                                   // crack x at world y (CR is monotonic in y)
      for (var j = 1; j < CR.length; j++) if (CR[j][1] >= y) { var a = CR[j - 1], b = CR[j], u = (y - a[1]) / ((b[1] - a[1]) || 1); return a[0] + (b[0] - a[0]) * u; }
      return CR[CR.length - 1][0];
    }
    function cr(y0, y1) { var o = [[cx(y0), y0]]; CR.forEach(function (q) { if (q[1] > y0 + .01 && q[1] < y1 - .01) o.push(q); }); o.push([cx(y1), y1]); return o; }
    function rev(a) { return a.slice().reverse(); }
    var polyL = [[X0, Y0]].concat(cr(Y0, Y1), [[X0, Y1]]), polyR = cr(Y0, Y1).concat([[X1, Y1], [X1, Y0]]);
    var borL = [[X0, Y0]].concat(cr(Y0, FY0), [[FX0, FY0], [FX0, FY1]], cr(FY1, Y1), [[X0, Y1]]);
    var borR = [[X1, Y0], [X1, Y1]].concat(rev(cr(FY1, Y1)), [[FX1, FY1], [FX1, FY0]], rev(cr(Y0, FY0)));
    var polyW = [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]], holeW = [[FX0, FY0], [FX0, FY1], [FX1, FY1], [FX1, FY0]];
    function shape(pts, px, hole) {
      var sh = new THREE.Shape(pts.map(function (p) { return new THREE.Vector2(p[0] - px, Y(p[1])); }));
      if (hole) sh.holes.push(new THREE.Shape(hole.map(function (p) { return new THREE.Vector2(p[0] - px, Y(p[1])); })));
      return sh;
    }
    function slab(parent, parts, px, bakeInto) {
      bakeInto.base.push({ g: new THREE.ExtrudeGeometry(shape(parts.full, px), { depth: BASE, bevelEnabled: false }) });
      bakeInto.border.push({ g: new THREE.ExtrudeGeometry(shape(parts.border, px, parts.hole), { depth: 6, bevelEnabled: true, bevelThickness: 6, bevelSize: 12, bevelOffset: -12, bevelSegments: 1 }), p: [0, 0, BASE] });
    }
    function bucket() { var o = {}; Object.keys(PR).forEach(function (n) { o[n] = []; }); return o; }
    function flush(parent, b) { Object.keys(b).forEach(function (n) { if (b[n].length) parent.add(T.bake(b[n], PR[n])); }); }
    /* carved-field chisel marks (same RNG order as the 2D s08 build) */
    var r = MK.rng(88), MARKS = [];
    for (i = 0; i < 300; i++) MARKS.push({ x: r.range(140, 860), y: r.range(220, 1180), a: (60 + r.range(-8, 8)) * D2R, l: r.range(50, 120), w: r.range(5, 11) });
    function markPoly(m) {
      var dx = Math.cos(m.a) * m.l, dy = Math.sin(m.a) * m.l;
      return { t: MK.P.taperPoly([[m.x, m.y], [m.x + dx / 2, m.y + dy / 2], [m.x + dx, m.y + dy]], [m.w, 1], 3), i: null, ink: MK.P.taperPoly([[m.x, m.y], [m.x + dx * .5, m.y + dy * .5]], [3.4, .6], 2) };
    }
    function marks(b, px, side) {
      MARKS.forEach(function (m, idx) {
        var mp = markPoly(m), ok = mp.t.every(function (p) {
          if (p[0] < FX0 + 3 || p[0] > FX1 - 3 || p[1] < FY0 + 3 || p[1] > FY1 - 3) return false;
          var c = cx(p[1]); return side === 0 ? true : side < 0 ? p[0] < c - 8 : p[0] > c + 8;
        });
        if (!ok) return;
        b.mark.push({ g: new THREE.ShapeGeometry(shape(mp.t, px)), p: [0, 0, BASE + .4] });
        if (idx % 6 === 0 && mp.ink.length) b.mink.push({ g: new THREE.ShapeGeometry(shape(mp.ink, px)), p: [0, 0, BASE + .8] });
      });
    }
    function caps(b, px, side) {
      [120, 1210].forEach(function (y) {
        var c = cx(y + 35), x0 = side <= 0 ? 70 : c, x1 = side >= 0 ? 930 : c;
        if (side === 0) { x0 = 70; x1 = 930; }
        b.cap.push({ g: new THREE.BoxGeometry(x1 - x0, 70, 52), p: [(x0 + x1) / 2 - px, Y(y + 35), 26] });
        [118, 882].forEach(function (pxx) {
          if ((side < 0 && pxx > c) || (side > 0 && pxx < c)) return;
          b.pin.push({ g: new THREE.CylinderGeometry(11, 11, 5, 18), p: [pxx - px, Y(y + 35), 54.5], r: [Math.PI / 2, 0, 0] });
          b.pdot.push({ g: new THREE.CylinderGeometry(3.5, 3.5, 5, 10), p: [pxx - px, Y(y + 35), 58], r: [Math.PI / 2, 0, 0] });
        });
      });
    }
    /* intact block */
    var whole = new THREE.Group(); root.add(whole); var b = bucket();
    slab(whole, { full: polyW, border: polyW, hole: holeW }, 0, b); marks(b, 0, 0); caps(b, 0, 0); flush(whole, b);
    /* halves */
    var halves = new THREE.Group(); halves.name = 'halves'; root.add(halves);
    var hl = new THREE.Group(); hl.name = 'halfL'; hl.position.x = PX[0]; halves.add(hl);
    var hr = new THREE.Group(); hr.name = 'halfR'; hr.position.x = PX[1]; halves.add(hr);
    b = bucket(); slab(hl, { full: polyL, border: borL }, PX[0], b); marks(b, PX[0], -1); caps(b, PX[0], -1); flush(hl, b);
    b = bucket(); slab(hr, { full: polyR, border: borR }, PX[1], b); marks(b, PX[1], 1); caps(b, PX[1], 1); flush(hr, b);
    halves.visible = false;
    /* emissive blue core below the slab (fill only; the 2D radial supplies its tone) */
    var core = T.mesh(new THREE.PlaneGeometry(1, 1070), PR.core); core.position.set(500, Y(700), -250); core.visible = false; root.add(core);

    /* hinge + slide clip (p*K): rise about the outer long edge toward the viewer so the fracture faces turn to the blue light */
    var tt = [], vL = [], vR = [], qL = [], qR = [], q = new THREE.Quaternion(), ay = new THREE.Vector3(0, 1, 0), n, dxs = [], angs = [];
    for (n = 0; n <= 100; n++) {
      var p = n / 100, e = E.outCubic(range(p, .35, .8)), lv = E.inCubic(range(p, .8, 1)), dx = 220 * e + 950 * lv, a = (40 * e + 14 * lv) * D2R;
      tt.push(p * K); vL.push(PX[0] - dx, 0, 0); vR.push(PX[1] + dx, 0, 0); dxs.push(dx); angs.push(a);
      q.setFromAxisAngle(ay, -a); qL.push(q.x, q.y, q.z, q.w); q.setFromAxisAngle(ay, a); qR.push(q.x, q.y, q.z, q.w);
    }
    var clip = new THREE.AnimationClip('split', K, [
      new THREE.VectorKeyframeTrack('halfL.position', tt, vL), new THREE.QuaternionKeyframeTrack('halfL.quaternion', tt, qL),
      new THREE.VectorKeyframeTrack('halfR.position', tt, vR), new THREE.QuaternionKeyframeTrack('halfR.quaternion', tt, qR)]);
    var mixer = T.player(halves, clip);

    /* splinters: InstancedMesh of thin wedges, ballistic + tumbling, p-driven tau (deterministic) */
    var wsh = new THREE.Shape([new THREE.Vector2(0, -.16), new THREE.Vector2(1, 0), new THREE.Vector2(0, .16)]);
    var shards = T.instanced(new THREE.ExtrudeGeometry(wsh, { depth: .05, bevelEnabled: false }), NSH, PR.shard); fxg.add(shards);
    var sr = MK.rng(4242), SH = [];
    for (i = 0; i < NSH; i++) {
      var qi = CR[1 + Math.floor(sr() * (CR.length - 2))], side = sr() < .5 ? -1 : 1, ang = (side < 0 ? Math.PI : 0) + (sr() - .5) * 1.7, sp = 520 * (.35 + .65 * sr());
      var axis = new THREE.Vector3(sr() - .5, sr() - .5, sr() - .5).normalize();
      SH.push({ x: qi[0] + side * 8, y: qi[1], vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vz: 80 + sr() * 260, L: 26 + sr() * 40, w: 3 + sr() * 8, axis: axis, q0: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sr() * 6.28), life: LIFE * (.7 + .3 * sr()) });
    }
    var dm = new THREE.Object3D(), qs = new THREE.Quaternion();

    return {
      gen: T.gen, root: root, fx: fxg, CR: CR, camera: T.camera(), cx: cx,
      /* o = {p} : returns {dx, a (rad)} = current slide and hinge angle (for the 2D gap) */
      update: function (o) {
        var p = MK.clamp(o.p || 0, 0, 1), split = p >= .35, tau = (p - .35) * 3;
        whole.visible = !split; halves.visible = split; core.visible = split;
        mixer.setTime(p * K);
        var e = E.outCubic(range(p, .35, .8)), lv = E.inCubic(range(p, .8, 1)), dx = 220 * e + 950 * lv, a = (40 * e + 14 * lv) * D2R, cs = Math.cos(a);
        /* blue light in the gap + core plane spanning the (bottom-edge) gap */
        var lx = 90 + (440 - 0) * 0, gl = PX[0] - dx + (CR[0][0] - PX[0]) * cs, gr = PX[1] + dx + (CR[0][0] - PX[1]) * cs;
        var mid = (gl + gr) / 2, wid = Math.max(60, (gr - gl) + 200);
        core.position.x = mid; core.scale.x = wid;
        MK.three.setPoint([mid, Y(700), -70], 480, split ? 2.2 : 0);
        for (i = 0; i < NSH; i++) {
          var s = SH[i], tq = tau;
          if (!split || tq < 0 || tq > s.life) { dm.position.set(0, 0, -1e4); dm.scale.set(1e-4, 1e-4, 1e-4); dm.quaternion.identity(); }
          else {
            var x = s.x + s.vx * tq, y = s.y + s.vy * tq + 300 * tq * tq, z = 64 + s.vz * tq - 250 * tq * tq, sc = s.L * (1 - E.smoothstep(range(tq, s.life * .6, s.life)));
            qs.setFromAxisAngle(s.axis, tq * (5 + s.w)); dm.quaternion.copy(qs).multiply(s.q0);
            dm.position.set(x, Y(y), z); dm.scale.set(sc, sc * 1.1, sc * 1.1);
          }
          dm.updateMatrix(); shards.setMatrixAt(i, dm.matrix);
        }
        shards.instanceMatrix.needsUpdate = true;
        return { dx: dx, a: a, cs: cs };
      },
      renderMain: function (P) { return T.render(root, this.camera, P); },
      renderShards: function (P) { return T.render(fxg, this.camera, P); },
      dispose: function () { T.dispose(root); T.dispose(fxg); }
    };
  }

  var cache = null;
  art.splitLive = function () {
    if (!MK.three || !MK.three.ok) return null;
    try {
      if (!cache || cache.gen !== MK.three.gen) { if (cache) cache.dispose(); cache = build(); }
      return cache;
    } catch (e) { MK.err(e, 'splitLive'); cache = null; return null; }
  };
})();
