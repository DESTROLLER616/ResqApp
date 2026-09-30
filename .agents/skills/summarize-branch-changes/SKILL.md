---
name: summarize-branch-changes
description: Collects git changes on the current branch versus its merge base and returns a filled PR-style markdown block to copy. Use when the user wants a brief branch summary or changelog using the project PR template.
disable-model-invocation: true
---

# Summarize branch changes

Produce a description of everything that differs on the **current branch** from the integration base. Do not inspect or summarize other branches the user is not on.

## Collect changes

1. Read the current branch: `git branch --show-current`.
2. Resolve the base: `main`, then `master` if `main` is missing.
3. If the base branch does not exist locally, stop and tell the user.
4. Gather scope (run in parallel when possible):
   - `git log --oneline <base>..HEAD`
   - `git diff --stat <base>...HEAD`
   - `git diff <base>...HEAD` (read enough to summarize behavior, not every line)
5. Include **uncommitted** work only when the working tree is dirty: add `git status` and `git diff` / `git diff --cached` to the summary.

## Exceptions

- If there are **no** commits ahead of the base **and** the working tree is clean, say there are no branch changes and stop.
- Do not invent changes; only describe what git shows.

## Output

Create the markdown block using [template](../../../docs/templates/pr-template.md). Fill every section from the branch changes; keep bullets concise and group related edits.

Return **only** one fenced markdown code block the user can copy. The language of the description is in **English**.

Rules:

- Use `[x]` on Key Changes (and Breaking Changes when applicable) for items that this branch actually delivers.
- Remove the **Breaking Changes** section entirely when there are none.
- **Testing Notes**: list practical verification steps for the changes on this branch, not generic project advice.
