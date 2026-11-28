/* input.js — pointer / touch / keyboard hold; pointer position in world units */
(function () {
  'use strict';
  var MK = window.MK;
  var I = MK.input = { holding: false, pointer: { x: 500, y: 700 }, pointerActive: false, dragging: false, dragDelta: { x: 0, y: 0 }, holdActive: false };
  var CAP = /[?&]capture(=1)?(&|$)/.test(location.search);
  var down = false, last = null, space = false, btnHold = false, mouseHold = false;
  function upd() { I.holding = space || btnHold || mouseHold; }
  function setP(e) {
    var w = MK.view.toWorld(e.clientX, e.clientY); I.pointer.x = w[0]; I.pointer.y = w[1];
  }
  window.addEventListener('pointermove', function (e) {
    if (CAP || e.pointerType === 'touch') return;
    setP(e); I.pointerActive = true;
    if (down && last) { I.dragDelta.x += w2(e.clientX - last[0]); I.dragDelta.y += w2(e.clientY - last[1]); }
    if (down) last = [e.clientX, e.clientY];
  }, { passive: true });
  function w2(px) { return px / MK.view.s; }
  window.addEventListener('pointerdown', function (e) {
    if (CAP) return;
    var onBtn = e.target && e.target.closest && e.target.closest('.seal.btn');
    if (onBtn) { btnHold = true; upd(); e.preventDefault(); return; }
    if (e.pointerType === 'touch') return;
    setP(e); I.pointerActive = true; down = true; last = [e.clientX, e.clientY]; I.dragging = true;
    if (I.holdActive) { mouseHold = true; upd(); }
  });
  window.addEventListener('pointerup', function () { btnHold = false; down = false; I.dragging = false; last = null; mouseHold = false; upd(); });
  window.addEventListener('pointercancel', function () { btnHold = false; down = false; I.dragging = false; mouseHold = false; upd(); });
  window.addEventListener('blur', function () { down = false; mouseHold = false; space = false; btnHold = false; upd(); });
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && I.holdActive) { space = true; upd(); e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) { if (e.code === 'Space') { space = false; upd(); } });
  window.addEventListener('contextmenu', function (e) { if (e.target && e.target.closest && e.target.closest('.seal')) e.preventDefault(); });
  /* capture mode override */
  I.set = function (o) {
    if (!o) o = {};
    I.holding = !!o.holding;
    if (o.pointer) { I.pointer.x = o.pointer.x; I.pointer.y = o.pointer.y; I.pointerActive = true; }
  };
  I.endFrame = function () { I.dragDelta.x = 0; I.dragDelta.y = 0; };
})();
