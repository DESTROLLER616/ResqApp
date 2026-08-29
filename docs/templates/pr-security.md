## 🔒 Security summary

A short, high-level description of the vulnerability and why this fix is needed.

**Do not** include a full exploit, proof of concept, or step-by-step reproduction that a third party could copy. Keep details at the level of *what was wrong* and *how it is now blocked*.

- **Advisory / report:** `GHSA-xxxx-xxxx-xxxx` / private report / N/A
- **Severity:** Critical / High / Medium / Low
- **Affected surface:** e.g. Tauri command, IPC, file access, response viewer, TLS, credentials
- **Affected versions:** `main` / unreleased / (release tag if any)

## 🎯 Impact

Who or what is at risk if this is not fixed, in practical terms.

- [ ] Local files outside the opened project
- [ ] Tauri capabilities / desktop sandbox
- [ ] Untrusted content in the UI (XSS / script injection)
- [ ] Credentials, cookies, or tokens leaked beyond user-stored request files
- [ ] TLS / certificate validation / unexpected network requests
- [ ] Command injection or unexpected process execution
- [ ] Local privilege escalation
- [ ] Other: _describe without exploit steps_

## 🛠️ Fix

- **Root cause:** What assumption or check was missing.
- **Change:** What this PR does to close the issue.
- **What we did not change:** Scope limits, intentional non-goals, or follow-up work.

## ⚠️ Breaking changes (if applicable)

_(Remove this section if not applicable)_

- Behavior users or integrations might notice after the fix (stricter paths, blocked requests, new errors, etc.).

## 🧪 Verification

How reviewers can confirm the fix **without** a public exploit.

- [ ] Unit / integration tests covering the unsafe path
- [ ] Manual check of the intended user flow (still works)
- [ ] Manual check that the unsafe path is rejected or contained
- [ ] No secrets, tokens, or personal data in logs, screenshots, or this PR

## 📢 Disclosure

- [ ] Fix is ready to ship before public details
- [ ] GitHub Security Advisory will be published after merge / release
- [ ] Reporter credit (or anonymous, as requested):

## ✅ Reviewer checklist

- [ ] Does not introduce a new way to read/write files outside the project
- [ ] Does not weaken Tauri capabilities, IPC validation, or TLS
- [ ] Untrusted response/UI content stays untrusted
- [ ] Tests fail without the fix (or the unsafe path is clearly covered)
- [ ] PR description has no exploit payload or copy-pasteable attack steps
