import { computed, h, ref } from 'vue'
import { NIcon, useMessage } from 'naive-ui'
import type { DropdownOption, SelectOption, TreeOption } from 'naive-ui'
import { FileAlt, FolderPlus, PenAlt, TrashAlt } from '@vicons/fa'
import { useI18n } from 'vue-i18n'
import { useProjectStore } from '@/stores/project'
import { HTTP_METHODS, type HttpMethod } from '@/types/http'
import type { ProjectEntryKind, ProjectTreeOption } from '@/types/project'
import { toErrorMessage } from '@/utils/error-message'

interface CreateModalState {
  type: ProjectEntryKind
  parentRelative: string
}

interface RenameModalState {
  relativePath: string
  kind: ProjectEntryKind
}

interface DeleteModalState {
  relativePath: string
  kind: ProjectEntryKind
  name: string
}

interface ContextMenuState {
  x: number
  y: number
  option: ProjectTreeOption
}

const createModal = ref<CreateModalState | null>(null)
const createName = ref('')
const createHttpMethod = ref<HttpMethod>(HTTP_METHODS[0])
const renameModal = ref<RenameModalState | null>(null)
const renameName = ref('')
const deleteModal = ref<DeleteModalState | null>(null)
const contextMenu = ref<ContextMenuState | null>(null)

const methodOptions: SelectOption[] = HTTP_METHODS.map((method) => ({
  label: method,
  value: method,
}))

export function useProjectTreeActions() {
  const projectStore = useProjectStore()
  const message = useMessage()
  const { t } = useI18n()

  function openCreate(type: ProjectEntryKind, parentRelative = ''): void {
    createModal.value = { type, parentRelative }
    createName.value = ''
    createHttpMethod.value = HTTP_METHODS[0]
  }

  function closeCreate(): void {
    createModal.value = null
  }

  async function confirmCreate(): Promise<boolean> {
    if (!createModal.value) return false
    const nameValue = createName.value.trim()
    const httpMethodValue = createHttpMethod.value
    if (!nameValue) {
      message.warning(t('validation.nameRequired'))
      return false
    }

    try {
      if (createModal.value.type === 'folder') {
        await projectStore.createFolder(createModal.value.parentRelative, nameValue)
        message.success(t('project.toast.folderCreated'))
      } else {
        await projectStore.createRequest(
          createModal.value.parentRelative,
          nameValue,
          httpMethodValue,
        )
        message.success(t('project.toast.requestCreated'))
      }
      closeCreate()
      return true
    } catch (e) {
      message.error(toErrorMessage(e))
      return false
    }
  }

  function openRename(option: ProjectTreeOption): void {
    renameModal.value = {
      relativePath: option.relativePath,
      kind: option.kind,
    }
    renameName.value = String(option.label ?? '')
  }

  function closeRename(): void {
    renameModal.value = null
  }

  async function confirmRename(): Promise<boolean> {
    if (!renameModal.value) return false
    const nameValue = renameName.value.trim()
    if (!nameValue) {
      message.warning(t('validation.nameRequired'))
      return false
    }

    try {
      await projectStore.renameEntry(renameModal.value.relativePath, nameValue)
      message.success(t('project.toast.renamed'))
      closeRename()
      return true
    } catch (e) {
      message.error(toErrorMessage(e))
      return false
    }
  }

  function openDelete(option: ProjectTreeOption): void {
    deleteModal.value = {
      relativePath: option.relativePath,
      kind: option.kind,
      name: String(option.label ?? ''),
    }
  }

  function closeDelete(): void {
    deleteModal.value = null
  }

  async function confirmDelete(): Promise<boolean> {
    if (!deleteModal.value) return false
    try {
      await projectStore.deleteEntry(deleteModal.value.relativePath)
      message.success(t('project.toast.deleted'))
      closeDelete()
      return true
    } catch (e) {
      message.error(toErrorMessage(e))
      return false
    }
  }

  const dropdownOptions = computed<DropdownOption[]>(() => {
    const option = contextMenu.value?.option
    if (!option) return []

    const items: DropdownOption[] = []
    if (option.kind === 'folder') {
      items.push(
        {
          label: t('project.actions.newFolder'),
          key: 'new-folder',
          icon: () => h(NIcon, { component: FolderPlus }),
        },
        {
          label: t('project.actions.newRequest'),
          key: 'new-request',
          icon: () => h(NIcon, { component: FileAlt }),
        },
      )
    }
    items.push(
      {
        label: t('common.rename'),
        key: 'rename',
        icon: () => h(NIcon, { component: PenAlt }),
      },
      {
        label: t('common.delete'),
        key: 'delete',
        icon: () => h(NIcon, { component: TrashAlt }),
      },
    )
    return items
  })

  function closeContextMenu(): void {
    contextMenu.value = null
  }

  function nodeProps({ option }: { option: TreeOption }) {
    return {
      onContextmenu(e: MouseEvent) {
        e.preventDefault()
        contextMenu.value = {
          x: e.clientX,
          y: e.clientY,
          option: option as ProjectTreeOption,
        }
      },
    }
  }

  function onDropdownSelect(key: string | number): void {
    const option = contextMenu.value?.option
    closeContextMenu()
    if (!option) return

    if (key === 'new-folder') {
      openCreate('folder', option.relativePath)
      return
    }
    if (key === 'new-request') {
      openCreate('request', option.relativePath)
      return
    }
    if (key === 'rename') {
      openRename(option)
      return
    }
    if (key === 'delete') {
      openDelete(option)
    }
  }

  return {
    createModal,
    createName,
    createHttpMethod,
    methodOptions,
    openCreate,
    closeCreate,
    confirmCreate,
    renameModal,
    renameName,
    closeRename,
    confirmRename,
    deleteModal,
    closeDelete,
    confirmDelete,
    contextMenu,
    dropdownOptions,
    nodeProps,
    onDropdownSelect,
    closeContextMenu,
  }
}
