import { contextBridge, ipcRenderer } from 'electron'
import type { AppData, Settings, WidgetApi } from '../shared/types'

const api: WidgetApi = {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data: AppData) => ipcRenderer.invoke('data:save', data),
  hide: () => ipcRenderer.send('win:hide'),
  quit: () => ipcRenderer.send('app:quit'),
  setAlwaysOnTop: (on) => ipcRenderer.send('win:alwaysOnTop', on),
  setAutoLaunch: (on) => ipcRenderer.send('app:autoLaunch', on),
  resetPosition: () => ipcRenderer.send('win:resetPosition'),
  resizeBy: (w0, h0, dw, dh) => ipcRenderer.send('win:resizeBy', w0, h0, dw, dh),
  getSize: () => ipcRenderer.invoke('win:getSize'),
  onSettingsChanged: (cb) => {
    const fn = (_e: unknown, s: Partial<Settings>): void => cb(s)
    ipcRenderer.on('settings:changed', fn)
    return () => {
      ipcRenderer.removeListener('settings:changed', fn)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
