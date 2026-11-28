---
name: openmontage
description: OpenMontage — open-source agentic video production system (vendored as a git submodule at vendor/OpenMontage). Use it whenever the task is to GENERATE media with AI — characters, backgrounds, illustrations, photos, image edits/variants, image-to-video or text-to-video clips, music, sound effects, narration — or to produce/compose a video (trailer, explainer, animated short) from generated or stock assets, including regenerating the art of the MOKPAN web-manhwa in manhwa/. Covers provider choice (fal.ai FLUX/Recraft/Kling/Veo, Google Imagen/Veo, OpenAI GPT Image/Sora, Replicate, …), prompting best practices, cost tracking and HyperFrames/Remotion composition.
---

# OpenMontage (vendored)

OpenMontage lives in `vendor/OpenMontage` (git submodule, pinned commit). It is an instruction-driven
framework: the agent reads its guides and drives Python tools. AGPL-3.0 licensed.

## 1. Setup (once per container)

```bash
cd /home/user/Presentation-n1
git submodule update --init --depth 1 vendor/OpenMontage
cd vendor/OpenMontage
uv venv --python 3.11 .venv && . .venv/bin/activate && uv pip install -r requirements.txt
make preflight            # JSON menu of available / key-gated tools
# only when composing with Remotion:  (cd remotion-composer && npm install)
```

## 2. Mandatory rules (from OpenMontage)

1. Read `vendor/OpenMontage/AGENT_GUIDE.md` before producing anything, and follow it: production goes
   through a pipeline in `pipeline_defs/`; run preflight; read the stage-director skill
   (`skills/pipelines/<pipeline>/<stage>-director.md`) before each stage and the Layer-3 provider skill
   (`.agents/skills/…`, referenced by each tool's `agent_skills`) before calling a tool.
2. Announce before every paid call: tool, provider, model, why, sample vs batch, estimated cost.
   Ask the user before switching provider/model or going from sample to batch.
3. Run the tools from `vendor/OpenMontage` with its venv active (`python -m …` / the tool classes).

## 3. API keys — never in chat, never in a committed `.env`

Image/video generation needs a provider key (there is no GPU here, so local diffusion is unavailable).
Use the environment's credential mechanism (the `request_credential` tool) for the provider host, then
give the SDK a dummy value so it starts (e.g. `export FAL_KEY=proxy`); the proxy injects the real key.

| Provider | Env var | API hosts | Result/media hosts (allowlist) |
|---|---|---|---|
| fal.ai (FLUX, Recraft, Gemini image, Kling, Veo, MiniMax) | `FAL_KEY` (`Authorization: Key …`) | `queue.fal.run`, `fal.run` | `fal.media`, `v3.fal.media`, `v3b.fal.media` |
| Google (Imagen, Gemini image, Veo, TTS) | `GOOGLE_API_KEY` | `generativelanguage.googleapis.com` | same |
| OpenAI (GPT Image, Sora) | `OPENAI_API_KEY` (Bearer) | `api.openai.com` | same |

## 4. Useful bundled skills

`vendor/OpenMontage/.claude/skills/<name>/SKILL.md`: `flux-best-practices`, `bfl-api`, `ai-video-gen`,
`visual-style`, `create-video`, `ffmpeg`, `remotion`, `remotion-best-practices`, `threejs-*`,
`text-to-speech`, `sound-effects`, `music`. Commands: `vendor/OpenMontage/.claude/commands/ink-art.md`
(free vector ink animation), `animated-drawing.md`, `reel.md`.

## 5. MOKPAN (manhwa/) conventions

- Generated files go to `manhwa/assets/gen/<scene>/`; every prompt, model, seed and cost is logged in
  `manhwa/assets/gen/PROMPTS.md`.
- Style anchor for every prompt: Korean woodblock print / engraving line art, cinnabar red `#CF2A1B`,
  ink black `#15110F`, hanji cream `#EEE6D6`; blue `#2456D3` only for the carver's daenggi ribbon,
  gold `#E5A823` only for the tiger's eyes. See `manhwa/DESIGN.md`.
- In the page, images/clips are converted by the print pipeline (luminance → hatch tone, colours →
  palette) so generated art and procedural art share one look.
