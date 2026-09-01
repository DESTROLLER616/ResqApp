/**
 * File to build native menu with tauri menu api with actions.
 */

import { CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu'
import type { RecentProject } from '@/types/project'
import type { ThemeMode } from '@/types/ui'
import { i18n } from '@/i18n'

const { t } = i18n.global

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
      text: t('menu.openRecent'),
      items: [
        await MenuItem.new({
          id: 'open-recent-empty',
          text: t('menu.noRecentProjects'),
          enabled: false,
        }),
      ],
    })
  }

  return Submenu.new({
    text: t('menu.openRecent'),
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
    { id: 'theme-system', text: t('common.theme.system'), mode: 'system' },
    { id: 'theme-light', text: t('common.theme.light'), mode: 'light' },
    { id: 'theme-dark', text: t('common.theme.dark'), mode: 'dark' },
  ]

  return Submenu.new({
    text: t('menu.theme'),
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
  onSetLocale: (nextLocale: string) => void,
): Promise<Submenu> {
  return Submenu.new({
    text: t('menu.language'),
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
      text: t('menu.newProject'),
      accelerator: 'CmdOrCtrl+Shift+N',
      action: () => {
        handlers.onNewProject()
      },
    }),
    await MenuItem.new({
      id: 'open-project',
      text: t('menu.openProject'),
      accelerator: 'CmdOrCtrl+O',
      action: () => {
        handlers.onOpenProject()
      },
    }),
    await buildOpenRecentSubmenu(state.recentProjects, handlers.onOpenRecent),
    await separator(),
    await MenuItem.new({
      id: 'save',
      text: t('common.save'),
      accelerator: 'CmdOrCtrl+S',
      enabled: state.hasProject,
      action: () => {
        handlers.onSave()
      },
    }),
    await MenuItem.new({
      id: 'refresh-project',
      text: t('menu.refreshProject'),
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
    text: t('menu.file'),
    items: fileItems,
  })

  const editSubmenu = await Submenu.new({
    text: t('menu.edit'),
    items: [
      await PredefinedMenuItem.new({ item: 'Undo', text: t('menu.undo') }),
      await PredefinedMenuItem.new({ item: 'Redo', text: t('menu.redo') }),
      await separator(),
      await PredefinedMenuItem.new({ item: 'Cut', text: t('menu.cut') }),
      await PredefinedMenuItem.new({ item: 'Copy', text: t('menu.copy') }),
      await PredefinedMenuItem.new({ item: 'Paste', text: t('menu.paste') }),
      await PredefinedMenuItem.new({ item: 'SelectAll', text: t('menu.selectAll') }),
    ],
  })

  const viewSubmenu = await Submenu.new({
    text: t('menu.view'),
    items: [
      await CheckMenuItem.new({
        id: 'toggle-project-sidebar',
        text: t('menu.projectSidebar'),
        checked: state.isProjectSidebarVisible,
        accelerator: '',
        action: () => {
          handlers.onToggleProjectSidebar()
        },
      }),
      await CheckMenuItem.new({
        id: 'toggle-recent-sidebar',
        text: t('menu.recentProjects'),
        checked: state.isRecentSidebarVisible,
        action: () => {
          handlers.onToggleRecentSidebar()
        },
      }),
      await separator(),
      await buildThemeSubmenu(state.themeMode, handlers.onSetThemeMode),
      await buildLanguageSubmenu(state.locale, state.availableLocales, handlers.onSetLocale),
      await separator(),
      await PredefinedMenuItem.new({ item: 'Fullscreen' }),
    ],
  })

  const menuItems = [fileSubmenu, editSubmenu, viewSubmenu]

  if (macOs) {
    const aboutSubmenu = await Submenu.new({
      text: t('menu.app'),
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
