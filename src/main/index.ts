import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray
} from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { loadBounds, loadData, saveBounds, saveData, type Bounds } from './store'
import type { AppData, Settings } from '../shared/types'

/** 表示の種類ごとの標準の大きさと、最小の大きさ */
const SIZES = {
  normal: { w: 380, h: 660, minW: 320, minH: 480 },
  compact: { w: 260, h: 96, minW: 150, minH: 52 }
}
type Mode = keyof typeof SIZES
/** 表示・非表示を切り替えるショートカット */
const SHORTCUT = 'CommandOrControl+Alt+D'

let win: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false
let data: AppData = loadData()
let saved = loadBounds()
const mode = (): Mode => (data.settings.compact ? 'compact' : 'normal')

function iconPath(name: string): string {
  // 開発時は resources/、.exe では resources フォルダ (asarUnpack) から読む
  return is.dev
    ? join(__dirname, '../../resources', name)
    : join(process.resourcesPath, 'app.asar.unpacked', 'resources', name)
}

/** 画面の右上 (少し内側) を標準の位置にする */
function defaultBounds(m: Mode = mode()): Bounds {
  const area = screen.getPrimaryDisplay().workArea
  const { w, h } = SIZES[m]
  return { width: w, height: h, x: area.x + area.width - w - 24, y: area.y + 24 }
}

/** 保存した位置が、いまつながっている画面の中にあるか */
function isOnScreen(b: { x: number; y: number; width: number; height: number }): boolean {
  return screen.getAllDisplays().some(({ workArea: a }) => {
    const cx = b.x + Math.min(b.width, 120) / 2
    const cy = b.y + 20
    return cx >= a.x && cx <= a.x + a.width && cy >= a.y && cy <= a.y + a.height
  })
}

function createWindow(): void {
  const last = saved[mode()]
  const bounds = last && isOnScreen(last) ? last : defaultBounds()

  win = new BrowserWindow({
    ...bounds,
    minWidth: SIZES[mode()].minW,
    minHeight: SIZES[mode()].minH,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    // 透明なウィンドウは OS の枠での大きさ変更が不安定なため、右下のつまみで変える
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: data.settings.alwaysOnTop,
    show: false,
    title: 'DayRing',
    icon: iconPath('icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win?.show())

  // 位置・大きさを覚えておく
  let timer: NodeJS.Timeout | undefined
  const remember = (): void => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (win && !win.isDestroyed()) {
        saved = { ...saved, [mode()]: win.getBounds() }
        saveBounds(saved)
      }
    }, 400)
  }
  win.on('moved', remember)
  win.on('resized', remember)
  win.on('move', remember)

  // × ではアプリを終了せず、トレイにしまう
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      win?.hide()
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL'])
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

function toggleWindow(): void {
  if (!win) return
  if (win.isVisible() && !win.isMinimized()) win.hide()
  else {
    win.show()
    win.focus()
  }
}

/**
 * 簡易表示 ⇔ 通常表示。それぞれ前回の位置・大きさに戻す。
 * 初めて切り替えるときは、いまのウィンドウの右上の角をそろえる。
 */
function switchMode(compact: boolean): void {
  if (!win) return
  const cur = win.getBounds()
  saved = { ...saved, [mode()]: cur }
  data = { ...data, settings: { ...data.settings, compact } }
  const m = mode()
  const size = SIZES[m]
  const last = saved[m]
  const next =
    last && isOnScreen(last)
      ? last
      : { width: size.w, height: size.h, x: cur.x + cur.width - size.w, y: cur.y }
  win.setMinimumSize(size.minW, size.minH)
  win.setBounds(next)
  saved = { ...saved, [m]: next }
  saveBounds(saved)
}

/** 設定を変えて保存し、画面にも知らせる */
function applySettings(patch: Partial<Settings>, notifyRenderer: boolean): void {
  // 簡易表示の切り替えは、いまの表示の位置を覚えてから行う
  if (patch.compact !== undefined && patch.compact !== data.settings.compact)
    switchMode(patch.compact)
  data = { ...data, settings: { ...data.settings, ...patch } }
  if (patch.alwaysOnTop !== undefined) win?.setAlwaysOnTop(patch.alwaysOnTop, 'floating')
  if (patch.autoLaunch !== undefined && app.isPackaged)
    app.setLoginItemSettings({ openAtLogin: patch.autoLaunch })
  saveData(data)
  if (notifyRenderer) win?.webContents.send('settings:changed', patch)
  buildTrayMenu()
}

function buildTrayMenu(): void {
  if (!tray) return
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '表示 / 非表示（Ctrl+Alt+D）', click: toggleWindow },
      {
        label: '簡易表示（日付・時刻・いまの予定だけ）',
        type: 'checkbox',
        checked: data.settings.compact,
        click: (m) => applySettings({ compact: m.checked }, true)
      },
      { type: 'separator' },
      {
        label: '常に手前に表示',
        type: 'checkbox',
        checked: data.settings.alwaysOnTop,
        click: (m) => applySettings({ alwaysOnTop: m.checked }, true)
      },
      {
        label: 'PC の起動時に自動で起動',
        type: 'checkbox',
        checked: data.settings.autoLaunch,
        click: (m) => applySettings({ autoLaunch: m.checked }, true)
      },
      { label: '位置を右上に戻す', click: resetPosition },
      { type: 'separator' },
      {
        label: '終了',
        click: () => {
          quitting = true
          app.quit()
        }
      }
    ])
  )
}

function resetPosition(): void {
  if (!win) return
  const b = defaultBounds()
  win.setBounds(b)
  saved = { ...saved, [mode()]: b }
  saveBounds(saved)
  win.show()
}

function createTray(): void {
  const img = nativeImage.createFromPath(iconPath('tray.png'))
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img)
  tray.setToolTip('DayRing')
  tray.on('click', toggleWindow)
  buildTrayMenu()
}

function registerIpc(): void {
  ipcMain.handle('data:load', () => data)
  ipcMain.handle('data:save', (_e, next: AppData) => {
    data = next
    saveData(data)
  })
  ipcMain.on('win:hide', () => win?.hide())
  ipcMain.on('app:quit', () => {
    quitting = true
    app.quit()
  })
  ipcMain.on('win:alwaysOnTop', (_e, on: boolean) => applySettings({ alwaysOnTop: on }, false))
  ipcMain.on('app:autoLaunch', (_e, on: boolean) => applySettings({ autoLaunch: on }, false))
  ipcMain.on('win:resetPosition', resetPosition)
  ipcMain.on('win:compact', (_e, on: boolean) => applySettings({ compact: on }, false))
  ipcMain.handle('win:getSize', () => {
    const [width, height] = win?.getSize() ?? [SIZES.normal.w, SIZES.normal.h]
    return { width, height }
  })
  ipcMain.on('win:resizeBy', (_e, w0: number, h0: number, dw: number, dh: number) => {
    if (!win) return
    const { minW, minH } = SIZES[mode()]
    const width = Math.max(minW, Math.round(w0 + dw))
    const height = Math.max(minH, Math.round(h0 + dh))
    const [x, y] = win.getPosition()
    win.setBounds({ x, y, width, height })
  })
}

// 2 つ目を起動したら、すでに開いているものを表示する
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => {
    win?.show()
    win?.focus()
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.dayring.app')
    registerIpc()
    createWindow()
    createTray()
    globalShortcut.register(SHORTCUT, toggleWindow)
  })

  app.on('before-quit', () => {
    quitting = true
  })
  app.on('will-quit', () => globalShortcut.unregisterAll())
  // トレイに常駐するので、ウィンドウを閉じても終了しない
  app.on('window-all-closed', () => {
    /* 何もしない */
  })
}
