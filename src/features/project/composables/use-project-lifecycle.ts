import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import * as workspaceService from '@/services/workspace'
import { useProjectStore } from '@/stores/project'
import { useRecentProjectsStore } from '@/stores/recent-projects'

const createModalOpen = ref(false)
const createName = ref('')
const createParentDir = ref<string | null>(null)
const initModalOpen = ref(false)
const initPath = ref<string | null>(null)
const initName = ref('')

export function useProjectLifecycle() {
  const message = useMessage()
  const projectStore = useProjectStore()
  const recentStore = useRecentProjectsStore()

  async function openProject(): Promise<void> {
    try {
      const path = await workspaceService.pickDirectory('Abrir proyecto')
      if (!path) return

      try {
        await projectStore.openProject(path)
        await recentStore.load()
      } catch {
        initPath.value = path
        const parts = path.split(/[/\\]/).filter(Boolean)
        initName.value = parts[parts.length - 1] ?? 'Project'
        initModalOpen.value = true
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  async function createProject(): Promise<void> {
    try {
      const parent = await workspaceService.pickDirectory('Carpeta padre del proyecto')
      if (!parent) return
      createParentDir.value = parent
      createName.value = ''
      createModalOpen.value = true
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  async function confirmCreate(): Promise<boolean> {
    if (!createParentDir.value) return false
    const name = createName.value.trim()
    if (!name) {
      message.warning('El nombre no puede estar vacío')
      return false
    }
    try {
      await projectStore.createProject(createParentDir.value, name)
      await recentStore.load()
      createModalOpen.value = false
      message.success('Proyecto creado')
      return true
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
      return false
    }
  }

  async function confirmInit(): Promise<boolean> {
    if (!initPath.value) return false
    try {
      await projectStore.initProject(initPath.value, initName.value.trim() || undefined)
      await recentStore.load()
      initModalOpen.value = false
      message.success('Proyecto inicializado')
      return true
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
      return false
    }
  }

  return {
    createModalOpen,
    createName,
    createParentDir,
    initModalOpen,
    initPath,
    initName,
    openProject,
    createProject,
    confirmCreate,
    confirmInit,
  }
}
