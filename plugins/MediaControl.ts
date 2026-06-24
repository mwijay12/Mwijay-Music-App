import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface MediaControlPlugin {
  update(options: {
    type: 'music' | 'radio' | 'reel'
    title: string
    artist: string
    album?: string
    artwork?: string
    isPlaying: boolean
    isLiked?: boolean
    isLive?: boolean
    duration?: number  // milliseconds
    position?: number  // milliseconds
  }): Promise<void>

  stop(): Promise<void>

  scanMedia(): Promise<{ audio: any[], videos: any[] }>

  requestMediaPermissions(): Promise<{ media: string, storage: string, notifications: string, bluetooth: string }>

  getMediaPermissionsStatus(): Promise<{ media: string, storage: string, notifications: string, bluetooth: string }>

  addListener(
    eventName: 'mediaAction',
    listener: (data: { action: string, position?: number }) => void
  ): Promise<PluginListenerHandle>
}

const MediaControl = registerPlugin<MediaControlPlugin>('MediaControl', {
  web: {
    update: async () => console.log('[MediaControl] web fallback update'),
    stop: async () => console.log('[MediaControl] web fallback stop'),
    scanMedia: async () => ({ audio: [], videos: [] }),
    requestMediaPermissions: async () => ({ media: 'granted', storage: 'granted', notifications: 'granted', bluetooth: 'granted' }),
    getMediaPermissionsStatus: async () => ({ media: 'granted', storage: 'granted', notifications: 'granted', bluetooth: 'granted' }),
    addListener: async () => ({ remove: async () => {} }) as any
  }
});

export default MediaControl;
