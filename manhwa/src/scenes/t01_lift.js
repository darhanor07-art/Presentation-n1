/* t01 — "block lifts": the woodblock slides up (1.3x), the night sky is revealed below */
(function () {
  'use strict';
  MK.transition({ id: 't01', order: 15, len: .6, from: 's01', to: 's02', kind: 'scroll', parallaxA: 1.3 });
})();
