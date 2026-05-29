import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

class StatusBarService {
  
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      // Set status bar to match app gradient
      await StatusBar.setStyle({ style: Style.Dark })
      
      // Use translucent for modern look
      await StatusBar.setOverlaysWebView({ overlay: false })
      
      // Set color matching app theme (Deep Indigo/Purple)
      await this.setThemeColor('#1e1b4b')
      
    } catch (error) {
      console.warn('[StatusBar] Init failed:', error)
    }
  }
  
  // Change status bar color based on current screen
  async setThemeColor(hexColor: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      // Clean up transparent values or other custom codes
      let cleanHex = hexColor
      if (hexColor.length > 7) {
        // Strip alpha channel if present
        cleanHex = hexColor.substring(0, 7)
      }
      
      await StatusBar.setBackgroundColor({ color: cleanHex })
      
      // Auto choose icon style based on color brightness
      const isDark = this.isColorDark(cleanHex)
      await StatusBar.setStyle({ 
        style: isDark ? Style.Light : Style.Dark 
      })
    } catch (err) {
      console.warn('[StatusBar] Set theme color failed:', err)
    }
  }
  
  // Hide status bar (for fullscreen video/visualizer)
  async hide(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try {
      await StatusBar.hide()
    } catch {}
  }
  
  // Show status bar again
  async show(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try {
      await StatusBar.show()
    } catch {}
  }
  
  // Transparent for immersive view
  async setTransparent(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try {
      await StatusBar.setOverlaysWebView({ overlay: true })
      await StatusBar.setBackgroundColor({ color: '#00000000' })
    } catch {}
  }
  
  private isColorDark(hex: string): boolean {
    const color = hex.replace('#', '')
    if (color.length !== 6) return true // default to dark background (light text)
    
    const r = parseInt(color.substring(0, 2), 16)
    const g = parseInt(color.substring(2, 4), 16)
    const b = parseInt(color.substring(4, 6), 16)
    
    // Luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.5
  }
}

export const statusBar = new StatusBarService()
export default statusBar;
