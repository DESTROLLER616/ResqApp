import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { RequestDraft, RequestFile } from '@/types/http'
import type { OpenedProject, RecentProject } from '@/types/project'

function toFile(draft: RequestDraft): RequestFile {
  return {
    name: draft.name,
    method: draft.method,
    url: draft.url,
    params: draft.params,
    headers: draft.headers,
    body: draft.body,
  }
}

function fromFile(relativePath: string, file: RequestFile): RequestDraft {
  return {
    id: relativePath,
    name: file.name,
    method: file.method,
    url: file.url,
    params: file.params ?? [],
    headers: file.headers ?? [],
    body: file.body ?? '',
  }
}

export async function listRecentProjects(): Promise<RecentProject[]> {
  return invoke<RecentProject[]>('list_recent_projects')
}

export async function removeRecentProject(path: string): Promise<RecentProject[]> {
  return invoke<RecentProject[]>('remove_recent_project', { path })
}

export async function openProject(path: string): Promise<OpenedProject> {
  return invoke<OpenedProject>('open_project', { path })
}

export async function createProject(
  parentDir: string,
  name: string,
): Promise<OpenedProject> {
  return invoke<OpenedProject>('create_project', { parentDir, name })
}

export async function initProject(
  path: string,
  name?: string,
): Promise<OpenedProject> {
  return invoke<OpenedProject>('init_project', { path, name: name ?? null })
}

export async function refreshProject(path: string): Promise<OpenedProject> {
  return invoke<OpenedProject>('refresh_project', { path })
}

export async function createFolder(
  projectRoot: string,
  parentRelative: string,
  name: string,
): Promise<OpenedProject> {
  return invoke<OpenedProject>('create_folder', {
    projectRoot,
    parentRelative,
    name,
  })
}

export async function createRequest(
  projectRoot: string,
  parentRelative: string,
  name: string,
  draft?: RequestFile,
): Promise<OpenedProject> {
  return invoke<OpenedProject>('create_request', {
    projectRoot,
    parentRelative,
    name,
    draft: draft ?? null,
  })
}

export async function readRequest(
  projectRoot: string,
  relativePath: string,
): Promise<RequestDraft> {
  const file = await invoke<RequestFile>('read_request', {
    projectRoot,
    relativePath,
  })
  return fromFile(relativePath, file)
}

export async function writeRequest(
  projectRoot: string,
  relativePath: string,
  draft: RequestDraft,
): Promise<void> {
  await invoke('write_request', {
    projectRoot,
    relativePath,
    draft: toFile(draft),
  })
}

export async function deleteEntry(
  projectRoot: string,
  relativePath: string,
): Promise<OpenedProject> {
  return invoke<OpenedProject>('delete_entry', {
    projectRoot,
    relativePath,
  })
}

export async function moveEntry(
  projectRoot: string,
  fromRelative: string,
  toParentRelative: string,
): Promise<OpenedProject> {
  return invoke<OpenedProject>('move_entry', {
    projectRoot,
    fromRelative,
    toParentRelative,
  })
}

export async function pickDirectory(title?: string): Promise<string | null> {
  // Use the JS dialog plugin (non-blocking). Rust `blocking_pick_folder`
  // deadlocks the GTK main thread on Linux when invoked from a command.
  const selected = await open({
    directory: true,
    multiple: false,
    title: title ?? 'Select folder',
  })
  if (selected === null || Array.isArray(selected)) {
    return null
  }
  return selected
}
