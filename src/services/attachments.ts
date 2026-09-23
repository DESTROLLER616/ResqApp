import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export async function pickFile(title: string): Promise<string | null> {
  const selected = await open({
    directory: false,
    multiple: false,
    title,
  })
  if (selected === null || Array.isArray(selected)) {
    return null
  }
  return selected
}

export type AttachmentKind = 'file' | 'image'

export interface ProjectAttachment {
  path: string
  kind: AttachmentKind
}

export async function listRequestAttachments(projectRoot: string): Promise<ProjectAttachment[]> {
  return invoke<ProjectAttachment[]>('list_request_attachments', { projectRoot })
}

export async function copyRequestAttachment(
  projectRoot: string,
  sourcePath: string,
): Promise<string> {
  return invoke<string>('copy_request_attachment', { projectRoot, sourcePath })
}
