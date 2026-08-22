import type { ProjectTreeNode, ProjectTreeOption } from '@/types/project'

const FOLDER_KEY_PREFIX = 'folder:'
const REQUEST_KEY_PREFIX = 'request:'

export function folderTreeKey(relativePath: string): string {
  return `${FOLDER_KEY_PREFIX}${relativePath}`
}

export function requestTreeKey(relativePath: string): string {
  return `${REQUEST_KEY_PREFIX}${relativePath}`
}

export function relativePathFromRequestKey(key: string): string | null {
  if (!key.startsWith(REQUEST_KEY_PREFIX)) return null
  return key.slice(REQUEST_KEY_PREFIX.length)
}

export function parentOf(relativePath: string): string {
  const index = relativePath.lastIndexOf('/')
  return index === -1 ? '' : relativePath.slice(0, index)
}

export function entryName(relativePath: string): string {
  const index = relativePath.lastIndexOf('/')
  return index === -1 ? relativePath : relativePath.slice(index + 1)
}

export function folderKeysForPath(relativePath: string): string[] {
  if (!relativePath) return []
  const parts = relativePath.split('/')
  const keys: string[] = []
  for (let i = 0; i < parts.length; i += 1) {
    keys.push(folderTreeKey(parts.slice(0, i + 1).join('/')))
  }
  return keys
}

export function collectFolderKeys(nodes: ProjectTreeOption[]): string[] {
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
export function collectNonEmptyFolderKeys(nodes: ProjectTreeOption[]): string[] {
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

export function toTreeOptions(nodes: ProjectTreeNode[], query: string): ProjectTreeOption[] {
  const result: ProjectTreeOption[] = []

  for (const node of nodes) {
    if (node.kind === 'folder') {
      const children = toTreeOptions(node.children, query)
      const matchesSelf = !query || node.name.toLowerCase().includes(query)
      if (!query || matchesSelf || children.length > 0) {
        result.push({
          key: folderTreeKey(node.relativePath),
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
      key: requestTreeKey(node.relativePath),
      label: node.name,
      relativePath: node.relativePath,
      kind: 'request',
      method: node.method,
      isLeaf: true,
    })
  }

  return result
}

export function isInvalidFolderTarget(drag: ProjectTreeOption, targetPath: string): boolean {
  if (drag.kind !== 'folder') return false
  return targetPath === drag.relativePath || targetPath.startsWith(`${drag.relativePath}/`)
}

export function resolveDropParent(target: ProjectTreeOption): string {
  if (target.kind === 'folder') {
    return target.relativePath
  }
  return parentOf(target.relativePath)
}
