import { describe, expect, it } from 'vitest'
import type { HttpMethod } from '@/types/http'
import type { ProjectTreeNode, ProjectTreeOption } from '@/types/project'
import {
  collectFolderKeys,
  collectNonEmptyFolderKeys,
  entryName,
  folderKeysForPath,
  folderTreeKey,
  isInvalidFolderTarget,
  parentOf,
  relativePathFromRequestKey,
  requestTreeKey,
  resolveDropParent,
  toTreeOptions,
} from '@/utils/project-tree'

function folderNode(
  name: string,
  relativePath: string,
  children: ProjectTreeNode[] = [],
): ProjectTreeNode {
  return { kind: 'folder', name, relativePath, children }
}

function requestNode(
  name: string,
  relativePath: string,
  method: HttpMethod = 'GET',
): ProjectTreeNode {
  return { kind: 'request', name, relativePath, method }
}

function folderOption(relativePath: string, children: ProjectTreeOption[] = []): ProjectTreeOption {
  return {
    key: folderTreeKey(relativePath),
    label: entryName(relativePath),
    relativePath,
    kind: 'folder',
    isLeaf: false,
    children,
  }
}

function requestOption(relativePath: string, method: HttpMethod = 'GET'): ProjectTreeOption {
  return {
    key: requestTreeKey(relativePath),
    label: entryName(relativePath).replace(/\.json$/i, ''),
    relativePath,
    kind: 'request',
    method,
    isLeaf: true,
  }
}

const sampleTree: ProjectTreeNode[] = [
  folderNode('auth', 'auth', [
    requestNode('login', 'auth/login.json', 'POST'),
    folderNode('tokens', 'auth/tokens', [requestNode('refresh', 'auth/tokens/refresh.json', 'GET')]),
    folderNode('empty', 'auth/empty'),
  ]),
  requestNode('health', 'health.json', 'GET'),
  folderNode('users', 'users', [requestNode('list', 'users/list.json', 'GET')]),
]

describe('folderTreeKey / requestTreeKey / relativePathFromRequestKey', () => {
  it('prefixes folder and request keys', () => {
    expect(folderTreeKey('auth/tokens')).toBe('folder:auth/tokens')
    expect(requestTreeKey('auth/login.json')).toBe('request:auth/login.json')
  })

  it('extracts the relative path from a request key', () => {
    expect(relativePathFromRequestKey('request:auth/login.json')).toBe('auth/login.json')
  })

  it('returns null for keys that are not requests', () => {
    expect(relativePathFromRequestKey('folder:auth')).toBeNull()
    expect(relativePathFromRequestKey('auth/login.json')).toBeNull()
  })
})

describe('parentOf / entryName', () => {
  it('treats a root-level path as having an empty parent', () => {
    expect(parentOf('health.json')).toBe('')
    expect(parentOf('auth')).toBe('')
  })

  it('returns the parent of a nested path', () => {
    expect(parentOf('auth/login.json')).toBe('auth')
    expect(parentOf('auth/tokens/refresh.json')).toBe('auth/tokens')
    expect(parentOf('a/b/c')).toBe('a/b')
  })

  it('returns the last segment as the entry name', () => {
    expect(entryName('health.json')).toBe('health.json')
    expect(entryName('auth/login.json')).toBe('login.json')
    expect(entryName('auth/tokens')).toBe('tokens')
  })
})

describe('folderKeysForPath', () => {
  it('returns no keys for an empty path', () => {
    expect(folderKeysForPath('')).toEqual([])
  })

  it('returns a single key for a root folder', () => {
    expect(folderKeysForPath('auth')).toEqual(['folder:auth'])
  })

  it('returns ancestor keys from root to the given folder', () => {
    expect(folderKeysForPath('a/b/c')).toEqual(['folder:a', 'folder:a/b', 'folder:a/b/c'])
  })
})

describe('collectFolderKeys / collectNonEmptyFolderKeys', () => {
  const tree: ProjectTreeOption[] = [
    folderOption('auth', [
      requestOption('auth/login.json', 'POST'),
      folderOption('auth/tokens', [requestOption('auth/tokens/refresh.json')]),
      folderOption('auth/empty'),
    ]),
    requestOption('health.json'),
    folderOption('users', [requestOption('users/list.json')]),
  ]

  it('collects every folder key, including empty folders, and skips requests', () => {
    expect(collectFolderKeys(tree)).toEqual([
      'folder:auth',
      'folder:auth/tokens',
      'folder:auth/empty',
      'folder:users',
    ])
  })

  it('collects only folders that have children', () => {
    expect(collectNonEmptyFolderKeys(tree)).toEqual([
      'folder:auth',
      'folder:auth/tokens',
      'folder:users',
    ])
  })

  it('treats a folder without a children array as empty', () => {
    const orphan: ProjectTreeOption = {
      key: folderTreeKey('orphan'),
      label: 'orphan',
      relativePath: 'orphan',
      kind: 'folder',
      isLeaf: false,
    }

    expect(collectFolderKeys([orphan])).toEqual(['folder:orphan'])
    expect(collectNonEmptyFolderKeys([orphan])).toEqual([])
  })
})

describe('toTreeOptions', () => {
  it('maps the full tree when the query is empty, keeping empty folders droppable', () => {
    const options = toTreeOptions(sampleTree, '')

    expect(options.map((node) => node.key)).toEqual([
      'folder:auth',
      'request:health.json',
      'folder:users',
    ])

    const auth = options[0]
    expect(auth?.kind).toBe('folder')
    expect(auth?.isLeaf).toBe(false)
    expect(auth?.children?.map((child) => child.key)).toEqual([
      'request:auth/login.json',
      'folder:auth/tokens',
      'folder:auth/empty',
    ])

    const emptyFolder = auth?.children?.find((child) => child.key === 'folder:auth/empty')
    expect(emptyFolder).toMatchObject({
      kind: 'folder',
      isLeaf: false,
      children: [],
    })

    const health = options[1]
    expect(health).toMatchObject({
      kind: 'request',
      method: 'GET',
      isLeaf: true,
      label: 'health',
    })
  })

  it('filters requests by name, method, and relative path', () => {
    expect(toTreeOptions(sampleTree, 'login').map((node) => node.key)).toEqual(['folder:auth'])
    expect(toTreeOptions(sampleTree, 'post').map((node) => node.key)).toEqual(['folder:auth'])
    expect(toTreeOptions(sampleTree, 'users/list.json').map((node) => node.key)).toEqual([
      'folder:users',
    ])
  })

  it('keeps a folder when only a nested child matches', () => {
    const options = toTreeOptions(sampleTree, 'refresh')

    expect(options.map((node) => node.key)).toEqual(['folder:auth'])
    expect(options[0]?.children?.map((child) => child.key)).toEqual(['folder:auth/tokens'])
    expect(options[0]?.children?.[0]?.children?.map((child) => child.key)).toEqual([
      'request:auth/tokens/refresh.json',
    ])
  })

  it('keeps a folder that matches by name even if none of its children match', () => {
    const options = toTreeOptions(sampleTree, 'empty')

    expect(options.map((node) => node.key)).toEqual(['folder:auth'])
    expect(options[0]?.children?.map((child) => child.key)).toEqual(['folder:auth/empty'])
    expect(options[0]?.children?.[0]?.children).toEqual([])
  })

  it('hides folders and requests that do not match the query', () => {
    expect(toTreeOptions(sampleTree, 'missing')).toEqual([])
  })
})

describe('isInvalidFolderTarget', () => {
  const authFolder = folderOption('auth')
  const loginRequest = requestOption('auth/login.json', 'POST')

  it('never treats a request as an invalid folder target', () => {
    expect(isInvalidFolderTarget(loginRequest, 'auth')).toBe(false)
    expect(isInvalidFolderTarget(loginRequest, 'auth/login.json')).toBe(false)
  })

  it('rejects dropping a folder onto itself or a descendant', () => {
    expect(isInvalidFolderTarget(authFolder, 'auth')).toBe(true)
    expect(isInvalidFolderTarget(authFolder, 'auth/tokens')).toBe(true)
    expect(isInvalidFolderTarget(authFolder, 'auth/tokens/nested')).toBe(true)
  })

  it('allows dropping onto a sibling, parent, or unrelated folder', () => {
    expect(isInvalidFolderTarget(authFolder, 'users')).toBe(false)
    expect(isInvalidFolderTarget(authFolder, '')).toBe(false)
    expect(isInvalidFolderTarget(folderOption('auth/tokens'), 'auth')).toBe(false)
  })

  it('does not treat a similarly prefixed sibling as a descendant', () => {
    expect(isInvalidFolderTarget(authFolder, 'auth-extra')).toBe(false)
  })
})

describe('resolveDropParent', () => {
  it('uses the folder itself as the drop parent', () => {
    expect(resolveDropParent(folderOption('auth/tokens'))).toBe('auth/tokens')
    expect(resolveDropParent(folderOption('users'))).toBe('users')
  })

  it('uses the parent folder when dropping onto a request', () => {
    expect(resolveDropParent(requestOption('auth/login.json'))).toBe('auth')
    expect(resolveDropParent(requestOption('health.json'))).toBe('')
  })
})
