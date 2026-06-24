import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  getVersion: () => ipcRenderer.invoke('get-app-version'),

  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_event, action) => {
      callback(action);
    });
    return () => {
      ipcRenderer.removeAllListeners('menu-action');
    };
  },
});

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      platform: string;
      getVersion: () => Promise<string>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      getAppPath: () => Promise<string>;
      onMenuAction: (callback: (action: string) => void) => () => void;
    };
  }
}
