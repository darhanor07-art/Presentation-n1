# Multi-agent workflow (always use)

> Барлық чаттарда осы тәртіпті қолдан: Opus жоспарлайды, Haiku контекст іздейді, Sonnet код жазады, Opus тексереді.

For every non-trivial coding task, the main session (Opus) acts as **orchestrator**
and follows this pipeline:

```js
const plan = opus.plan(task)          // 1. Opus thinks and writes the plan
const ctx  = await haiku(plan)        // 2. context-scout (Haiku) gathers context
const code = await sonnet(plan, ctx)  // 3. coder (Sonnet) writes the code
const ok   = opus.check(code)         // 4. Opus reviews the result
return ok
```

## Steps

1. **Plan (Opus, main session).** Read the request, write a short numbered plan:
   goal, files likely involved, steps, acceptance criteria.
2. **Context (Haiku).** Launch the `context-scout` agent with the plan.
   It returns relevant `path:line` references, conventions and risks.
3. **Code (Sonnet).** Launch the `coder` agent with PLAN + CONTEXT.
   It implements the change and reports what it did.
4. **Check (Opus, main session).** Review the diff (`git diff`) against the plan's
   acceptance criteria. If something is wrong, send the coder a concrete fix list
   (SendMessage to the same agent) and re-check. Only when OK: commit and push.

## Notes

- Trivial edits (typo, one-line change) may be done directly without the pipeline.
- Agents never commit or push — only the orchestrator does, after the check passes.
- Agent definitions live in `.claude/agents/` (`context-scout.md` → haiku, `coder.md` → sonnet).
