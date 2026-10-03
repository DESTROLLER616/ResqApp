import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { catalogFor } from '@/features/environments/resolve'
import * as environmentService from '@/services/environments'
import * as secrets from '@/services/secrets'
import type { Environment, EnvironmentVariable } from '@/types/environment'

const SAVE_DEBOUNCE_MS = 300
const ACTIVE_KEY_PREFIX = 'environments:active:'

export type VaultPromptMode = 'create' | 'unlock'

export class VaultUnlockCancelled extends Error {
  constructor() {
    super('vault unlock cancelled')
    this.name = 'VaultUnlockCancelled'
  }
}

interface VaultPrompt {
  mode: VaultPromptMode
  resolve: (unlocked: boolean) => void
}

function publicFile(environments: Environment[]) {
  return {
    version: 1,
    environments: environments.map((environment) => ({
      ...environment,
      variables: environment.variables.map((variable) => ({
        ...variable,
        value: variable.secret ? '' : variable.value,
      })),
    })),
  }
}

export const useEnvironmentsStore = defineStore('environments', () => {
  const projectRoot = ref<string | null>(null)
  const projectId = ref<string | null>(null)
  const environments = ref<Environment[]>([])
  const activeEnvironmentId = ref<string | null>(null)
  const vaultExists = ref(false)
  const vaultUnlocked = ref(false)
  const vaultPrompt = ref<VaultPrompt | null>(null)
  const errorMessage = ref<string | null>(null)

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let saveGeneration = 0

  const activeEnvironment = computed(
    () =>
      environments.value.find((environment) => environment.id === activeEnvironmentId.value) ??
      null,
  )

  const catalog = computed(() => catalogFor(environments.value, activeEnvironmentId.value))

  function storageKey(root: string): string {
    return `${ACTIVE_KEY_PREFIX}${root}`
  }

  function rememberActive(id: string | null): void {
    if (!projectRoot.value) return
    const key = storageKey(projectRoot.value)
    if (id) localStorage.setItem(key, id)
    else localStorage.removeItem(key)
  }

  async function refreshVault(): Promise<void> {
    vaultUnlocked.value = secrets.isVaultUnlocked()
    try {
      vaultExists.value = await secrets.secretVaultExists()
    } catch {
      vaultExists.value = false
    }
  }

  async function load(): Promise<void> {
    if (!projectRoot.value) return
    const file = await environmentService.readEnvironments(projectRoot.value)
    environments.value = (file.environments ?? []).map((environment) => ({
      ...environment,
      variables: (environment.variables ?? []).map((variable) => ({
        id: variable.id,
        key: variable.key ?? '',
        value: variable.secret ? '' : (variable.value ?? ''),
        secret: Boolean(variable.secret),
      })),
    }))
    const stored = localStorage.getItem(storageKey(projectRoot.value))
    activeEnvironmentId.value = environments.value.some((environment) => environment.id === stored)
      ? stored
      : null
    await refreshVault()
  }

  async function bindProject(root: string, id: string): Promise<void> {
    projectRoot.value = root
    projectId.value = id
    errorMessage.value = null
    await load()
  }

  function scheduleSave(): void {
    if (!projectRoot.value) return
    if (saveTimer) clearTimeout(saveTimer)
    const generation = ++saveGeneration
    const root = projectRoot.value
    const file = publicFile(environments.value)
    saveTimer = setTimeout(() => {
      void (async () => {
        if (generation !== saveGeneration) return
        try {
          await environmentService.writeEnvironments(root, file)
        } catch (error) {
          errorMessage.value = error instanceof Error ? error.message : String(error)
        }
      })()
    }, SAVE_DEBOUNCE_MS)
  }

  async function flush(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    if (!projectRoot.value) return
    const generation = ++saveGeneration
    const root = projectRoot.value
    const file = publicFile(environments.value)
    try {
      await environmentService.writeEnvironments(root, file)
    } catch (error) {
      if (generation === saveGeneration) {
        errorMessage.value = error instanceof Error ? error.message : String(error)
      }
    }
  }

  function setActiveEnvironment(id: string | null): void {
    if (id && !environments.value.some((environment) => environment.id === id)) return
    activeEnvironmentId.value = id
    rememberActive(id)
  }

  function addEnvironment(name: string): string {
    const id = crypto.randomUUID()
    environments.value = [...environments.value, { id, name, variables: [] }]
    if (!activeEnvironmentId.value) setActiveEnvironment(id)
    scheduleSave()
    return id
  }

  function renameEnvironment(id: string, name: string): void {
    environments.value = environments.value.map((environment) =>
      environment.id === id ? { ...environment, name } : environment,
    )
    scheduleSave()
  }

  async function deleteEnvironment(id: string): Promise<void> {
    const environment = environments.value.find((item) => item.id === id)
    if (environment && secrets.isVaultUnlocked() && projectId.value) {
      for (const variable of environment.variables) {
        if (!variable.secret) continue
        await secrets.deleteSecret(projectId.value, id, variable.id)
      }
    }
    environments.value = environments.value.filter((item) => item.id !== id)
    if (activeEnvironmentId.value === id) {
      setActiveEnvironment(environments.value[0]?.id ?? null)
    }
    scheduleSave()
  }

  function patchEnvironment(
    environmentId: string,
    mapVariables: (variables: EnvironmentVariable[]) => EnvironmentVariable[],
  ): void {
    environments.value = environments.value.map((environment) =>
      environment.id === environmentId
        ? { ...environment, variables: mapVariables(environment.variables) }
        : environment,
    )
    scheduleSave()
  }

  function addVariable(environmentId: string): void {
    patchEnvironment(environmentId, (variables) => [
      ...variables,
      { id: crypto.randomUUID(), key: '', value: '', secret: false },
    ])
  }

  function updateVariable(
    environmentId: string,
    variableId: string,
    patch: Partial<Pick<EnvironmentVariable, 'key' | 'value' | 'secret'>>,
  ): void {
    patchEnvironment(environmentId, (variables) =>
      variables.map((variable) =>
        variable.id === variableId ? { ...variable, ...patch } : variable,
      ),
    )
  }

  async function deleteVariable(environmentId: string, variableId: string): Promise<void> {
    const environment = environments.value.find((item) => item.id === environmentId)
    const variable = environment?.variables.find((item) => item.id === variableId)
    if (variable?.secret && secrets.isVaultUnlocked() && projectId.value) {
      await secrets.deleteSecret(projectId.value, environmentId, variableId)
    }
    patchEnvironment(environmentId, (variables) =>
      variables.filter((item) => item.id !== variableId),
    )
  }

  let pendingUnlock: Promise<boolean> | null = null

  function ensureUnlocked(): Promise<boolean> {
    if (secrets.isVaultUnlocked()) {
      vaultUnlocked.value = true
      return Promise.resolve(true)
    }
    if (pendingUnlock) return pendingUnlock
    pendingUnlock = new Promise((resolve) => {
      const finish = (unlocked: boolean): void => {
        pendingUnlock = null
        resolve(unlocked)
      }
      void secrets
        .secretVaultExists()
        .then((exists) => {
          vaultExists.value = exists
          vaultPrompt.value = { mode: exists ? 'unlock' : 'create', resolve: finish }
        })
        .catch(() => {
          vaultPrompt.value = { mode: 'create', resolve: finish }
        })
    })
    return pendingUnlock
  }

  async function submitVaultPassword(password: string): Promise<void> {
    await secrets.unlockVault(password)
    vaultUnlocked.value = true
    vaultExists.value = true
    const prompt = vaultPrompt.value
    vaultPrompt.value = null
    prompt?.resolve(true)
  }

  function cancelVaultPrompt(): void {
    const prompt = vaultPrompt.value
    vaultPrompt.value = null
    prompt?.resolve(false)
  }

  async function saveSecretValue(
    environmentId: string,
    variableId: string,
    value: string,
  ): Promise<boolean> {
    if (!projectId.value) return false
    const unlocked = await ensureUnlocked()
    if (!unlocked) return false
    await secrets.writeSecret(projectId.value, environmentId, variableId, value)
    return true
  }

  async function revealSecret(environmentId: string, variableId: string): Promise<string | null> {
    if (!projectId.value) return null
    const unlocked = await ensureUnlocked()
    if (!unlocked) return null
    return secrets.readSecret(projectId.value, environmentId, variableId)
  }

  async function setVariableSecret(
    environmentId: string,
    variableId: string,
    secret: boolean,
  ): Promise<void> {
    if (!projectId.value) return
    const environment = environments.value.find((item) => item.id === environmentId)
    const variable = environment?.variables.find((item) => item.id === variableId)
    if (!variable || variable.secret === secret) return

    const unlocked = await ensureUnlocked()
    if (!unlocked) return

    if (secret) {
      await secrets.writeSecret(projectId.value, environmentId, variableId, variable.value)
      updateVariable(environmentId, variableId, { secret: true, value: '' })
      return
    }

    const value = (await secrets.readSecret(projectId.value, environmentId, variableId)) ?? ''
    await secrets.deleteSecret(projectId.value, environmentId, variableId)
    updateVariable(environmentId, variableId, { secret: false, value })
  }

  async function loadSecretValues(
    secretIds: ReadonlyMap<string, string>,
  ): Promise<Map<string, string>> {
    const values = new Map<string, string>()
    if (secretIds.size === 0 || !projectId.value || !activeEnvironmentId.value) return values
    const unlocked = await ensureUnlocked()
    if (!unlocked) throw new VaultUnlockCancelled()
    const environmentId = activeEnvironmentId.value
    const currentProjectId = projectId.value
    for (const [name, variableId] of secretIds) {
      const value = await secrets.readSecret(currentProjectId, environmentId, variableId)
      if (value !== null) values.set(name, value)
    }
    return values
  }

  return {
    projectRoot,
    projectId,
    environments,
    activeEnvironmentId,
    activeEnvironment,
    catalog,
    vaultExists,
    vaultUnlocked,
    vaultPrompt,
    errorMessage,
    bindProject,
    flush,
    setActiveEnvironment,
    addEnvironment,
    renameEnvironment,
    deleteEnvironment,
    addVariable,
    updateVariable,
    deleteVariable,
    ensureUnlocked,
    submitVaultPassword,
    cancelVaultPrompt,
    saveSecretValue,
    revealSecret,
    setVariableSecret,
    loadSecretValues,
  }
})
