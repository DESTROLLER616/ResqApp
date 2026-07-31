import type { HttpMethod } from '@/types/http'

export interface ProjectMeta {
  name: string
  version: number
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

export interface OpenedProject {
  rootPath: string
  name: string
  tree: ProjectTreeNode[]
}

export interface OpenRequestTab {
  relativePath: string
  name: string
}
