# ResqApp

A desktop HTTP client for composing, organizing, and sending API requests. Requests live as JSON files in a folder on disk, so you can keep them next to your code, share them, and version them with Git.

Built with [Tauri 2](https://tauri.app/), [Vue 3](https://vuejs.org/), and [Rust](https://www.rust-lang.org/). Currently at **0.1.0** (early development).

## Features

- **Projects on disk** — create a new project, open an existing folder, or initialize a folder as a project
- **Request tree** — folders and requests with create, rename, delete, and drag-and-drop
- **HTTP methods** — `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- **Request editor** — URL, query parameters, headers (each can be toggled on/off), and body
- **Response viewer** — status, elapsed time, headers, and highlighted body
- **Tabs** — work on several requests at once
- **Recent projects** — last 20 opened projects in the sidebar and native menu
- **Themes** — system, light, or dark
- **Languages** — English and Spanish (follows the OS language, with Spanish as fallback)

HTTP calls run in Rust via [reqwest](https://github.com/seanmonstar/reqwest) with **rustls** (no system OpenSSL).

## How projects work

A project is a directory with a marker file:

```text
my-api/
├── http-client.project.json
├── users/
│   └── list.json
└── health.json
```

**`http-client.project.json`** identifies the folder as a ReqCraft project:

```json
{
  "name": "my-api",
  "version": 1
}
```

Each request is a `.json` file:

```json
{
  "name": "list",
  "method": "GET",
  "url": "https://api.example.com/users",
  "params": [{ "id": "1", "key": "limit", "value": "20", "enabled": true }],
  "headers": [{ "id": "1", "key": "Accept", "value": "application/json", "enabled": true }],
  "body": ""
}
```

The marker file cannot be renamed, moved, or deleted from the app. Recent projects are stored in the app data directory as `workspace.json` (not inside the project).

## Stack

| Layer           | Tech                             |
| --------------- | -------------------------------- |
| Desktop shell   | Tauri 2                          |
| UI              | Vue 3, Naive UI, Pinia, vue-i18n |
| Backend         | Rust (`reqwest`, `serde`)        |
| Package manager | pnpm                             |

## Development

**Requirements:** [Node.js](https://nodejs.org/), [pnpm](https://pnpm.io/), [Rust](https://rustup.rs/), and [Tauri’s platform dependencies](https://v2.tauri.app/start/prerequisites/).

```bash
pnpm install
pnpm tauri dev
```

Other scripts:

| Command                             | Description               |
| ----------------------------------- | ------------------------- |
| `pnpm tauri build`                  | Production desktop bundle |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                    |
| `pnpm format` / `pnpm format:check` | Prettier                  |

## License

[GPL-3.0-only](LICENSE)
