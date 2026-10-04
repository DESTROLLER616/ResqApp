---
name: summarize-branch-changes
description: Collects git changes made on the current branch since it was created and returns a filled PR-style markdown block to copy. Use when the user wants a brief branch summary or changelog using the project PR template.
disable-model-invocation: true
---

# Summarize branch changes

Describe only the commits and uncommitted edits made **on the current branch** after it was created. Do not list, check out, log, diff, or otherwise inspect any other branch (`main`, `master`, feature branches, or remotes).

## Collect changes

1. Read the current branch: `git branch --show-current`. If the result is empty (detached HEAD), stop and tell the user.
2. Find where **this** branch started, using only its reflog:
   - `git reflog show <branch>`
   - The fork point is the SHA on the entry whose message is `branch: Created from`.
3. If that entry is missing, stop and tell the user the branch start is not in this branch's reflog. Do not fall back to another branch.
4. Gather scope for `<fork>..HEAD` only (run in parallel when possible):
   - `git log --oneline <fork>..HEAD`
   - `git diff --stat <fork>..HEAD`
   - `git diff <fork>..HEAD` (read enough to summarize behavior, not every line)
5. Include **uncommitted** work only when the working tree is dirty: add `git status --porcelain` and `git diff` / `git diff --cached`. Those diffs are part of this branch's work.

## Exceptions

- If `<fork>..HEAD` is empty **and** the working tree is clean, say there are no branch changes and stop.
- Do not invent changes; only describe what those commands show.
- Do not describe commits that are ancestors of the fork point, even if they are not in `main`.

## Output

Create the markdown block using [template](../../../docs/templates/pr-template.md). Fill every section from the branch changes; keep bullets concise and group related edits.

Return **only** one fenced markdown code block the user can copy. The language of the description is in **English**.

Rules:

- Use `[x]` on Key Changes (and Breaking Changes when applicable) for items that this branch actually delivers.
- Remove the **Breaking Changes** section entirely when there are none.
- **Testing Notes**: list practical verification steps for the changes on this branch, not generic project advice.
