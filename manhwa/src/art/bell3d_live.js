/* art/bell3d_live.js — LIVE three.js version of the s07 pavilion + 범종 bell + striker log (MK.three, see ENGINE.md "Live 3D").
   Geometry is a 1:1 port of build/worlds/pavilion/pavilion.js (same dimensions in the 1000x1400 world; three y = 1400 - y), so the
   당좌 medal stays at ~(562,818) = MK.art.PAV.medal and the log tip meets it at theta = 0. Print settings follow build/worlds/pavilion.print.json.
   Groups: pavilion (void, rafters, crossbeam, studs, pillars) / bell (body, bands, panels, knobs, medal, dragon loop, sound tube, rod, pin) /
   log (ropes + rings, brackets, body, bands, domed tip; pivot = rope anchors).
   var live = MK.art.bellLive();  live.update({th, tauI, p, t, yaw, flash}) ; live.render(P) -> true | false (three unavailable -> use the D1 sprites). */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {}, D2R = Math.PI / 180, W = 1000, H = 1400;
  var Y = function (y) { return H - y; };
  var L = 630, A1 = 760, A2 = 1000, TIP = 570, LEN = 1200, RAD = 46, ROPE_Y0 = 172, HANG_Y = 190, LOGZ = 250, OW = 2.8;
  var PROFILE = [[0, 0], [110, 2], [150, 22], [171, 70], [177, 200], [185, 420], [199, 620], [209, 700], [214, 754]];

  /* print settings per class (pavilion.print.json: tone [t0,t1], hatch style/angle, fill) ; alb = neutral albedo of the lit pass */
  var PR = {
    void: { fill: 'ink', t0: 0, t1: 0 },
    pillar: { fill: 'paper', h: 'grain', a: 0, t0: .68, t1: .97, alb: .78, dbl: 1, o: OW },
    beam: { fill: 'paper', h: 'grain', a: 90, t0: .65, t1: .95, alb: .81, o: OW },
    rafter: { fill: 'paper', h: 'cross', a: 40, t0: .25, t1: .8, alb: .78 },
    body: { fill: 'paper', h: 'line', a: 0, t0: .15, t1: .96, gamma: .8, alb: .81, vib: 1, dbl: 1, o: OW },
    band: { fill: 'ink', t0: 0, t1: 0, vib: 1 },
    knob: { fill: 'paper', h: 'dots', a: 0, t0: 0, t1: .3, alb: .83, vib: 1, o: 1.5 },
    panel: { fill: 'paper', h: 'line', a: 90, t0: .55, t1: .92, alb: .78, vib: 1, dbl: 1 },
    medal: { fill: 'paper', h: 'line', a: 0, t0: .05, t1: .75, alb: .81, vib: 1, o: 2 },
    petal: { fill: 'paper', h: 'cross', a: 45, t0: 0, t1: .5, alb: .85, vib: 1 },
    dragon: { fill: 'ink', t0: 0, t1: 0, vib: 1 },
    tube: { fill: 'paper', h: 'line', a: 0, t0: .4, t1: .9, alb: .77, vib: 1, o: 2 },
    rod: { fill: 'paper', h: 'line', a: 0, t0: .4, t1: .9, alb: .77, o: 2 },
    pin: { fill: 'ink', t0: 0, t1: 0 },
    log: { fill: 'paper', h: 'grain', a: 90, t0: .35, t1: .95, alb: .78, o: OW },
    rope: { fill: 'ink', t0: 0, t1: 0 },
    bracket: { fill: 'ink', t0: 0, t1: 0 },
    twist: { fill: 'paper', t0: 0, t1: 0, o: 1.6 }
  };

  function build() {
    var THREE = window.THREE, T = MK.three, root = new THREE.Group();
    function bakeInto(parent, byClass) {
      Object.keys(byClass).forEach(function (cls) { if (byClass[cls].length) parent.add(T.bake(byClass[cls], PR[cls])); });
    }
    function bucket() { var o = {}; Object.keys(PR).forEach(function (k) { o[k] = []; }); return o; }
    function addp(b, cls, g, x, y, z, r, s, m) { b[cls].push({ g: g, p: [x, y, z], r: r, s: s, m: m }); }

    /* ---------- pavilion ---------- */
    var pav = new THREE.Group(); pav.position.set(500, 0, 0); root.add(pav);          // yaw pivot x = 500
    var b = bucket(), X0 = -500, i, k, row;
    addp(b, 'void', new THREE.PlaneGeometry(9000, 3000), 500 + X0, Y(-1300), -400);   // dark roof void (extends far above the frame)
    for (row = 0; row < 2; row++) for (i = -12; i < 29; i++) {
      var rx = i * 62 + (row ? 31 : 0) + X0, ry = row ? 34 : 92, rr = 26;
      addp(b, 'rafter', new THREE.CylinderGeometry(rr, rr, 120, 16, 1, true), rx, Y(ry), -40, [Math.PI / 2, 0, 0]);
      addp(b, 'rafter', new THREE.SphereGeometry(rr, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2), rx, Y(ry), 22, [Math.PI / 2, 0, 0], [1, .45, 1]);
    }
    addp(b, 'beam', new THREE.BoxGeometry(W * 6, 70, 90), 500 + X0, Y(155), 0);
    addp(b, 'beam', new THREE.BoxGeometry(W * 6, 12, 20), 500 + X0, Y(120), 52);
    for (var sx = -1650; sx < 2800; sx += 110) addp(b, 'beam', new THREE.SphereGeometry(8, 12, 8), sx + X0, Y(155), 50, null, [1, 1, .5]);
    [-1102, -34, 1034, 2102].forEach(function (cx) {
      var pts = []; for (i = 0; i <= 12; i++) { var u = i / 12, yd = 190 + 1000 * u; pts.push(new THREE.Vector2(96 + 12 * Math.sin(Math.PI * Math.min(1, u * .9 + .1)) - 4 * u, Y(yd))); }
      addp(b, 'pillar', new THREE.LatheGeometry(pts, 64), cx + X0, 0, 0);
      addp(b, 'pillar', new THREE.CylinderGeometry(118, 124, 44, 48), cx + X0, Y(1168), 0);
    });
    bakeInto(pav, b);
    /* ---------- bell ---------- */
    var pivot = new THREE.Group(); pivot.name = 'bellPivot'; pivot.position.set(460, Y(HANG_Y), 0); root.add(pivot);   // hang point (460,190)
    var yawG = new THREE.Group(); pivot.add(yawG);
    var bell = new THREE.Group(); bell.position.set(0, Y(300) - Y(HANG_Y), 0); yawG.add(bell);
    var sp = new THREE.SplineCurve(PROFILE.map(function (p) { return new THREE.Vector2(p[0], p[1]); })), SM = sp.getPoints(160);
    function R(yd) {
      if (yd <= 0) return SM[0].x;
      for (var j = 1; j < SM.length; j++) if (SM[j].y >= yd) { var a = SM[j - 1], c = SM[j], u = (yd - a.y) / Math.max(1e-6, c.y - a.y); return a.x + (c.x - a.x) * u; }
      return SM[SM.length - 1].x;
    }
    var lat = function (pts, seg, ps, pl) { return new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], -p[1]); }), seg, ps, pl); };
    b = bucket();
    var body = SM.filter(function (p, j) { return j % 2 === 0 || j === SM.length - 1; }).map(function (p) { return [p.x, p.y]; }); body.push([205, 758], [190, 758]);
    addp(b, 'body', lat(body, 96), 0, 0, 0);
    [[30, 90, 9], [690, 740, 8]].forEach(function (bd) {
      var y0 = bd[0], y1 = bd[1], rs = bd[2], pts = [], j;
      for (j = 0; j <= 14; j++) { var u = j / 14, yd = y0 + (y1 - y0) * u; pts.push([R(yd) + rs * Math.pow(Math.sin(Math.PI * u), .45), yd]); }
      addp(b, 'band', lat(pts, 96), 0, 0, 0);
      [y0 + 5, y1 - 5].forEach(function (yy) { addp(b, 'band', new THREE.TorusGeometry(R(yy) + rs - 1, 2.6, 6, 96), 0, -yy, 0, [Math.PI / 2, 0, 0]); });
    });
    [-40, -4].forEach(function (deg) {
      var c = deg * D2R, hw = 50 / 177, y0 = 110, y1 = 220, rz = 7, ii, jj;
      addp(b, 'panel', lat([[R(y0), y0], [R(y0) + rz, y0], [R(y1) + rz, y1], [R(y1), y1]], 12, c - hw, hw * 2), 0, 0, 0);
      for (ii = 0; ii < 3; ii++) for (jj = 0; jj < 3; jj++) {
        var ph = c + (ii - 1) * 30 / 177, yy = y0 + 20 + jj * 35, r = R(yy) + rz;
        addp(b, 'knob', new THREE.SphereGeometry(10, 20, 14), r * Math.sin(ph), -yy, r * Math.cos(ph), [0, ph, 0], [1, 1, .8]);
      }
    });
    /* 당좌 lotus medallion at screen angle +36 deg, y = 520 (the strike point) */
    var mc = new THREE.Object3D(), mph = 36 * D2R, my = 520, mbase = R(my) - 14;
    mc.position.set(mbase * Math.sin(mph), -my, mbase * Math.cos(mph)); mc.rotation.y = mph; mc.updateMatrix(); bell.add(mc);
    addp(b, 'medal', new THREE.SphereGeometry(66, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0, 0, [Math.PI / 2, 0, 0], [1, .34, 1], mc);
    addp(b, 'medal', new THREE.TorusGeometry(59, 3.6, 10, 72), 0, 0, 10, null, null, mc);
    for (k = 0; k < 8; k++) { var pa = k * Math.PI / 4; addp(b, 'petal', new THREE.SphereGeometry(1, 20, 12), Math.cos(pa) * 38, Math.sin(pa) * 38, 17, [0, 0, pa + Math.PI / 2], [13, 25, 5], mc); }
    addp(b, 'medal', new THREE.SphereGeometry(1, 28, 16), 0, 0, 21, null, [19, 19, 7], mc);
    for (k = 0; k < 6; k++) addp(b, 'knob', new THREE.SphereGeometry(2.6, 8, 6), Math.cos(k * 1.047) * 9, Math.sin(k * 1.047) * 9, 28, null, null, mc);
    /* dragon loop (용뉴) + sound tube (음통) */
    var dp = [[-72, 6], [-60, -26], [-22, -34], [8, -62], [46, -54], [62, -22], [56, 6]].map(function (p) { return new THREE.Vector3(p[0], -p[1], 0); });
    addp(b, 'dragon', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dp), 64, 13, 12, false), 0, 0, 0);
    addp(b, 'dragon', new THREE.SphereGeometry(1, 20, 14), -76, -4, 6, [0, 0, .5], [20, 13, 13]);
    addp(b, 'dragon', new THREE.SphereGeometry(12, 16, 12), 8, 64, 0);
    addp(b, 'tube', new THREE.CylinderGeometry(19, 22, 82, 28), 81, 33, -4);
    [60, 24].forEach(function (yy) { addp(b, 'band', new THREE.TorusGeometry(21.5, 3.2, 8, 40), 81, yy, -4, [Math.PI / 2, 0, 0]); });
    bakeInto(bell, b);
    /* rod + pin up to the beam (hang point) — part of the swinging unit, no surface vibration */
    b = bucket();
    addp(b, 'rod', new THREE.CylinderGeometry(9, 9, 70, 16), 6, Y(220) - Y(HANG_Y), 0);
    addp(b, 'pin', new THREE.CylinderGeometry(14, 14, 16, 24), 0, 0, 40, [Math.PI / 2, 0, 0]);
    bakeInto(yawG, b);
    var medalAnchor = new THREE.Object3D(); medalAnchor.position.copy(mc.position); bell.add(medalAnchor);

    /* ---------- log (pivot = rope anchors; built at theta = 0, moved per frame) ---------- */
    var logG = new THREE.Group(); logG.position.z = LOGZ; root.add(logG);
    var logM = new THREE.Group(); logG.add(logM);
    var yc0 = HANG_Y + L, tipx0 = TIP, ropes = [], len0 = (HANG_Y + L - RAD * .2) - ROPE_Y0;
    b = bucket();
    addp(b, 'log', new THREE.CylinderGeometry(RAD, RAD * 1.06, LEN, 40), tipx0 + LEN / 2, Y(yc0), 0, [0, 0, Math.PI / 2]);
    addp(b, 'log', new THREE.SphereGeometry(RAD, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), tipx0, Y(yc0), 0, [0, 0, Math.PI / 2], [.5, 1, 1]);
    for (k = 0; k < 3; k++) addp(b, 'twist', new THREE.TorusGeometry(RAD + 1, 2.4, 6, 40), tipx0 + 90 + k * 230, Y(yc0), 0, [0, Math.PI / 2, 0]);
    var bkt = bucket();
    [A1, A2].forEach(function (ax) {
      addp(b, 'bracket', new THREE.BoxGeometry(30, RAD * 2 + 10, RAD * 2 + 10), ax, Y(yc0), 0);
      for (k = 0; k < 4; k++) addp(b, 'twist', new THREE.BoxGeometry(24, 2.6, RAD * 2 + 14), ax, Y(yc0 - RAD + 12 + k * 22), 0, [0, 0, .25]);
      addp(bkt, 'bracket', new THREE.SphereGeometry(10, 12, 8), ax, Y(ROPE_Y0), 14);       // knot at the beam (static)
      var holder = new THREE.Group(); holder.position.z = 12; logG.add(holder);
      var rb = bucket();
      addp(rb, 'rope', new THREE.CylinderGeometry(8, 8, len0, 12), 0, 0, 0);
      for (var kk = 14; kk < len0 - 10; kk += 15) addp(rb, 'twist', new THREE.TorusGeometry(8.4, 1.3, 6, 14), 0, len0 / 2 - kk, 0, [Math.PI / 2, 0, 0]);
      bakeInto(holder, rb); ropes.push({ ax: ax, h: holder });
    });
    bakeInto(logM, b); bakeInto(logG, bkt);

    /* ---------- animation clips (skill: AnimationClip + KeyframeTrack, AnimationMixer.setTime = scrubbable / capture-safe) ---------- */
    var zq = new THREE.Quaternion(), zax = new THREE.Vector3(0, 0, 1), times = [], vals = [], n;
    for (n = 0; n <= 120; n++) {                                  // bell sway after impact: damped oscillation baked into keys (30 fps, 4 s)
      var tt = n / 30, sw = 2.5 * D2R * Math.exp(-tt / .9) * Math.sin(tt * Math.PI * 2 * .9);
      zq.setFromAxisAngle(zax, -sw); times.push(tt); vals.push(zq.x, zq.y, zq.z, zq.w);   // 2D rot is clockwise on a y-down screen -> -z in y-up three
    }
    var swayClip = new THREE.AnimationClip('bellSway', 4, [new THREE.QuaternionKeyframeTrack('.quaternion', times, vals)]); swayClip.optimize();
    var ct = [], cv = [];
    for (n = 0; n <= 12; n++) { var u4 = n / 12; ct.push(u4 * 4); cv.push(1 + .035 * u4 * u4 * (3 - 2 * u4)); }   // slow push-in over the scene (mixer time = p * 4)
    var camClip = new THREE.AnimationClip('camDolly', 4, [new THREE.NumberKeyframeTrack('.zoom', ct, cv)]);
    var camera = T.camera(); camera.userData.anchor = [500, 1190];      // zoom about the floor line so 2D floor / pillar bases stay put
    var mixSway = T.player(pivot, swayClip), mixCam = T.player(camera, camClip);

    root.updateMatrixWorld(true);
    var v3 = new THREE.Vector3(), restMedal = medalAnchor.getWorldPosition(new THREE.Vector3()).clone();
    return {
      gen: T.gen, root: root, pav: pav, bell: bell, yawG: yawG, pivot: pivot, logG: logG, logM: logM, ropes: ropes, camera: camera, medalRest: restMedal,
      /* o = {th: rope angle (rad), tauI: seconds since impact (<0 = none), p: scene progress 0..1, t: seconds, yaw: rad (0 in capture), sag}  */
      update: function (o) {
        var th = o.th || 0, tau = o.tauI == null ? -1 : o.tauI, t = o.t || 0, yaw = o.yaw || 0;
        mixSway.setTime(Math.max(0, tau)); mixCam.setTime(MK.clamp(o.p || 0, 0, 1) * 4);
        yawG.rotation.y = yaw; pav.rotation.y = yaw * .6;
        root.updateMatrixWorld(true);
        var mw = medalAnchor.getWorldPosition(v3), shift = restMedal.x - mw.x;     // keep the log tip on the (yawed) medal
        if (!(Math.abs(shift) < 40)) shift = 0;
        var sag = 1.6 * (1 + Math.sin(t * 1.7)) * (1 - MK.clamp(th / (28 * D2R), 0, 1)) * (tau < 0 ? 1 : .3), sn = Math.sin(th), cs = Math.cos(th);
        var twist = (.035 * Math.sin(t * 1.3 + 1) + (tau >= 0 ? .09 * Math.exp(-tau / .5) * Math.sin(tau * 11) : 0));
        logM.position.set(L * sn + shift, L * (1 - cs) - sag, 0); logM.rotation.y = twist; logM.rotation.x = .02 * Math.sin(t * 2.1);
        ropes.forEach(function (r) {
          var x0 = r.ax, y0 = ROPE_Y0, x1 = r.ax + L * sn + shift, y1 = HANG_Y + L * cs - RAD * .2 + sag, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
          r.h.position.set((x0 + x1) / 2, Y((y0 + y1) / 2), 12); r.h.rotation.z = Math.atan2(dx, dy); r.h.rotation.y = twist * .5; r.h.scale.y = len / len0;
        });
        root.updateMatrixWorld(true);
        var mw2 = medalAnchor.getWorldPosition(v3), ax = yawG.getWorldPosition(new THREE.Vector3());
        T.ripple(tau, tau >= 0 ? 3 : 0, [mw2.x, mw2.y, mw2.z], [ax.x, ax.z]);   // amp ~3 units * e^(-tau/.9) in the shader
        T.flash(tau >= 0 ? Math.pow(MK.clamp(1 - tau / .2, 0, 1), 2) : 0);
        return tau >= 0 ? 2.5 * D2R * Math.exp(-tau / .9) * Math.sin(tau * Math.PI * 2 * .9) : 0;     // sway angle (same as the clip), for 2D accents
      },
      render: function (P) { return T.render(root, camera, P); },
      dispose: function () { T.dispose(root); }
    };
  }

  /* MK.art.bellLive() -> cached instance (rebuilt after a WebGL context restore); null when three.js is unavailable */
  var cache = null;
  art.bellLive = function () {
    if (!MK.three || !MK.three.ok) return null;
    try {
      if (!cache || cache.gen !== MK.three.gen) { if (cache) cache.dispose(); cache = build(); }
      return cache;
    } catch (e) { MK.err(e, 'bellLive'); cache = null; return null; }
  };
})();
