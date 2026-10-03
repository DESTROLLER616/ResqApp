import { invoke } from '@tauri-apps/api/core'
import { Client, Stronghold } from '@tauri-apps/plugin-stronghold'

const CLIENT_NAME = 'environments'

interface VaultSession {
  stronghold: Stronghold
  client: Client
}

let session: VaultSession | null = null

export function isVaultUnlocked(): boolean {
  return session !== null
}

export async function secretVaultPath(): Promise<string> {
  return invoke<string>('secret_vault_path')
}

export async function secretVaultExists(): Promise<boolean> {
  return invoke<boolean>('secret_vault_exists')
}

export async function unlockVault(password: string): Promise<void> {
  const path = await secretVaultPath()
  const stronghold = await Stronghold.load(path, password)
  let client: Client
  try {
    client = await stronghold.loadClient(CLIENT_NAME)
  } catch {
    try {
      client = await stronghold.createClient(CLIENT_NAME)
    } catch {
      client = new Client(path, CLIENT_NAME)
    }
  }
  await stronghold.save()
  session = { stronghold, client }
}

function requireSession(): VaultSession {
  if (!session) {
    throw new Error('vault is locked')
  }
  return session
}

export function secretRecordKey(
  projectId: string,
  environmentId: string,
  variableId: string,
): string {
  return `${projectId}/${environmentId}/${variableId}`
}

function encode(value: string): number[] {
  return Array.from(new TextEncoder().encode(value))
}

function decode(data: Uint8Array | null): string | null {
  if (!data) return null
  return new TextDecoder().decode(data)
}

export async function readSecret(
  projectId: string,
  environmentId: string,
  variableId: string,
): Promise<string | null> {
  const current = requireSession()
  const data = await current.client
    .getStore()
    .get(secretRecordKey(projectId, environmentId, variableId))
  return decode(data)
}

export async function writeSecret(
  projectId: string,
  environmentId: string,
  variableId: string,
  value: string,
): Promise<void> {
  const current = requireSession()
  await current.client
    .getStore()
    .insert(secretRecordKey(projectId, environmentId, variableId), encode(value))
  await current.stronghold.save()
}

export async function deleteSecret(
  projectId: string,
  environmentId: string,
  variableId: string,
): Promise<void> {
  const current = requireSession()
  await current.client.getStore().remove(secretRecordKey(projectId, environmentId, variableId))
  await current.stronghold.save()
}
