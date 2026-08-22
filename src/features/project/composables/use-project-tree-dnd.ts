import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useMessage } from 'naive-ui'
import type { TreeDragInfo, TreeDropInfo, TreeOption } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useProjectStore } from '@/stores/project'
import type { ProjectTreeOption } from '@/types/project'
import { toErrorMessage } from '@/utils/error-message'
import {
  collectNonEmptyFolderKeys,
  entryName,
  isInvalidFolderTarget,
  parentOf,
  resolveDropParent,
} from '@/utils/project-tree'

type ExpandedKey = string | number

interface UseProjectTreeDndOptions {
  treeData: Ref<ProjectTreeOption[]> | ComputedRef<ProjectTreeOption[]>
  expandedKeys: Ref<ExpandedKey[]>
  expandFolders: (relativeFolderPath: string) => void
}

export function useProjectTreeDnd(options: UseProjectTreeDndOptions) {
  const { treeData, expandedKeys, expandFolders } = options
  const projectStore = useProjectStore()
  const message = useMessage()
  const { t } = useI18n()

  const draggingNode = ref<ProjectTreeOption | null>(null)
  const isRootDropActive = ref(false)
  const isMoving = ref(false)
  const canDrag = computed(() => !isMoving.value)

  function onDragStart({ node, event }: TreeDragInfo) {
    draggingNode.value = node as ProjectTreeOption
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      // WebKitGTK/Wry on Linux can require payload data for drop eligibility.
      event.dataTransfer.setData('text/plain', String((node as ProjectTreeOption).relativePath))
    }
    // Empty expanded folders make Naive remap edge drops to the next sibling.
    const nonEmpty = new Set(collectNonEmptyFolderKeys(treeData.value))
    expandedKeys.value = expandedKeys.value.filter((key) => nonEmpty.has(String(key)))
  }

  function onDragEnd() {
    draggingNode.value = null
    isRootDropActive.value = false
  }

  function allowDrop({ node }: { node: TreeOption; phase: 'drag' | 'drop' }): boolean {
    if (!canDrag.value) return false

    const drag = draggingNode.value
    const target = node as ProjectTreeOption
    if (!drag) return true
    if (drag.key === target.key) return false

    // Any position on a folder means "move into that folder". Keep only
    // the hard-invalid case blocked to avoid the "forbidden" cursor.
    if (target.kind === 'folder') {
      return !isInvalidFolderTarget(drag, target.relativePath)
    }

    // Any position on a request is allowed. We resolve to request parent on drop.
    return !isInvalidFolderTarget(drag, parentOf(target.relativePath))
  }

  async function moveToParent(fromRelative: string, toParentRelative: string): Promise<void> {
    if (parentOf(fromRelative) === toParentRelative) return

    const baseName = entryName(fromRelative)

    isMoving.value = true
    try {
      await projectStore.moveEntry(fromRelative, toParentRelative)
      expandFolders(toParentRelative)
      message.success(
        toParentRelative
          ? t('project.toast.movedTo', { path: `${toParentRelative}/${baseName}` })
          : t('project.toast.movedToRoot', { name: baseName }),
      )
    } catch (e) {
      message.error(toErrorMessage(e))
    } finally {
      isMoving.value = false
      draggingNode.value = null
      isRootDropActive.value = false
    }
  }

  async function onDrop({ node, dragNode }: TreeDropInfo) {
    const drag = dragNode as ProjectTreeOption
    const target = node as ProjectTreeOption
    const toParent = resolveDropParent(target)

    if (isInvalidFolderTarget(drag, toParent)) {
      message.warning(t('project.dnd.cannotMoveIntoSelf'))
      return
    }

    await moveToParent(drag.relativePath, toParent)
  }

  function onTreeDragOver({ event }: TreeDragInfo): void {
    if (!canDrag.value) return
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  function onRootDragOver(event: DragEvent) {
    if (!canDrag.value || !draggingNode.value) return
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    isRootDropActive.value = true
  }

  function onRootDragLeave() {
    isRootDropActive.value = false
  }

  async function onRootDrop(event: DragEvent) {
    event.preventDefault()
    const drag = draggingNode.value
    isRootDropActive.value = false
    if (!drag || !canDrag.value) return
    await moveToParent(drag.relativePath, '')
  }

  return {
    canDrag,
    isRootDropActive,
    allowDrop,
    onDragStart,
    onDragEnd,
    onDrop,
    onTreeDragOver,
    onRootDragOver,
    onRootDragLeave,
    onRootDrop,
  }
}
