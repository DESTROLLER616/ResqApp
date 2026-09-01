import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { i18n } from '@/i18n'
import * as workspaceService from '@/services/workspace'
import type { HttpMethod, RequestDraft } from '@/types/http'
import type { OpenedProject, ProjectTreeNode } from '@/types/project'
import { useRecentProjectsStore } from '@/stores/recent-projects'
import { useWorkspaceStore } from '@/stores/workspace'
import { entryName, parentOf } from '@/utils/project-tree'

const SAVE_DEBOUNCE_MS = 300

function ensureDraftShape(draft: RequestDraft): RequestDraft {
  return {
    ...draft,
    params: draft.params ?? [],
    headers: draft.headers ?? [],
    body: draft.body ?? '',
  }
}

function findRequestName(tree: ProjectTreeNode[], relativePath: string): string | null {
  for (const node of tree) {
    if (node.kind === 'request' && node.relativePath === relativePath) {
      return node.name
    }
    if (node.kind === 'folder') {
      const found = findRequestName(node.children, relativePath)
      if (found) return found
    }
  }
  return null
}

export const useProjectStore = defineStore('project', () => {
  const rootPath = ref<string | null>(null)
  const name = ref<string | null>(null)
  const tree = ref<ProjectTreeNode[]>([])
  const activeDraft = ref<RequestDraft | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let saveGeneration = 0

  const hasProject = computed(() => rootPath.value !== null)

  function applyOpened(project: OpenedProject): void {
    rootPath.value = project.rootPath
    name.value = project.name
    tree.value = project.tree
    errorMessage.value = null
  }

  async function reloadRecents(): Promise<void> {
    const recentStore = useRecentProjectsStore()
    await recentStore.load()
  }

  async function openProject(path: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const project = await workspaceService.openProject(path)
      applyOpened(project)
      const workspaceStore = useWorkspaceStore()
      workspaceStore.resetForProject()
      activeDraft.value = null
      await reloadRecents()
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function createProject(parentDir: string, projectName: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const project = await workspaceService.createProject(parentDir, projectName)
      applyOpened(project)
      const workspaceStore = useWorkspaceStore()
      workspaceStore.resetForProject()
      activeDraft.value = null
      await reloadRecents()
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function initProject(path: string, projectName?: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const project = await workspaceService.initProject(path, projectName)
      applyOpened(project)
      const workspaceStore = useWorkspaceStore()
      workspaceStore.resetForProject()
      activeDraft.value = null
      await reloadRecents()
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function refresh(): Promise<void> {
    if (!rootPath.value) return
    const project = await workspaceService.refreshProject(rootPath.value)
    applyOpened(project)
  }

  async function createFolder(parentRelative: string, folderName: string): Promise<void> {
    if (!rootPath.value) return
    const project = await workspaceService.createFolder(rootPath.value, parentRelative, folderName)
    applyOpened(project)
  }

  async function createRequest(
    parentRelative: string,
    requestName: string,
    httpMethod: HttpMethod,
  ): Promise<string> {
    if (!rootPath.value) {
      throw new Error(i18n.global.t('errors.noProjectOpen'))
    }
    const project = await workspaceService.createRequest(
      rootPath.value,
      parentRelative,
      requestName,
      {
        body: '',
        headers: [],
        method: httpMethod,
        name: requestName,
        params: [],
        url: '',
      },
    )
    applyOpened(project)

    const stem = requestName.replace(/\.json$/i, '')
    const relativePath = parentRelative ? `${parentRelative}/${stem}.json` : `${stem}.json`

    await selectRequest(relativePath)
    return relativePath
  }

  async function renameEntry(relativePath: string, newName: string): Promise<string> {
    if (!rootPath.value) {
      throw new Error(i18n.global.t('errors.noProjectOpen'))
    }

    const trimmed = newName.trim()
    if (!trimmed) {
      throw new Error(i18n.global.t('validation.nameRequired'))
    }

    await flushSave()

    const isRequest = relativePath.toLowerCase().endsWith('.json')
    const stem = trimmed.replace(/\.json$/i, '')
    const baseName = isRequest ? `${stem}.json` : stem
    const parent = parentOf(relativePath)
    const newRelative = parent ? `${parent}/${baseName}` : baseName

    if (newRelative === relativePath) {
      return newRelative
    }

    const project = await workspaceService.renameEntry(rootPath.value, relativePath, trimmed)
    applyOpened(project)

    const workspaceStore = useWorkspaceStore()
    workspaceStore.remapPaths(relativePath, newRelative)
    if (isRequest) {
      workspaceStore.renameTab(newRelative, stem)
    }

    if (activeDraft.value) {
      const draftId = activeDraft.value.id
      if (draftId === relativePath || draftId === newRelative) {
        activeDraft.value.id = newRelative
        activeDraft.value.name = stem
      } else if (draftId.startsWith(`${relativePath}/`)) {
        activeDraft.value.id = `${newRelative}${draftId.slice(relativePath.length)}`
      }
    }

    return newRelative
  }

  async function deleteEntry(relativePath: string): Promise<void> {
    if (!rootPath.value) return
    const workspaceStore = useWorkspaceStore()
    const project = await workspaceService.deleteEntry(rootPath.value, relativePath)
    applyOpened(project)
    workspaceStore.closeMatching(relativePath)

    if (
      activeDraft.value?.id === relativePath ||
      activeDraft.value?.id.startsWith(`${relativePath}/`)
    ) {
      activeDraft.value = null
      const activePath = workspaceStore.activeRequestPath
      if (activePath) {
        await selectRequest(activePath)
      }
    }
  }

  async function moveEntry(fromRelative: string, toParentRelative: string): Promise<string> {
    if (!rootPath.value) {
      throw new Error(i18n.global.t('errors.noProjectOpen'))
    }

    await flushSave()

    const baseName = entryName(fromRelative)
    if (!baseName) {
      throw new Error(i18n.global.t('errors.invalidSourcePath'))
    }
    const newRelative = toParentRelative ? `${toParentRelative}/${baseName}` : baseName

    if (newRelative === fromRelative) {
      return newRelative
    }

    const project = await workspaceService.moveEntry(rootPath.value, fromRelative, toParentRelative)
    applyOpened(project)

    const workspaceStore = useWorkspaceStore()
    workspaceStore.remapPaths(fromRelative, newRelative)

    if (activeDraft.value) {
      const draftId = activeDraft.value.id
      if (draftId === fromRelative) {
        activeDraft.value.id = newRelative
      } else if (draftId.startsWith(`${fromRelative}/`)) {
        activeDraft.value.id = `${newRelative}${draftId.slice(fromRelative.length)}`
      }
    }

    return newRelative
  }

  async function selectRequest(relativePath: string): Promise<void> {
    if (!rootPath.value) return
    await flushSave()

    const draft = ensureDraftShape(await workspaceService.readRequest(rootPath.value, relativePath))
    activeDraft.value = draft

    const tabName = findRequestName(tree.value, relativePath) ?? draft.name ?? relativePath
    const workspaceStore = useWorkspaceStore()
    workspaceStore.openRequest(relativePath, tabName)
  }

  function scheduleSave(): void {
    if (!rootPath.value || !activeDraft.value) return
    if (saveTimer) clearTimeout(saveTimer)
    const generation = ++saveGeneration
    const path = rootPath.value
    const draft = { ...activeDraft.value }
    saveTimer = setTimeout(() => {
      void (async () => {
        if (generation !== saveGeneration) return
        try {
          await workspaceService.writeRequest(path, draft.id, draft)
          // Keep tree method badge in sync
          updateTreeMethod(draft.id, draft.method)
        } catch (e) {
          errorMessage.value = e instanceof Error ? e.message : String(e)
        }
      })()
    }, SAVE_DEBOUNCE_MS)
  }

  async function flushSave(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    if (!rootPath.value || !activeDraft.value) return
    const generation = ++saveGeneration
    const path = rootPath.value
    const draft = { ...activeDraft.value }
    try {
      await workspaceService.writeRequest(path, draft.id, draft)
      if (generation === saveGeneration) {
        updateTreeMethod(draft.id, draft.method)
      }
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
    }
  }

  function updateTreeMethod(relativePath: string, method: HttpMethod): void {
    const mapNodes = (nodes: ProjectTreeNode[]): ProjectTreeNode[] =>
      nodes.map((node) => {
        if (node.kind === 'request' && node.relativePath === relativePath) {
          return { ...node, method }
        }
        if (node.kind === 'folder') {
          return { ...node, children: mapNodes(node.children) }
        }
        return node
      })
    tree.value = mapNodes(tree.value)
  }

  function updateActiveRequest(patch: Partial<Omit<RequestDraft, 'id'>>): void {
    if (!activeDraft.value) return
    Object.assign(activeDraft.value, patch)
    if (typeof patch.name === 'string') {
      const workspaceStore = useWorkspaceStore()
      workspaceStore.renameTab(activeDraft.value.id, patch.name)
    }
    scheduleSave()
  }

  function clearActiveDraft(): void {
    activeDraft.value = null
  }

  return {
    rootPath,
    name,
    tree,
    activeDraft,
    isLoading,
    errorMessage,
    hasProject,
    openProject,
    createProject,
    initProject,
    refresh,
    createFolder,
    createRequest,
    renameEntry,
    deleteEntry,
    moveEntry,
    selectRequest,
    updateActiveRequest,
    flushSave,
    clearActiveDraft,
  }
})
