import {
  CheckMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from '@tauri-apps/api/menu'
import type { RecentProject } from '@/types/project'
import type { ThemeMode } from '@/types/ui'

export interface AppMenuHandlers {
  onNewProject: () => void
  onOpenProject: () => void
  onOpenRecent: (path: string) => void
  onSave: () => void
  onRefresh: () => void
  onToggleProjectSidebar: () => void
  onToggleRecentSidebar: () => void
  onSetThemeMode: (mode: ThemeMode) => void
  onSetLocale: (locale: string) => void
}

export interface AppMenuState {
  hasProject: boolean
  recentProjects: readonly RecentProject[]
  isProjectSidebarVisible: boolean
  isRecentSidebarVisible: boolean
  themeMode: ThemeMode
  locale: string
  availableLocales: readonly string[]
  languageMenuLabel: string
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

async function buildThemeSubmenu(
  themeMode: ThemeMode,
  onSetThemeMode: (mode: ThemeMode) => void,
): Promise<Submenu> {
  const options: { id: string; text: string; mode: ThemeMode }[] = [
    { id: 'theme-system', text: 'System', mode: 'system' },
    { id: 'theme-light', text: 'Light', mode: 'light' },
    { id: 'theme-dark', text: 'Dark', mode: 'dark' },
  ]

  return Submenu.new({
    text: 'Theme',
    items: await Promise.all(
      options.map((option) =>
        CheckMenuItem.new({
          id: option.id,
          text: option.text,
          checked: themeMode === option.mode,
          action: () => {
            onSetThemeMode(option.mode)
          },
        }),
      ),
    ),
  })
}

function languageLabel(locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale)
    if (!name) return locale
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return locale
  }
}

async function buildLanguageSubmenu(
  locale: string,
  availableLocales: readonly string[],
  label: string,
  onSetLocale: (nextLocale: string) => void,
): Promise<Submenu> {
  return Submenu.new({
    text: label,
    items: await Promise.all(
      availableLocales.map((code) =>
        CheckMenuItem.new({
          id: `locale-${code}`,
          text: languageLabel(code),
          checked: locale === code,
          action: () => {
            onSetLocale(code)
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
      await buildThemeSubmenu(state.themeMode, handlers.onSetThemeMode),
      await buildLanguageSubmenu(
        state.locale,
        state.availableLocales,
        state.languageMenuLabel,
        handlers.onSetLocale,
      ),
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
