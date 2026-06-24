import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

class StatusBarService {
  private currentColor: string = '#000000'
  
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      // Disable overlaysWebView so status bar is native and doesn't overlap web app content
      await StatusBar.setOverlaysWebView({ overlay: false })
      
      // Default solid background color
      await StatusBar.setBackgroundColor({ color: '#0a0a0a' })
      
      // Default to dark style (light text/icons) since the app is dark themed
      await StatusBar.setStyle({ style: Style.Dark })
      
    } catch (error) {
      console.warn('[StatusBar] Init failed:', error)
    }
  }
  
  // Change status bar style based on current screen theme
  async setBackgroundColor(hexColor: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    this.currentColor = hexColor
    
    try {
      // Set the solid background color of the status bar to match the screen
      await StatusBar.setBackgroundColor({ color: hexColor })
      
      // Auto-detect if color is dark or light
      const isDark = this.isColorDark(hexColor)
      
      // Dark background = Light icons (Style.Dark)
      // Light background = Dark icons (Style.Light)
      await StatusBar.setStyle({ 
        style: isDark ? Style.Dark : Style.Light 
      })
    } catch (error) {
      console.warn('[StatusBar] Color update failed:', error)
    }
  }
  
  // Match the current view's background
  async matchScreenTheme(screenName: string): Promise<void> {
    const themes: Record<string, string> = {
      'home': '#000000',
      'library': '#0a0a0a',
      'reels': '#000000',
      'player': '#000000',
      'profile': '#0a0a0a',
      'settings': '#0a0a0a',
      'fullscreen-player': '#000000',
    }
    
    const color = themes[screenName.toLowerCase()] || '#000000'
    await this.setBackgroundColor(color)
  }
  
  async hide(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try { await StatusBar.hide() } catch {}
  }
  
  async show(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try { await StatusBar.show() } catch {}
  }
  
  private isColorDark(hex: string): boolean {
    const color = hex.replace('#', '')
    if (color.length !== 6) return true // Default to dark background
    const r = parseInt(color.substring(0, 2), 16)
    const g = parseInt(color.substring(2, 4), 16)
    const b = parseInt(color.substring(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.5
  }
  
  getCurrentColor(): string {
    return this.currentColor
  }
}

export const statusBar = new StatusBarService()
export default statusBar;
