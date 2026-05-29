import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

interface ShareableTrack {
  title: string
  artist: string
  artworkUrl: string
  audioUrl?: string
  shareLink?: string  // mwijay.app/song/123
}

class ShareService {
  
  async shareSong(track: ShareableTrack): Promise<void> {
    const shareText = `🎵 Listening to "${track.title}" by ${track.artist} on Mwijay`
    const shareUrl = track.shareLink || 'https://mwijay.app'
    
    // STRATEGY 1: Native Capacitor Share (Android APK)
    if (Capacitor.isNativePlatform()) {
      await this.shareNative(track, shareText, shareUrl)
      return
    }
    
    // STRATEGY 2: Web Share API with files (modern browsers)
    if (await this.canShareFiles(track)) {
      await this.shareWithFile(track, shareText, shareUrl)
      return
    }
    
    // STRATEGY 3: Web Share API basic (mobile browsers)
    if ((navigator as any).share) {
      await this.shareBasic(shareText, shareUrl)
      return
    }
    
    // STRATEGY 4: Clipboard fallback (desktop browsers)
    await this.shareClipboard(shareText, shareUrl)
  }
  
  private async shareNative(
    track: ShareableTrack,
    text: string,
    url: string
  ): Promise<void> {
    try {
      await Share.share({
        title: track.title,
        text: text,
        url: url,
        dialogTitle: 'Share this song',
      })
    } catch (error) {
      // User cancelled or error
      console.warn('[Share] Native share cancelled or failed')
    }
  }
  
  private async canShareFiles(track: ShareableTrack): Promise<boolean> {
    if (!(navigator as any).canShare || !track.artworkUrl) return false
    
    try {
      // Download artwork to share as image with link
      const response = await fetch(track.artworkUrl)
      const blob = await response.blob()
      const file = new File([blob], 'mwijay-song.jpg', {
        type: blob.type,
      })
      
      return navigator.canShare({ files: [file] })
    } catch {
      return false
    }
  }
  
  private async shareWithFile(
    track: ShareableTrack,
    text: string,
    url: string
  ): Promise<void> {
    try {
      const response = await fetch(track.artworkUrl)
      const blob = await response.blob()
      const file = new File([blob], `${track.title}.jpg`, {
        type: blob.type,
      })
      
      await navigator.share({
        files: [file],
        title: track.title,
        text: text,
        url: url,
      })
    } catch (error) {
      // Fallback to basic share
      await this.shareBasic(text, url)
    }
  }
  
  private async shareBasic(text: string, url: string): Promise<void> {
    try {
      await navigator.share({
        title: 'Mwijay Music',
        text: text,
        url: url,
      })
    } catch (error) {
      // User cancelled - that's ok
    }
  }
  
  private async shareClipboard(text: string, url: string): Promise<void> {
    const fullText = `${text}\n${url}`
    
    try {
      await navigator.clipboard.writeText(fullText)
      this.showToast('Copied to clipboard! 📋')
    } catch {
      // Show share modal with copy options
      this.showShareModal(text, url)
    }
  }
  
  // SHARE AS IMAGE CARD (Instagram style)
  async shareAsImageCard(track: ShareableTrack): Promise<void> {
    this.showToast('Generating share card... 🎨')
    // Generate beautiful share card with html2canvas
    const card = await this.generateShareCard(track)
    
    if (Capacitor.isNativePlatform()) {
      // Save image temporarily and share
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      
      const base64 = card.split(',')[1]
      const fileName = `mwijay-share-${Date.now()}.png`
      
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      })
      
      const fileUri = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      })
      
      await Share.share({
        title: `${track.title} - ${track.artist}`,
        text: `Check out this song on Mwijay! 🎵`,
        url: fileUri.uri,
        dialogTitle: 'Share song card',
      })
    } else {
      // Browser: download or use Web Share API
      const response = await fetch(card)
      const blob = await response.blob()
      const file = new File([blob], 'mwijay-share.png', {
        type: 'image/png',
      })
      
      if ((navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: track.title,
          text: `${track.title} by ${track.artist}`,
        })
      } else {
        // Download fallback
        const link = document.createElement('a')
        link.href = card
        link.download = `mwijay-${track.title}.png`
        link.click()
        this.showToast('Downloading share card! 📲')
      }
    }
  }
  
  private async generateShareCard(
    track: ShareableTrack
  ): Promise<string> {
    // Use html2canvas to create beautiful share image
    const html2canvas = (await import('html2canvas')).default
    
    // Create temporary div with share card design
    const cardElement = document.createElement('div')
    cardElement.style.cssText = `
      width: 1080px;
      height: 1920px;
      background: linear-gradient(135deg, #1e1b4b 0%, #581c87 100%);
      padding: 60px;
      position: fixed;
      left: -9999px;
      top: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: white;
    `
    cardElement.innerHTML = `
      <div style="text-align: center; padding-top: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <img src="${track.artworkUrl || 'https://via.placeholder.com/600'}" 
             style="width: 600px; height: 600px; 
                    border-radius: 32px; 
                    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                    object-cover: cover;" />
        <h1 style="font-size: 72px; margin-top: 60px; 
                   font-weight: 800; font-family: sans-serif; max-width: 900px; word-wrap: break-word;">${track.title}</h1>
        <h2 style="font-size: 48px; opacity: 0.7; 
                   margin-top: 20px; font-weight: 500; font-family: sans-serif; max-width: 900px; word-wrap: break-word;">${track.artist}</h2>
        <div style="margin-top: 200px; font-size: 36px; 
                    opacity: 0.5; font-family: sans-serif;">
          🎵 Mwijay Music Player
        </div>
      </div>
    `
    
    document.body.appendChild(cardElement)
    
    const canvas = await html2canvas(cardElement, {
      width: 1080,
      height: 1920,
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      allowTaint: true,
    })
    
    document.body.removeChild(cardElement)
    
    return canvas.toDataURL('image/png')
  }
  
  private showToast(message: string): void {
    const event = new CustomEvent('show-toast', {
      detail: { message, type: 'success' }
    })
    window.dispatchEvent(event)
  }
  
  private showShareModal(text: string, url: string): void {
    const event = new CustomEvent('show-share-modal', {
      detail: { text, url }
    })
    window.dispatchEvent(event)
  }
}

export const shareService = new ShareService()
export default shareService;
