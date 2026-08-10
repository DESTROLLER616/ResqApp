import {
  CheckMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from '@tauri-apps/api/menu'
import type { RecentProject } from '@/types/project'

export interface AppMenuHandlers {
  onNewProject: () => void
  onOpenProject: () => void
  onOpenRecent: (path: string) => void
  onSave: () => void
  onRefresh: () => void
  onToggleProjectSidebar: () => void
  onToggleRecentSidebar: () => void
}

export interface AppMenuState {
  hasProject: boolean
  recentProjects: readonly RecentProject[]
  isProjectSidebarVisible: boolean
  isRecentSidebarVisible: boolean
}

function isMacOs(): boolean {
  return navigator.userAgent.includes('Macintosh')
}

async function separator(): Promise<PredefinedMenuItem> {
  return PredefinedMenuItem.new({ item: 'Separator' })
}

async function buildOpenRecentSubmenu(
  recentProjects: readonly RecentProject[],
  onOpenRecent: (path: string) => void,
): Promise<Submenu> {
  if (recentProjects.length === 0) {
    return Submenu.new({
      text: 'Open Recent',
      items: [
        await MenuItem.new({
          id: 'open-recent-empty',
          text: 'No Recent Projects',
          enabled: false,
        }),
      ],
    })
  }

  return Submenu.new({
    text: 'Open Recent',
    items: await Promise.all(
      recentProjects.map((project, index) =>
        MenuItem.new({
          id: `open-recent-${index}`,
          text: project.name,
          action: () => {
            onOpenRecent(project.path)
          },
        }),
      ),
    ),
  })
}

export async function installAppMenu(
  state: AppMenuState,
  handlers: AppMenuHandlers,
): Promise<Menu> {
  const macOs = isMacOs()

  const fileItems = [
    await MenuItem.new({
      id: 'new-project',
      text: 'New Project…',
      accelerator: 'CmdOrCtrl+Shift+N',
      action: () => {
        handlers.onNewProject()
      },
    }),
    await MenuItem.new({
      id: 'open-project',
      text: 'Open Project…',
      accelerator: 'CmdOrCtrl+O',
      action: () => {
        handlers.onOpenProject()
      },
    }),
    await buildOpenRecentSubmenu(state.recentProjects, handlers.onOpenRecent),
    await separator(),
    await MenuItem.new({
      id: 'save',
      text: 'Save',
      accelerator: 'CmdOrCtrl+S',
      enabled: state.hasProject,
      action: () => {
        handlers.onSave()
      },
    }),
    await MenuItem.new({
      id: 'refresh-project',
      text: 'Refresh Project',
      accelerator: 'CmdOrCtrl+R',
      enabled: state.hasProject,
      action: () => {
        handlers.onRefresh()
      },
    }),
  ]

  if (!macOs) {
    fileItems.push(await separator(), await PredefinedMenuItem.new({ item: 'Quit' }))
  }

  const fileSubmenu = await Submenu.new({
    text: 'File',
    items: fileItems,
  })

  const editSubmenu = await Submenu.new({
    text: 'Edit',
    items: [
      await PredefinedMenuItem.new({ item: 'Undo' }),
      await PredefinedMenuItem.new({ item: 'Redo' }),
      await separator(),
      await PredefinedMenuItem.new({ item: 'Cut' }),
      await PredefinedMenuItem.new({ item: 'Copy' }),
      await PredefinedMenuItem.new({ item: 'Paste' }),
      await PredefinedMenuItem.new({ item: 'SelectAll' }),
    ],
  })

  const viewSubmenu = await Submenu.new({
    text: 'View',
    items: [
      await CheckMenuItem.new({
        id: 'toggle-project-sidebar',
        text: 'Project Sidebar',
        checked: state.isProjectSidebarVisible,
        accelerator: '',
        action: () => {
          handlers.onToggleProjectSidebar()
        },
      }),
      await CheckMenuItem.new({
        id: 'toggle-recent-sidebar',
        text: 'Recent Projects',
        checked: state.isRecentSidebarVisible,
        action: () => {
          handlers.onToggleRecentSidebar()
        },
      }),
      await separator(),
      await PredefinedMenuItem.new({ item: 'Fullscreen' }),
    ],
  })

  const menuItems = [fileSubmenu, editSubmenu, viewSubmenu]

  if (macOs) {
    const aboutSubmenu = await Submenu.new({
      text: 'App',
      items: [await PredefinedMenuItem.new({ item: 'Quit' })],
    })
    menuItems.unshift(aboutSubmenu)
  }

  const menu = await Menu.new({ items: menuItems })

  if (macOs) {
    await menu.setAsAppMenu()
  } else {
    await menu.setAsWindowMenu()
  }

  return menu
}
