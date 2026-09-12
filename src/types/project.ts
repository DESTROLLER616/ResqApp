import type { TreeOption } from 'naive-ui'
import type { HttpMethod } from '@/types/http'

export interface ProjectMeta {
  name: string
  version: number
  documentation?: string
}

export interface RecentProject {
  path: string
  name: string
  openedAt: string
}

export interface ProjectFolderNode {
  kind: 'folder'
  name: string
  relativePath: string
  children: ProjectTreeNode[]
}

export interface ProjectRequestNode {
  kind: 'request'
  name: string
  relativePath: string
  method: HttpMethod
}

export type ProjectTreeNode = ProjectFolderNode | ProjectRequestNode

export type ProjectEntryKind = ProjectTreeNode['kind']

/** Naive Tree option mapped from `ProjectTreeNode`. */
export interface ProjectTreeOption extends TreeOption {
  key: string
  relativePath: string
  kind: ProjectEntryKind
  method?: HttpMethod
}

export type WorkspacePanel = 'request' | 'documentation'

/** Virtual tab key; not a file path, so it cannot collide with request JSON files. */
export const DOCUMENTATION_TAB_KEY = 'project://documentation'

export function isDocumentationTab(key: string | null | undefined): boolean {
  return key === DOCUMENTATION_TAB_KEY
}

export interface OpenedProject {
  rootPath: string
  name: string
  documentation?: string
  tree: ProjectTreeNode[]
}

export interface OpenRequestTab {
  relativePath: string
  name: string
}
