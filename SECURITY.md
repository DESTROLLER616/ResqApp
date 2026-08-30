# Security Policy

Thank you for helping keep ReqCraft and its users safe. Please report security issues privately so we can fix them before they are public.

## Supported versions

ReqCraft is in early development (0.1.0). We only accept reports against the latest `main` branch (and the latest published release, when one exists).

| Version                           | Supported |
| --------------------------------- | --------- |
| `main` (latest)                   | Yes       |
| Older commits / unofficial builds | No        |

## How to report a vulnerability

**Do not** open a public GitHub issue, pull request, or discussion for a security problem.

Use one of these channels, in order of preference:

1. **GitHub private advisory** — [Report a vulnerability](https://github.com/DESTROLLER616/http-client-app/security/advisories/new) (private vulnerability reporting).
2. **Email** — [destroller@protonmail.com](mailto:destroller@protonmail.com) with the subject `SECURITY: ReqCraft`.

If you do not get an acknowledgement within **7 days**, send a follow-up email with the same subject.

### What to include

- A short description of the issue and its impact
- Affected version, commit, OS, and how you built or installed the app
- Steps to reproduce (a minimal project folder or request JSON helps)
- What you expected vs. what actually happened
- Proof of concept, logs, or screenshots — **without** real secrets, tokens, or personal data
- Whether you have a patch or suggested fix (optional)

Please do not include full exploits against third-party services or data you do not own.

## Scope

### In scope

Issues in **this repository** that could harm ReqCraft users, including:

- Path traversal, arbitrary file read/write, or access outside the opened project
- Bypass of Tauri capabilities, IPC, or other desktop sandboxing
- Cross-site scripting or script injection in the response viewer or other UI that renders untrusted content
- Credential, cookie, or token leakage beyond what the user stored in their own request files
- Weak or disabled TLS, certificate validation issues, or unexpected network requests
- Command injection or unexpected process execution
- Privilege escalation on the local machine

### Out of scope

- Public issues that are not security bugs (use a normal GitHub issue)
- Vulnerabilities in APIs, servers, or sites the user chooses to call with ReqCraft
- Secrets the user stored in project `.json` files on disk (that is how projects work), unless the app leaks them elsewhere
- Reports against outdated or unofficial builds
- Social engineering, physical access, or issues that require a fully compromised machine
- Denial of service against remote servers by sending requests the user initiated
- Theoretical issues with no practical impact or reproduction steps

## What happens next

1. We acknowledge the report (target: **7 days**).
2. We confirm or reject the issue and share a severity estimate.
3. We work on a fix. You may be asked for more detail or to test a patch.
4. We publish a fix and, if needed, a GitHub Security Advisory.
5. We credit you in the advisory unless you ask to stay anonymous.

This is a small, volunteer-maintained project. We will keep you updated, but we cannot guarantee a specific fix date.

## Disclosure

Please give us a chance to ship a fix before you publish details.

- Default window: **90 days** after we acknowledge the report, or sooner if a fix is released.
- If we agree the issue is not a vulnerability, you may discuss it publicly after we say so.
- If the issue is already public, we will treat it as public and still work on a fix.

We do not currently offer a bug bounty. A clear report and, if you want, a credit in the advisory are appreciated.

## Safe harbor

If you follow this policy, act in good faith, and avoid privacy violations, data destruction, and disruption of other people's systems, we will not pursue legal action related to your research.

Do not access other people's data, accounts, or machines. Limit testing to your own environment and to ReqCraft itself.
