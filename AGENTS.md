<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **IN-OUT-tracker** (1591 symbols, 2276 relationships, 34 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

---

# Token Saving Rules

Codex must keep context usage small and avoid unnecessary exploration.

## General Token Rules

- Use the smallest amount of context needed to solve the task.
- Do not inspect the whole repository unless explicitly requested.
- Do not load broad dependency graphs unless the task requires it.
- Prefer targeted lookups over broad searches.
- Before reading a large file, explain why it is needed.
- Read only relevant sections of files when possible.
- Avoid dumping full command output into context.
- Avoid full-repo diffs unless explicitly requested.
- Limit initial investigation to at most 5 directly relevant files.
- Make the minimal code change needed.
- If the task is small and the relevant file is already known, do not use GitNexus unless necessary.

## RTK / Rust Token Killer Rules

Use RTK for commands that may produce long or noisy terminal output.

Prefer:

```bash
rtk git status
rtk git diff
rtk git log
rtk ls
rtk tree
rtk rg
rtk grep
rtk npm test
rtk pnpm test
rtk yarn test
rtk pytest
rtk docker logs
rtk tsc
```

Rules:

- Do not run raw verbose commands when RTK can be used.
- Use `rtk git diff` instead of raw `git diff`.
- Use `rtk git status` instead of raw `git status`.
- Use `rtk rg` or `rtk grep` instead of raw broad text search.
- Use RTK for test commands when output may be long.
- If RTK hides important error details, rerun the specific failing command without RTK, but only for the narrow failing case.
- Do not use RTK as an excuse to run broad commands. Still keep commands focused.

Examples:

```bash
rtk git diff -- src/features/payments
rtk rg "handleSubmit" src/
rtk pnpm test -- --runInBand
rtk docker logs app --tail 200
```

Avoid:

```bash
git diff
tree .
cat large-file.ts
rg "."
docker logs app
```

---

# GitNexus Usage Policy

GitNexus is useful for impact analysis, call graph navigation, execution flow tracing, and safe refactoring. However, it can increase token usage if overused.

Use GitNexus when:

- The task touches shared business logic.
- The task involves changing a function, class, method, or exported symbol.
- The task requires understanding callers/callees.
- The task may affect multiple flows.
- The task involves refactoring, renaming, moving, extracting, or splitting code.
- The relevant file or symbol cannot be found with normal targeted search.
- The user asks for architecture, impact analysis, execution flow, or dependency tracing.

Avoid GitNexus when:

- The change is clearly local and isolated.
- The user only asks for a small UI/text/style/config change.
- The relevant file is already known.
- Normal targeted search is enough.
- The task does not modify a function, class, method, or exported symbol.

When using GitNexus:

- Use targeted queries only.
- Do not dump full graphs.
- Do not fetch all clusters or all processes unless explicitly needed.
- Do not call multiple GitNexus tools repeatedly without a reason.
- Prefer symbol-level context over repo-level context.
- Summarize only the relevant result, not the full raw output.

---

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius: direct callers, affected processes, and risk level.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of broad grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.
- Keep GitNexus output summarized and focused on the current task.
- Prefer RTK-wrapped terminal commands for noisy operations.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.
- NEVER use GitNexus to explore the whole project for a small localized task.
- NEVER dump full dependency graphs into context unless explicitly requested.
- NEVER run broad raw terminal commands when RTK can provide compact output.
- NEVER read huge files entirely when a targeted section is enough.

---

## Small Task Mode

For small tasks, prioritize speed and low token usage.

Small tasks include:

- Text changes
- CSS/style tweaks
- Simple UI adjustments
- Copy changes
- Small config changes
- Fixing an obvious typo
- Editing a known file
- Adding a small validation or condition in a known location

Rules for small tasks:

- Do not use GitNexus unless the change touches a shared function/class/method or exported symbol.
- Do not perform architecture exploration.
- Do not inspect more than 3 files unless necessary.
- Do not run full test suites unless requested.
- Use focused checks only.

---

## Large / Risky Task Mode

For larger tasks, use GitNexus carefully.

Large or risky tasks include:

- Refactoring
- Renaming symbols
- Changing shared logic
- Changing data model behavior
- Changing authentication, payments, permissions, state management, routing, or persistence
- Fixing bugs where the execution flow is unclear
- Any change that may affect multiple features

Rules for large tasks:

- Use `gitnexus_query` to locate relevant flows.
- Use `gitnexus_context` for exact symbols.
- Use `gitnexus_impact` before editing symbols.
- Warn if risk is HIGH or CRITICAL.
- Keep output summarized.
- Run focused tests first.
- Use `gitnexus_detect_changes()` before commit or final review.

---

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/IN-OUT-tracker/context` | Codebase overview, check index freshness |
| `gitnexus://repo/IN-OUT-tracker/clusters` | All functional areas |
| `gitnexus://repo/IN-OUT-tracker/processes` | All execution flows |
| `gitnexus://repo/IN-OUT-tracker/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
