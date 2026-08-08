<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import {
  NButton,
  NDropdown,
  NEmpty,
  NIcon,
  NInput,
  NModal,
  NSpace,
  NTree,
  NSelect,
  NTooltip,
  NText,
  useMessage,
} from 'naive-ui'
import type { DropdownOption, TreeDragInfo, TreeDropInfo, TreeOption, SelectOption } from 'naive-ui'
import { FolderOpen, FolderPlus, FileAlt, TrashAlt, PenAlt } from '@vicons/fa'
import { storeToRefs } from 'pinia'
import HttpMethodTag from '@/components/ui/HttpMethodTag.vue'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import { HTTP_METHODS, type HttpMethod } from '@/types/http'
import type { ProjectTreeNode } from '@/types/project'

interface ProjectTreeOption extends TreeOption {
  key: string
  relativePath: string
  kind: 'folder' | 'request'
  method?: HttpMethod
}

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const { tree, name, hasProject, rootPath } = storeToRefs(projectStore)
const { activeRequestPath } = storeToRefs(workspaceStore)
const message = useMessage()

const search = ref('')
const createModal = ref<{
  type: 'folder' | 'request'
  parentRelative: string
} | null>(null)
const createName = ref('')
const createHttpMethod = ref(HTTP_METHODS[0])
const methodOptions: SelectOption[] = HTTP_METHODS.map((method) => ({
  label: method,
  value: method,
}))
const renameModal = ref<{
  relativePath: string
  kind: 'folder' | 'request'
} | null>(null)
const renameName = ref('')
const contextMenu = ref<{
  x: number
  y: number
  option: ProjectTreeOption
} | null>(null)
const draggingNode = ref<ProjectTreeOption | null>(null)
const isRootDropActive = ref(false)
const isMoving = ref(false)
const expandedKeys = ref<Array<string | number>>([])
const knownFolderKeys = ref(new Set<string>())
/** Snapshot of expanded folders before search expands everything. */
const expandedKeysBeforeSearch = ref<Array<string | number> | null>(null)

const EXPANDED_STORAGE_PREFIX = 'project-sidebar:expanded:'

const isSearchActive = computed(() => search.value.trim().length > 0)
// Allow dragging even while searching; we'll still validate on drop.
const canDrag = computed(() => !isMoving.value)

function storageKeyForProject(path: string): string {
  return `${EXPANDED_STORAGE_PREFIX}${path}`
}

function loadExpandedKeys(path: string): string[] {
  try {
    const raw = localStorage.getItem(storageKeyForProject(path))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((key): key is string => typeof key === 'string')
  } catch {
    return []
  }
}

function saveExpandedKeys(path: string, keys: Array<string | number>): void {
  try {
    localStorage.setItem(storageKeyForProject(path), JSON.stringify(keys.map(String)))
  } catch {
    // Quota / private mode — ignore; expansion still works in-session.
  }
}

function parentOf(relativePath: string): string {
  const index = relativePath.lastIndexOf('/')
  return index === -1 ? '' : relativePath.slice(0, index)
}

function folderKeysForPath(relativePath: string): string[] {
  if (!relativePath) return []
  const parts = relativePath.split('/')
  const keys: string[] = []
  for (let i = 0; i < parts.length; i += 1) {
    keys.push(`folder:${parts.slice(0, i + 1).join('/')}`)
  }
  return keys
}

function collectFolderKeys(nodes: ProjectTreeOption[]): string[] {
  const keys: string[] = []
  for (const node of nodes) {
    if (node.kind !== 'folder') continue
    keys.push(String(node.key))
    if (Array.isArray(node.children) && node.children.length > 0) {
      keys.push(...collectFolderKeys(node.children as ProjectTreeOption[]))
    }
  }
  return keys
}

/** Only folders that have children — empty expanded folders break Naive drop targeting. */
function collectNonEmptyFolderKeys(nodes: ProjectTreeOption[]): string[] {
  const keys: string[] = []
  for (const node of nodes) {
    if (node.kind !== 'folder') continue
    const children = Array.isArray(node.children) ? (node.children as ProjectTreeOption[]) : []
    if (children.length === 0) continue
    keys.push(String(node.key))
    keys.push(...collectNonEmptyFolderKeys(children))
  }
  return keys
}

function expandFolders(relativeFolderPath: string): void {
  if (!relativeFolderPath) return
  const next = new Set(expandedKeys.value.map(String))
  for (const key of folderKeysForPath(relativeFolderPath)) {
    next.add(key)
  }
  expandedKeys.value = [...next]
}

function toTreeOptions(nodes: ProjectTreeNode[], query: string): ProjectTreeOption[] {
  const result: ProjectTreeOption[] = []

  for (const node of nodes) {
    if (node.kind === 'folder') {
      const children = toTreeOptions(node.children, query)
      const matchesSelf = !query || node.name.toLowerCase().includes(query)
      if (!query || matchesSelf || children.length > 0) {
        result.push({
          key: `folder:${node.relativePath}`,
          label: node.name,
          relativePath: node.relativePath,
          kind: 'folder',
          // Keep empty folders droppable / expandable in Naive Tree.
          isLeaf: false,
          children: matchesSelf && !query ? toTreeOptions(node.children, '') : children,
        })
      }
      continue
    }

    const haystack = `${node.name} ${node.method} ${node.relativePath}`.toLowerCase()
    if (query && !haystack.includes(query)) continue

    result.push({
      key: `request:${node.relativePath}`,
      label: node.name,
      relativePath: node.relativePath,
      kind: 'request',
      method: node.method,
      isLeaf: true,
    })
  }

  return result
}

const treeData = computed(() => {
  const query = search.value.trim().toLowerCase()
  return toTreeOptions(tree.value, query)
})

watch(
  rootPath,
  (path) => {
    knownFolderKeys.value = new Set()
    expandedKeysBeforeSearch.value = null
    expandedKeys.value = path ? loadExpandedKeys(path) : []
  },
  { immediate: true },
)

watch(
  treeData,
  (nodes) => {
    const folderKeys = collectFolderKeys(nodes)
    const folderKeySet = new Set(folderKeys)
    const nonEmptyFolderKeys = collectNonEmptyFolderKeys(nodes)
    const nonEmptyFolderKeySet = new Set(nonEmptyFolderKeys)

    if (knownFolderKeys.value.size === 0) {
      // Restore persisted expansion (or stay collapsed). Never force-open all.
      expandedKeys.value = expandedKeys.value
        .map(String)
        .filter((key) => nonEmptyFolderKeySet.has(key))
    } else {
      const retained = expandedKeys.value.map(String).filter((key) => folderKeySet.has(key))
      // Auto-expand newly created non-empty folders so the new item is visible.
      const discovered = nonEmptyFolderKeys.filter((key) => !knownFolderKeys.value.has(key))

      const expanded = new Set<string>()
      for (const key of retained) {
        // Keep user-expanded non-empty folders. Collapse empty ones so edge
        // drops are not remapped to the next sibling by Naive Tree.
        if (nonEmptyFolderKeySet.has(key)) expanded.add(key)
      }
      for (const key of discovered) expanded.add(key)

      expandedKeys.value = [...expanded]
    }

    knownFolderKeys.value = folderKeySet

    // Search should reveal matches under collapsed folders without persisting.
    if (isSearchActive.value) {
      expandedKeys.value = collectFolderKeys(nodes)
    }
  },
  { immediate: true },
)

watch(isSearchActive, (searching, wasSearching) => {
  if (searching && !wasSearching) {
    expandedKeysBeforeSearch.value = [...expandedKeys.value]
    expandedKeys.value = collectFolderKeys(treeData.value)
    return
  }
  if (!searching && wasSearching && expandedKeysBeforeSearch.value) {
    const nonEmpty = new Set(collectNonEmptyFolderKeys(treeData.value))
    expandedKeys.value = expandedKeysBeforeSearch.value
      .map(String)
      .filter((key) => nonEmpty.has(key))
    expandedKeysBeforeSearch.value = null
  }
})

watch(expandedKeys, (keys) => {
  if (!rootPath.value || isSearchActive.value) return
  saveExpandedKeys(rootPath.value, keys)
})

const selectedKeys = computed(() => {
  if (activeRequestPath.value) {
    return [`request:${activeRequestPath.value}`]
  }
  return []
})

function onUpdateExpandedKeys(keys: Array<string | number>): void {
  expandedKeys.value = keys
}

function renderLabel({ option }: { option: TreeOption }) {
  const node = option as ProjectTreeOption

  if (node.kind === 'request' && node.method) {
    return h('span', { class: 'tree-request' }, [
      h(HttpMethodTag, { method: node.method }),
      h('span', { class: 'tree-request__name' }, String(node.label ?? '')),
    ])
  }

  return h('span', { class: 'tree-folder' }, [
    h(NIcon, { size: 14, component: FolderOpen }),
    h('span', String(node.label ?? '')),
  ])
}

async function onSelect(keys: Array<string | number>) {
  const key = String(keys[0] ?? '')
  if (!key.startsWith('request:')) return
  const relativePath = key.slice('request:'.length)
  try {
    await projectStore.selectRequest(relativePath)
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  }
}

function openCreate(type: 'folder' | 'request', parentRelative = '') {
  createModal.value = { type, parentRelative }
  createName.value = ''
}

async function confirmCreate(): Promise<boolean> {
  if (!createModal.value) return false
  const nameValue = createName.value.trim()
  const httpMethodValue = createHttpMethod.value
  if (!nameValue) {
    message.warning('El nombre no puede estar vacío')
    return false
  }

  try {
    if (createModal.value.type === 'folder') {
      await projectStore.createFolder(createModal.value.parentRelative, nameValue)
      message.success('Carpeta creada')
    } else {
      await projectStore.createRequest(createModal.value.parentRelative, nameValue, httpMethodValue)
      message.success('Petición creada')
    }
    createModal.value = null
    return true
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
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
        label: 'Nueva carpeta',
        key: 'new-folder',
        icon: () => h(NIcon, { component: FolderPlus }),
      },
      {
        label: 'Nueva petición',
        key: 'new-request',
        icon: () => h(NIcon, { component: FileAlt }),
      },
    )
  }
  items.push(
    {
      label: 'Cambiar nombre',
      key: 'rename',
      icon: () => h(NIcon, { component: PenAlt }),
    },
    {
      label: 'Eliminar',
      key: 'delete',
      icon: () => h(NIcon, { component: TrashAlt }),
    },
  )
  return items
})

function openRename(option: ProjectTreeOption): void {
  renameModal.value = {
    relativePath: option.relativePath,
    kind: option.kind,
  }
  renameName.value = String(option.label ?? '')
}

async function confirmRename(): Promise<boolean> {
  if (!renameModal.value) return false
  const nameValue = renameName.value.trim()
  if (!nameValue) {
    message.warning('El nombre no puede estar vacío')
    return false
  }

  try {
    await projectStore.renameEntry(renameModal.value.relativePath, nameValue)
    message.success('Nombre actualizado')
    renameModal.value = null
    return true
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
    return false
  }
}

function onNodeContextMenu(event: MouseEvent, option: TreeOption) {
  event.preventDefault()
  contextMenu.value = {
    x: event.clientX,
    y: event.clientY,
    option: option as ProjectTreeOption,
  }
}

async function onDropdownSelect(key: string | number) {
  const option = contextMenu.value?.option
  contextMenu.value = null
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
    try {
      await projectStore.deleteEntry(option.relativePath)
      message.success('Eliminado')
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }
}

function closeContextMenu() {
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

function isInvalidFolderTarget(drag: ProjectTreeOption, targetPath: string): boolean {
  if (drag.kind !== 'folder') return false
  return targetPath === drag.relativePath || targetPath.startsWith(`${drag.relativePath}/`)
}

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

function resolveDropParent(target: ProjectTreeOption): string {
  if (target.kind === 'folder') {
    return target.relativePath
  }
  return parentOf(target.relativePath)
}

async function moveToParent(fromRelative: string, toParentRelative: string): Promise<void> {
  if (parentOf(fromRelative) === toParentRelative) return

  const baseName = fromRelative.split('/').pop() ?? fromRelative

  isMoving.value = true
  try {
    await projectStore.moveEntry(fromRelative, toParentRelative)
    expandFolders(toParentRelative)
    message.success(
      toParentRelative
        ? `Movido a ${toParentRelative}/${baseName}`
        : `Movido a la raíz: ${baseName}`,
    )
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
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
    message.warning('No se puede mover una carpeta dentro de sí misma')
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
</script>

<template>
  <div class="project-sidebar">
    <div class="project-sidebar__header">
      <span class="project-sidebar__title">
        <n-tooltip trigger="hover" placement="bottom">
          <template #trigger>
            <n-text strong>
              {{ hasProject ? name : 'Proyecto' }}
            </n-text>
          </template>
          {{ rootPath }}
        </n-tooltip>
      </span>
      <n-space v-if="hasProject" :size="4">
        <n-tooltip trigger="hover" placement="bottom">
          <template #trigger>
            <n-button size="tiny" quaternary @click="openCreate('folder')">
              <template #icon>
                <n-icon :component="FolderPlus" />
              </template>
            </n-button>
          </template>
          Crear carpeta
        </n-tooltip>
        <n-tooltip trigger="hover" placement="bottom">
          <template #trigger>
            <n-button size="tiny" quaternary @click="openCreate('request')">
              <template #icon>
                <n-icon :component="FileAlt" />
              </template>
            </n-button>
          </template>
          Crear petición
        </n-tooltip>
      </n-space>
    </div>

    <template v-if="hasProject">
      <div class="project-sidebar__search">
        <n-input v-model:value="search" clearable placeholder="Buscar…" size="small" />
      </div>

      <div class="project-sidebar__tree" @click="closeContextMenu">
        <n-tree
          v-if="treeData.length > 0"
          block-line
          expand-on-click
          :node-props="nodeProps"
          :expand-on-dragenter="false"
          :animated="false"
          :draggable="canDrag"
          :data="treeData"
          :selected-keys="selectedKeys"
          :expanded-keys="expandedKeys"
          :render-label="renderLabel"
          :allow-drop="allowDrop"
          @update:selected-keys="onSelect"
          @update:expanded-keys="onUpdateExpandedKeys"
          @node-contextmenu.prevent="onNodeContextMenu"
          @dragstart="onDragStart"
          @dragover="onTreeDragOver"
          @dragend="onDragEnd"
          @drop="onDrop"
        />
        <n-empty v-else description="Sin carpetas ni peticiones" size="small" />

        <div
          v-if="treeData.length > 0 && canDrag"
          class="project-sidebar__root-drop"
          :class="{ 'project-sidebar__root-drop--active': isRootDropActive }"
          @dragover="onRootDragOver"
          @dragleave="onRootDragLeave"
          @drop="onRootDrop"
        >
          Soltar aquí para mover a la raíz
        </div>
      </div>
    </template>

    <div v-else class="project-sidebar__empty">
      <n-empty description="Abre o crea un proyecto desde la barra derecha" size="small" />
    </div>

    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="contextMenu?.x ?? 0"
      :y="contextMenu?.y ?? 0"
      :show="contextMenu !== null"
      :options="dropdownOptions"
      @select="onDropdownSelect"
      @clickoutside="closeContextMenu"
    />

    <n-modal
      :show="createModal !== null"
      preset="dialog"
      :title="createModal?.type === 'folder' ? 'Nueva carpeta' : 'Nueva petición'"
      positive-text="Crear"
      negative-text="Cancelar"
      @positive-click="confirmCreate"
      @negative-click="createModal = null"
      @close="createModal = null"
      @update:show="(show) => !show && (createModal = null)"
    >
      <n-space vertical size="medium">
        <n-input
          v-model:value="createName"
          :placeholder="createModal?.type === 'folder' ? 'Nombre de carpeta' : 'Nombre de petición'"
          @keyup.enter="confirmCreate"
        />

        <n-select
          v-if="createModal?.type === 'request'"
          v-model:value="createHttpMethod"
          :options="methodOptions"
        />
      </n-space>
    </n-modal>

    <n-modal
      :show="renameModal !== null"
      preset="dialog"
      title="Cambiar nombre"
      positive-text="Guardar"
      negative-text="Cancelar"
      @positive-click="confirmRename"
      @negative-click="renameModal = null"
      @close="renameModal = null"
      @update:show="(show) => !show && (renameModal = null)"
    >
      <n-input
        v-model:value="renameName"
        :placeholder="renameModal?.kind === 'folder' ? 'Nombre de carpeta' : 'Nombre de petición'"
        @keyup.enter="confirmRename"
      />
    </n-modal>
  </div>
</template>

<style scoped>
.project-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--app-sidebar-bg);
}

.project-sidebar__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  gap: 8px;
}

.project-sidebar__title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--app-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-sidebar__search {
  flex-shrink: 0;
  padding: 0 12px 10px;
}

.project-sidebar__tree {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0 6px 12px;
}

.project-sidebar__root-drop {
  margin-top: 8px;
  padding: 10px 8px;
  border: 1px dashed transparent;
  border-radius: 6px;
  font-size: 11px;
  color: var(--app-muted);
  text-align: center;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.project-sidebar__root-drop--active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.project-sidebar__empty {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 16px;
}

.project-sidebar__tree :deep(.tree-folder),
.project-sidebar__tree :deep(.tree-request) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.project-sidebar__tree :deep(.tree-request__name) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
