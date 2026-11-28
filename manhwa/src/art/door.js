/* art/door.js — 창호지 sliding door pieces: lattice leaf with hanji panes, wooden frame, wall with cut-out.
   MK.art.door.leaf(P, rect, o) -> panes Path2D (local coords)   o = {pane: toneStyle for the hanji, inPanes: fn() drawn clipped to the panes, stile:18, bar:8, cw:65, ch:120}
   MK.art.door.frame(P, op, th)   op = {x,y,w,h} the opening, th = frame thickness (drawn around the opening: ring op.x-th..)
   MK.art.door.wall(P, bounds, op, st) wall over bounds with the opening cut out */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {};
  var WOOD = function (t) { return { c: 'paper', t: t, h: 'grain', a: 0, stroke: { w: 2.4, c: 'ink' } }; };

  function ringPath(o, i) {
    var p = new Path2D(); p.rect(o.x, o.y, o.w, o.h); p.rect(i.x, i.y, i.w, i.h); return p;
  }

  art.door = {
    leaf: function (P, rect, o) {
      o = o || {};
      var st = o.stile || 18, bar = o.bar || 8, x = rect.x, y = rect.y, w = rect.w, h = rect.h, i, j;
      var ix = x + st, iy = y + st, iw = w - 2 * st, ih = h - 2 * st;
      var nc = Math.max(1, Math.round(iw / (o.cw || 65))), nr = Math.max(1, Math.round(ih / (o.ch || 120)));
      var cw = iw / nc, chh = ih / nr, panes = new Path2D();
      for (i = 0; i < nc; i++) for (j = 0; j < nr; j++) {
        var px = ix + i * cw + (i ? bar / 2 : 0), py = iy + j * chh + (j ? bar / 2 : 0);
        panes.rect(px, py, cw - (i ? bar / 2 : 0) - (i < nc - 1 ? bar / 2 : 0), chh - (j ? bar / 2 : 0) - (j < nr - 1 ? bar / 2 : 0));
      }
      /* hanji (backlit) */
      P.rect(ix, iy, iw, ih, o.pane || { c: 'paper', t: .1, a: 0 });
      if (o.inPanes) P.clip(panes, o.inPanes);
      /* lattice */
      for (i = 1; i < nc; i++) P.rect(ix + i * cw - bar / 2, iy, bar, ih, WOOD(.75));
      for (j = 1; j < nr; j++) P.rect(ix, iy + j * chh - bar / 2, iw, bar, WOOD(.75));
      /* stiles */
      P.rect(x, y, st, h, WOOD(.7)); P.rect(x + w - st, y, st, h, WOOD(.7));
      P.rect(x + st, y, w - 2 * st, st, WOOD(.7)); P.rect(x + st, y + h - st, w - 2 * st, st, WOOD(.7));
      /* a small door pull (손잡이) on the meeting stile */
      return panes;
    },
    frame: function (P, op, th) {
      var out = { x: op.x - th, y: op.y - th, w: op.w + 2 * th, h: op.h + 2 * th };
      P.path(ringPath(out, op), { c: 'paper', t: .6, h: 'grain', a: 0, rule: 'evenodd', stroke: { w: 3, c: 'ink' } });
      /* mitre joints */
      [[out.x, out.y, op.x, op.y], [out.x + out.w, out.y, op.x + op.w, op.y], [out.x, out.y + out.h, op.x, op.y + op.h], [out.x + out.w, out.y + out.h, op.x + op.w, op.y + op.h]]
        .forEach(function (c) { P.line(c[0], c[1], c[2], c[3], { w: 2.4, c: 'ink' }); });
    },
    wall: function (P, b, op, st) {
      var p = new Path2D(); p.rect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4); p.rect(op.x, op.y, op.w, op.h);
      var s2 = {}; for (var k in st) s2[k] = st[k]; s2.rule = 'evenodd';
      P.path(p, s2);
    }
  };
})();
