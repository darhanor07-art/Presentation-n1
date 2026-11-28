# Attribution

This skill's API recipes and examples are adapted from
[CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills),
which the upstream author licenses MIT.

The adaptation:

1. **Format conversion** — Claude/Anthropic-Markdown → Hermes Agent SKILL.md
   (frontmatter required: `name`, `description` ≤ 1024 chars, `version`,
   `author`, `license`, `metadata.hermes.{tags,related_skills}`).
2. **Structural additions** — `## When To Use`, `## Common Pitfalls`,
   `## Verification Checklist`, `## One-Shot Recipes`, `## See Also` —
   matched to peer-creative skills in `~/.hermes/skills/creative/`.
3. **Consolidation** — the ten upstream files (`threejs-animation`,
   `threejs-fundamentals`, `threejs-geometry`, `threejs-lighting`,
   `threejs-materials`, `threejs-loaders`, `threejs-interaction`,
   `threejs-postprocessing`, `threejs-shaders`, `threejs-textures`)
   collapsed into one hub skill (`threejs-3d-websites`) plus
   outlinks to upstream for deep dives.
4. **Editorial** — added pitfalls and verification steps that are
   specific to Hermes-mode agent behaviour (e.g. asynchronous
   `loader.load` race conditions when the model reads
   `gltf.animations` synchronously after load).

All actual API names, class names, method signatures, and code patterns
come from the upstream MIT-licensed cheatsheet; any editorial
additions are also MIT.
