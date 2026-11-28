# Motion capture attribution

`walk.json` and `sit.json` are 2D (front view) joint clips, 30 fps, taken unmodified from
`vendor/OpenMontage/ink-theater/mocap/clips/`.

Source: **CMU Graphics Lab Motion Capture Database** (http://mocap.cs.cmu.edu), free for all uses (research and
commercial), via OpenMontage Ink Theater (`ink-theater/mocap/NOTE.md`, trial ids in `ink-theater/mocap/catalog.json`).
"The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217."

Retargeting (build/rigs/bake_rigdata.py): back view, so x is mirrored; the 2D joints are reduced to segment angles
(spine lean, head, upper-arm / forearm, hip->knee), foot lift, root bob (high-passed) and pelvis sway, all as deltas
from the clip mean, and baked into `src/art/rigdata.js` as one loopable stride (walk) / a ping-pong window (sit).
`walk` frame 0 and `sit` frame 0 are T-pose calibration frames and are skipped.
