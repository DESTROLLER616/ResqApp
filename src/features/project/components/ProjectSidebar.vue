<script setup lang="ts">
import { computed, h, ref } from 'vue'
import {
  NButton,
  NDropdown,
  NEmpty,
  NIcon,
  NInput,
  NSpace,
  NTree,
  NTooltip,
  NText,
  useMessage,
} from 'naive-ui'
import type { TreeOption } from 'naive-ui'
import { FolderOpen, FolderPlus, FileAlt, Cog } from '@vicons/fa'
import { storeToRefs } from 'pinia'
import HttpMethodTag from '@/components/ui/HttpMethodTag.vue'
import ProjectEntryModals from '@/features/project/components/ProjectEntryModals.vue'
import { useProjectTreeActions } from '@/features/project/composables/use-project-tree-actions'
import { useProjectTreeDnd } from '@/features/project/composables/use-project-tree-dnd'
import { useProjectTreeExpansion } from '@/features/project/composables/use-project-tree-expansion'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import type { ProjectTreeOption } from '@/types/project'
import { toErrorMessage } from '@/utils/error-message'
import { relativePathFromRequestKey, requestTreeKey, toTreeOptions } from '@/utils/project-tree'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const { tree, name, hasProject, rootPath } = storeToRefs(projectStore)
const { activeRequestPath, activePanel } = storeToRefs(workspaceStore)
const message = useMessage()

const search = ref('')
const isSearchActive = computed(() => search.value.trim().length > 0)
const treeData = computed(() => toTreeOptions(tree.value, search.value.trim().toLowerCase()))

const { expandedKeys, onUpdateExpandedKeys, expandFolders } = useProjectTreeExpansion({
  rootPath,
  treeData,
  isSearchActive,
})

const {
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
} = useProjectTreeDnd({
  treeData,
  expandedKeys,
  expandFolders,
})

const { openCreate, contextMenu, dropdownOptions, nodeProps, onDropdownSelect, closeContextMenu } =
  useProjectTreeActions()

const selectedKeys = computed(() => {
  if (activePanel.value === 'documentation') {
    return []
  }
  if (activeRequestPath.value) {
    return [requestTreeKey(activeRequestPath.value)]
  }
  return []
})

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
  const relativePath = relativePathFromRequestKey(String(keys[0] ?? ''))
  if (!relativePath) return
  try {
    await projectStore.selectRequest(relativePath)
  } catch (e) {
    message.error(toErrorMessage(e))
  }
}

async function openDocumentation(): Promise<void> {
  await projectStore.flushSave()
  workspaceStore.openDocumentation(t('project.documentation.title'))
}
</script>

<template>
  <div class="project-sidebar">
    <div class="project-sidebar__header">
      <span class="project-sidebar__title">
        <n-tooltip trigger="hover" placement="bottom">
          <template #trigger>
            <n-text strong>
              {{ hasProject ? name : t('project.untitled') }}
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
          {{ t('project.actions.newFolder') }}
        </n-tooltip>
        <n-tooltip trigger="hover" placement="bottom">
          <template #trigger>
            <n-button size="tiny" quaternary @click="openCreate('request')">
              <template #icon>
                <n-icon :component="FileAlt" />
              </template>
            </n-button>
          </template>
          {{ t('project.actions.newRequest') }}
        </n-tooltip>
        <n-tooltip trigger="hover" placement="bottom">
          <template #trigger>
            <n-button
              size="tiny"
              :quaternary="activePanel !== 'documentation'"
              :type="activePanel === 'documentation' ? 'primary' : 'default'"
              @click="openDocumentation"
            >
              <template #icon>
                <n-icon :component="Cog" />
              </template>
            </n-button>
          </template>
          {{ t('project.settings') }}
        </n-tooltip>
      </n-space>
    </div>

    <template v-if="hasProject">
      <div class="project-sidebar__search">
        <n-input v-model:value="search" clearable :placeholder="t('common.search')" size="small" />
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
          @dragstart="onDragStart"
          @dragover="onTreeDragOver"
          @dragend="onDragEnd"
          @drop="onDrop"
        />
        <n-empty v-else :description="t('project.empty.tree')" size="small" />

        <div
          v-if="treeData.length > 0 && canDrag"
          class="project-sidebar__root-drop"
          :class="{ 'project-sidebar__root-drop--active': isRootDropActive }"
          @dragover="onRootDragOver"
          @dragleave="onRootDragLeave"
          @drop="onRootDrop"
        >
          {{ t('project.dnd.dropToRoot') }}
        </div>
      </div>
    </template>

    <div v-else class="project-sidebar__empty">
      <n-empty :description="t('project.empty.workspace')" size="small" />
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

    <ProjectEntryModals />
  </div>
</template>

<style scoped src="@/styles/project-sidebar.css"></style>
