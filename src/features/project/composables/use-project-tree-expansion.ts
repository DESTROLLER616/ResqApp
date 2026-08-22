import { ref, watch, type ComputedRef, type Ref } from 'vue'
import type { ProjectTreeOption } from '@/types/project'
import {
  collectFolderKeys,
  collectNonEmptyFolderKeys,
  folderKeysForPath,
} from '@/utils/project-tree'

const EXPANDED_STORAGE_PREFIX = 'project-sidebar:expanded:'

type ExpandedKey = string | number

interface UseProjectTreeExpansionOptions {
  rootPath: Ref<string | null>
  treeData: Ref<ProjectTreeOption[]> | ComputedRef<ProjectTreeOption[]>
  isSearchActive: Ref<boolean> | ComputedRef<boolean>
}

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

function saveExpandedKeys(path: string, keys: ExpandedKey[]): void {
  try {
    localStorage.setItem(storageKeyForProject(path), JSON.stringify(keys.map(String)))
  } catch {
    // Quota / private mode — ignore; expansion still works in-session.
  }
}

export function useProjectTreeExpansion(options: UseProjectTreeExpansionOptions): {
  expandedKeys: Ref<ExpandedKey[]>
  onUpdateExpandedKeys: (keys: ExpandedKey[]) => void
  expandFolders: (relativeFolderPath: string) => void
} {
  const { rootPath, treeData, isSearchActive } = options

  const expandedKeys = ref<ExpandedKey[]>([])
  const knownFolderKeys = ref(new Set<string>())
  /** Snapshot of expanded folders before search expands everything. */
  const expandedKeysBeforeSearch = ref<ExpandedKey[] | null>(null)

  function onUpdateExpandedKeys(keys: ExpandedKey[]): void {
    expandedKeys.value = keys
  }

  function expandFolders(relativeFolderPath: string): void {
    if (!relativeFolderPath) return
    const next = new Set(expandedKeys.value.map(String))
    for (const key of folderKeysForPath(relativeFolderPath)) {
      next.add(key)
    }
    expandedKeys.value = [...next]
  }

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

      if (isSearchActive.value) {
        expandedKeys.value = folderKeys
        return
      }

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

  return {
    expandedKeys,
    onUpdateExpandedKeys,
    expandFolders,
  }
}
