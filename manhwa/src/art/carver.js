/* art/carver.js — the woodblock carver (각수): young woman, BACK VIEW, hanbok. MK.art.carver(P,x,y,size,s)
   Rig-driven (MK.rig, assets/rig/carver): every body part is a rig part (chima / jeogori / sleeves up+lo / braid chain / daenggi / neck / head),
   drawn through MK.rig.draw with a per-part callback. With no rig options the rest state reproduces the v1 drawing. */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {}, R = MK.rig;
  var TAU = Math.PI * 2;

  /* s = {pose:'stand'|'seat', t:seconds (ribbon phase), arm:0..1 (seat: legacy carving cycle), shadow:bool,
          rig: state from MK.rig.eval('carver',..) | action:{scene,clock,t,pose,add} (evaluated here) | mocap:{clip,phase,weight}}
     stand: (x,y)=feet centre, size=height.  seat: (x,y)=bottom centre of visible figure (cut by the desk), size=head-top to bottom */
  art.carver = function (P, x, y, size, s) {
    s = s || {}; var sh = !!s.shadow, ow = 3 / size, t = s.t || 0, phase = TAU * 1.4 * t, seat = s.pose === 'seat', pre = seat ? 'seat_' : 'stand_';
    var r = R.resolve('carver', seat ? 'seat' : 'stand', s);
    if (!r) {
      if (seat && s.arm != null) r = R.eval('carver', { variant: 'seat', chain: false, add: { 'seat_sleeve_r_lo.rotation': -11 * Math.sin(TAU * s.arm) } });
      else r = R.rest('carver');
    }
    function poly(p, st) { if (sh) P.toneOnly(function () { P.poly(p, { c: 'ink', t: .9 }); }); else P.poly(p, st); }
    function path(d, st) { if (sh) P.toneOnly(function () { P.path(d, { c: 'ink', t: .9 }); }); else P.path(d, st); }
    function taper(p, w, st, n) { if (sh) P.toneOnly(function () { P.taper(p, w, { c: 'ink', t: .9 }, n); }); else P.taper(p, w, st, n); }
    function circle(cx, cy, rr, st) { if (sh) P.toneOnly(function () { P.circle(cx, cy, rr, { c: 'ink', t: .9 }); }); else P.circle(cx, cy, rr, st); }
    function ellipse(cx, cy, rx, ry, st, rot) { if (sh) P.toneOnly(function () { P.ellipse(cx, cy, rx, ry, { c: 'ink', t: .9 }, rot); }); else P.ellipse(cx, cy, rx, ry, st, rot); }
    function stroke(p, o) { if (!sh) P.stroke(p, o); }
    var OUT = { w: ow, c: 'ink' };
    var INK = { c: 'ink', t: 0 };
    function pt(part, p) { return r.pt(pre + part, p); }
    function pts(part, arr) { return r.pts(pre + part, arr); }
    function ang(part) { return r.angle(pre + part); }
    function pathD(segs) {       // segs: ['M',p] ['C',p,p,p] ['L',p] (already mapped) -> svg path
      return segs.map(function (g) { return g[0] + g.slice(1).map(function (p) { return p[0].toFixed(4) + ' ' + p[1].toFixed(4); }).join(' '); }).join(' ') + ' Z';
    }

    P.push(); P.translate(x, y); P.scale(size);

    /* wide hanbok sleeve with rounded 배래 underside; hands hidden (dark cuff mouth at the end) */
    function sleeve(ps, w0, w1, bulge, tone) {
      taper(ps, function (u) { return w0 + (w1 - w0) * u + bulge * Math.sin(Math.min(1, u * 1.25) * Math.PI * .5) * (1 - Math.pow(u, 6)); },
        { c: 'paper', t: tone, a: 0, stroke: OUT }, 8);
      var e = ps[ps.length - 1], q = ps[ps.length - 2], an = Math.atan2(e[1] - q[1], e[0] - q[0]);
      ellipse(e[0], e[1], w1 * .24, w1 * .5, INK, an);
    }
    /* daenggi: small bow + two fluttering ribbon tails (1.4 Hz), hung from the last braid segment */
    function daenggi(kx, ky, len, wid) {
      var part = 'daenggi', a = ang(part);
      [-1, 1].forEach(function (sx, i) {
        var base = pts(part, [[kx + sx * wid * .3, ky], [kx + sx * wid * .9, ky + len * .5], [kx + sx * wid * 1.5, ky + len]]);
        var ps = MK.fx.ribbon(base, wid * 2, phase + i * 1.3, wid * 2.4, 5);
        taper(ps, [wid * 1.5, wid * 1.0], { c: 'blue', t: 0, stroke: OUT }, 6);
      });
      [-1, 1].forEach(function (sx) {
        var c = pt(part, [kx + sx * wid * 1.5, ky + wid * .2]);
        ellipse(c[0], c[1], wid * 1.9, wid * 1.05, { c: 'blue', t: 0, stroke: OUT }, sx * .5 + a);
      });
      var k = pt(part, [kx, ky + wid * .2]); circle(k[0], k[1], wid * .9, { c: 'blue', t: 0, stroke: OUT });
    }
    /* ink braid: solid tapered rope through the 4 chain segments; paper chevron marks */
    function braid(bp, w0, w1, step) {
      var ps = [pt('braid_0', bp[0]), pt('braid_0', bp[1]), pt('braid_1', bp[2]), pt('braid_2', bp[3]), pt('braid_3', bp[4])];
      taper(ps, [w0, w1], INK, 8);
      var sm = P.smooth(ps, 8, false), n = sm.length, i, y0 = ps[0][1] + .015, y1 = ps[4][1] - .01;
      for (var yy = y0; yy < y1; yy += step) {
        var u = (yy - y0) / (y1 - y0), wd = (w0 + (w1 - w0) * u) * .26, cx = 0, best = 9, k = 0;
        for (i = 0; i < n; i++) { var d = Math.abs(sm[i][1] - yy); if (d < best) { best = d; cx = sm[i][0]; k = i; } }
        var q = sm[Math.min(n - 1, k + 1)], q0 = sm[Math.max(0, k - 1)], tl = Math.atan2(q[1] - q0[1], q[0] - q0[0]) - Math.PI / 2;   // follow the rope tilt
        var cs = Math.cos(tl), sn = Math.sin(tl);
        stroke([[cx - wd * cs, yy - wd * sn], [cx + wd * .9 * sn, yy + wd * .9 * cs], [cx + wd * cs, yy + wd * sn]], { w: ow * .55, c: 'paper' });
      }
    }
    function foldGrad(w, k0, k1) {
      var stops = [], n = 9, i;
      for (i = 0; i <= n; i++) stops.push([i / n, i % 2 ? k0 : k1 + (i === 0 || i === n ? .05 : 0)]);
      return P.lin(-w, 0, w, 0, stops);
    }
    /* head: hair mass ellipse + hair cap + parting. tilt (look up) lifts/stretches it, yaw (turn) shows a paper cheek sliver on that side */
    function head(cx, cy, rx, ry, capPts, partPts) {
      var hp = 'head', tilt = r.get(pre + hp, 'tilt'), yaw = r.get(pre + hp, 'yaw'), a = ang(hp), c = pt(hp, [cx + yaw * rx * .10, cy - tilt * ry * .035]);
      ellipse(c[0], c[1], rx * (1 - Math.abs(yaw) * .05), ry * (1 + tilt * .05), INK, a);
      poly(pts(hp, capPts.map(function (p) { return [p[0] + yaw * rx * .10, p[1] - tilt * ry * .035]; })), INK);
      var pp = partPts.map(function (p) { return [p[0] + yaw * rx * .22, p[1] - tilt * ry * .05]; });
      stroke(pts(hp, pp), { w: ow * (seat ? .75 : .6), c: 'paper' });
      if (Math.abs(yaw) > .15) {         // cheek + ear edge peeking past the hair on the turned side
        var sg = yaw > 0 ? 1 : -1, k = Math.min(1, (Math.abs(yaw) - .15) / .6), q = pt(hp, [cx + sg * rx * .92, cy + ry * .12]);
        ellipse(q[0], q[1], rx * .17 * k + .001, ry * .42 * k + .001, { c: 'paper', t: .04, stroke: OUT }, a + sg * .22);
      }
    }

    function drawPart(id, st, part) {
      var k = id.slice(pre.length), sx, i, u;
      if (k === 'chima') {
        if (seat) {
          path(pathD([['M', pt(k, [-.20, -.36])], ['C', pt(k, [-.24, -.24]), pt(k, [-.36, -.12]), pt(k, [-.42, 0])], ['L', pt(k, [.42, 0])],
            ['C', pt(k, [.36, -.12]), pt(k, [.24, -.24]), pt(k, [.20, -.36])]]),
            { c: 'paper', t: P.lin(-.42, 0, .42, 0, [[0, .45], [.1, .15], [.2, .42], [.32, .15], [.44, .4], [.56, .16], [.68, .42], [.8, .15], [.9, .4], [1, .42]]), a: 0, stroke: OUT });
          [-.8, -.55, -.3, 0, .3, .55, .8].forEach(function (f) { stroke(pts(k, [[f * .19, -.34], [f * .3, -.17], [f * .41, -.01]]), { w: ow * .55, c: 'ink' }); });
        } else {
          /* deforming hem: lift per side (mocap leg lift), shift, flare; weight grows toward the hem */
          var hP = st.u(id, 'hemP'), hN = st.u(id, 'hemN'), hs = st.u(id, 'hem'), fl = st.get(id, 'flare');
          var D = function (p) {
            var w = Math.max(0, Math.min(1, (p[1] + .745) / .731)); w *= w; var kk = Math.max(0, Math.min(1, (p[0] / .34 + 1) / 2));
            return pt(k, [p[0] * (1 + fl * w) + hs * w, p[1] - (hN * (1 - kk) + hP * kk) * w]);
          };
          path(pathD([['M', D([-.082, -.745])], ['C', D([-.10, -.52]), D([-.25, -.24]), D([-.34, -.014])], ['C', D([-.17, .012]), D([.17, .012]), D([.34, -.014])],
            ['C', D([.25, -.24]), D([.10, -.52]), D([.082, -.745])]]), { c: 'paper', t: foldGrad(.34, .13, .42), a: 0, stroke: OUT });
          [-.86, -.66, -.46, -.26, -.06, .14, .34, .54, .74, .9].forEach(function (f) {
            stroke([D([f * .082, -.73]), D([f * .17, -.40]), D([f * .33, -.04])], { w: ow * .5, c: 'ink', t: .3 });
          });
          stroke([D([-.335, -.02]), D([-.17, .0]), D([0, .004]), D([.17, .0]), D([.335, -.02])], { w: ow * 1.1, c: 'ink' });   // soft hem
        }
      } else if (k === 'torso') {
        if (seat) {
          poly(pts(k, [[-.03, -.80], [.03, -.80], [.19, -.76], [.215, -.60], [.225, -.36], [.10, -.335], [0, -.325], [-.10, -.335], [-.225, -.36], [-.215, -.60], [-.19, -.76]]),
            { c: 'paper', t: .1, a: 0, stroke: OUT });
          stroke(pts(k, [[0, -.79], [0, -.33]]), { w: ow * .8 });
          stroke(pts(k, [[-.19, -.75], [-.10, -.69], [0, -.675], [.10, -.69], [.19, -.75]]), { w: ow * .9 });
        } else {
          poly(pts(k, [[-.022, -.862], [.022, -.862], [.09, -.84], [.098, -.77], [.104, -.715], [.05, -.70], [0, -.696], [-.05, -.70], [-.104, -.715], [-.098, -.77], [-.09, -.84]]),
            { c: 'paper', t: .12, a: 0, stroke: OUT });
          stroke(pts(k, [[0, -.86], [0, -.70]]), { w: ow * .8 });
          stroke(pts(k, [[-.09, -.835], [-.04, -.805], [0, -.80], [.04, -.805], [.09, -.835]]), { w: ow * .7 });
        }
      } else if (k === 'sleeve_l_up' || k === 'sleeve_r_up') {
        sx = k === 'sleeve_l_up' ? -1 : 1; var lo = 'sleeve_' + (sx < 0 ? 'l' : 'r') + '_lo', up = k;
        if (seat) {
          if (sx < 0) sleeve([pt(up, [-.17, -.74]), pt(lo, [-.31, -.50]), pt(lo, [-.27, -.16])], .12, .13, .08, .22);
          else sleeve([pt(up, [.17, -.74]), pt(lo, [.33, -.50]), pt(lo, [.23, -.22]), pt(lo, [.15, -.14])], .12, .125, .08, .22);
        } else {
          var sw = Math.sin(phase * .25 + (sx < 0 ? 0 : 1)) * .004;
          sleeve([pt(up, [sx * .092, -.835]), pt(lo, [sx * .17, -.76 + sw]), pt(lo, [sx * .205, -.65])], .068, .088, .06, .24);
        }
      } else if (k === 'braid_0') {
        if (seat) braid([[0, -.815], [.012, -.66], [-.008, -.52], [.008, -.42], [0, -.33]], .052, .034, .026);
        else braid([[0, -.885], [.007, -.80], [-.004, -.72], [.004, -.66], [0, -.62]], .034, .022, .019);
      } else if (k === 'daenggi') {
        if (seat) daenggi(0, -.325, .21, .015); else daenggi(0, -.612, .17, .0095);
      } else if (k === 'neck') {
        var tl = r.get(pre + 'head', 'tilt');
        if (seat) poly(pts(k, [[-.03, -.835], [.03, -.835], [.034, -.77], [-.034, -.77]]), { c: 'paper', t: 0, stroke: OUT });
        else poly(pts(k, [[-.02, -.90], [.02, -.90], [.024 + .002 * tl, -.855], [-.024 - .002 * tl, -.855]]), { c: 'paper', t: 0, stroke: OUT });
      } else if (k === 'head') {
        if (seat) head(0, -.90, .092, .105, [[-.085, -.855], [-.03, -.80], [0, -.775], [.03, -.80], [.085, -.855]], [[-.006, -.995], [.006, -.94], [-.004, -.88]]);
        else head(0, -.945, .058, .066, [[-.052, -.915], [-.02, -.88], [0, -.865], [.02, -.88], [.052, -.915]], [[-.003, -.999], [.004, -.965], [-.002, -.92]]);
      }
    }
    R.draw(r, pre, function (id, st, part) { drawPart(id, st, part); });
    P.pop();
  };
})();
