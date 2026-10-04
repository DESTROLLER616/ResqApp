import { invoke } from '@tauri-apps/api/core'

import type { EnvironmentsFile } from '@/types/environment'

export async function readEnvironments(projectRoot: string): Promise<EnvironmentsFile> {
  return invoke<EnvironmentsFile>('read_environments', { projectRoot })
}

export async function writeEnvironments(
  projectRoot: string,
  file: EnvironmentsFile,
): Promise<void> {
  await invoke('write_environments', { projectRoot, file })
}
