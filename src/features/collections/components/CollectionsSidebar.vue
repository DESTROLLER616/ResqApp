<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { NEmpty, NIcon, NInput, NTree } from 'naive-ui'
import type { TreeOption } from 'naive-ui'
import { FolderOpen, Search } from '@vicons/fa'
import { storeToRefs } from 'pinia'
import HttpMethodTag from '@/components/ui/HttpMethodTag.vue'
import { useCollectionsStore } from '@/stores/collections'
import { useWorkspaceStore } from '@/stores/workspace'
import type { HttpMethod } from '@/types/http'

interface CollectionTreeOption extends TreeOption {
  key: string
  collectionId?: string
  requestId?: string
  method?: HttpMethod
}

const collectionsStore = useCollectionsStore()
const workspaceStore = useWorkspaceStore()
const { collections } = storeToRefs(collectionsStore)
const { activeCollectionId, activeRequestId } = storeToRefs(workspaceStore)

const search = ref('')

const treeData = computed<CollectionTreeOption[]>(() => {
  const query = search.value.trim().toLowerCase()
  const nodes: CollectionTreeOption[] = []

  for (const collection of collections.value) {
    const requests = collection.requests.filter((request) => {
      if (!query) return true
      return (
        request.name.toLowerCase().includes(query) ||
        request.method.toLowerCase().includes(query) ||
        request.url.toLowerCase().includes(query) ||
        collection.name.toLowerCase().includes(query)
      )
    })

    if (query && requests.length === 0) continue

    nodes.push({
      key: `collection:${collection.id}`,
      label: collection.name,
      collectionId: collection.id,
      children: requests.map((request) => ({
        key: `request:${collection.id}:${request.id}`,
        label: request.name,
        collectionId: collection.id,
        requestId: request.id,
        method: request.method,
        isLeaf: true,
      })),
    })
  }

  return nodes
})

const selectedKeys = computed(() => {
  if (activeCollectionId.value && activeRequestId.value) {
    return [`request:${activeCollectionId.value}:${activeRequestId.value}`]
  }
  if (activeCollectionId.value) {
    return [`collection:${activeCollectionId.value}`]
  }
  return []
})

function renderLabel({ option }: { option: TreeOption }) {
  const node = option as CollectionTreeOption

  if (node.method) {
    return h(
      'span',
      { class: 'tree-request' },
      [
        h(HttpMethodTag, { method: node.method }),
        h('span', { class: 'tree-request__name' }, String(node.label ?? '')),
      ],
    )
  }

  return h(
    'span',
    { class: 'tree-collection' },
    [
      h(NIcon, { size: 14, component: FolderOpen }),
      h('span', String(node.label ?? '')),
    ],
  )
}

function onSelect(keys: Array<string | number>) {
  const key = String(keys[0] ?? '')
  if (!key) return

  if (key.startsWith('collection:')) {
    const collectionId = key.slice('collection:'.length)
    workspaceStore.openCollection(collectionId)
    return
  }

  if (key.startsWith('request:')) {
    const [, collectionId, requestId] = key.split(':')
    if (!collectionId || !requestId) return
    workspaceStore.openCollection(collectionId)
    workspaceStore.selectRequest(requestId)
  }
}
</script>

<template>
  <div class="collections-sidebar">
    <div class="collections-sidebar__header">
      <span class="collections-sidebar__title">Colecciones</span>
    </div>

    <div class="collections-sidebar__search">
      <n-input v-model:value="search" clearable placeholder="Buscar…" size="small">
        <template #prefix>
          <n-icon :component="Search" />
        </template>
      </n-input>
    </div>

    <div class="collections-sidebar__tree">
      <n-tree
        v-if="treeData.length > 0"
        block-line
        expand-on-click
        :data="treeData"
        :selected-keys="selectedKeys"
        :render-label="renderLabel"
        :default-expanded-keys="treeData.map((node) => node.key)"
        @update:selected-keys="onSelect"
      />
      <n-empty v-else description="Sin colecciones" size="small" />
    </div>
  </div>
</template>

<style scoped>
.collections-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--app-sidebar-bg);
}

.collections-sidebar__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
}

.collections-sidebar__title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--app-muted);
}

.collections-sidebar__search {
  flex-shrink: 0;
  padding: 0 12px 10px;
}

.collections-sidebar__tree {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0 6px 12px;
}

.tree-collection,
.tree-request {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tree-request__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
