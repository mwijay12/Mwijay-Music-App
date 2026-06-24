import { Capacitor } from '@capacitor/core'
import { Camera } from '@capacitor/camera'
import { Geolocation } from '@capacitor/geolocation'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Filesystem } from '@capacitor/filesystem'
import MediaControl from '../plugins/MediaControl'

export type PermissionType = 
  | 'camera' 
  | 'microphone' 
  | 'storage' 
  | 'location' 
  | 'notifications'
  | 'photos'

export interface PermissionStatus {
  granted: boolean
  denied: boolean
  restricted: boolean
  message?: string
}

class PermissionsService {
  
  async checkAll(): Promise<Record<PermissionType, PermissionStatus>> {
    return {
      camera: await this.check('camera'),
      microphone: await this.check('microphone'),
      storage: await this.check('storage'),
      location: await this.check('location'),
      notifications: await this.check('notifications'),
      photos: await this.check('photos'),
    }
  }
  
  async check(type: PermissionType): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return this.checkWebPermission(type)
    }
    
    try {
      switch (type) {
        case 'camera':
        case 'photos':
          const camStatus = await Camera.checkPermissions()
          return {
            granted: camStatus.camera === 'granted' || camStatus.photos === 'granted',
            denied: camStatus.camera === 'denied' && camStatus.photos === 'denied',
            restricted: false,
          }
        
        case 'location':
          const locStatus = await Geolocation.checkPermissions()
          return {
            granted: locStatus.location === 'granted',
            denied: locStatus.location === 'denied',
            restricted: false,
          }
        
        case 'notifications':
          const notifStatus = await LocalNotifications.checkPermissions()
          return {
            granted: notifStatus.display === 'granted',
            denied: notifStatus.display === 'denied',
            restricted: false,
          }
        
        case 'microphone':
          // Microphone via getUserMedia check fallback
          return this.checkMicrophone()
        
        case 'storage':
          try {
            if (Capacitor.isNativePlatform()) {
              const status = await MediaControl.getMediaPermissionsStatus();
              const isAndroid13 = (status as any).media !== undefined;
              const isGranted = isAndroid13 ? (status.media === 'granted') : (status.storage === 'granted');
              const isDenied = isAndroid13 ? (status.media === 'denied') : (status.storage === 'denied');
              return {
                granted: isGranted,
                denied: isDenied,
                restricted: false,
              };
            }
            const storageStatus = await Filesystem.checkPermissions()
            return {
              granted: storageStatus.publicStorage === 'granted',
              denied: storageStatus.publicStorage === 'denied',
              restricted: false,
            }
          } catch {
            return { granted: false, denied: false, restricted: false }
          }
        
        default:
          return { granted: false, denied: false, restricted: false }
      }
    } catch (error) {
      return { 
        granted: false, 
        denied: false, 
        restricted: false,
        message: String(error)
      }
    }
  }
  
  async request(type: PermissionType): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return this.requestWebPermission(type)
    }
    
    try {
      switch (type) {
        case 'camera':
        case 'photos':
          const camResult = await Camera.requestPermissions({
            permissions: ['camera', 'photos']
          })
          return {
            granted: camResult.camera === 'granted' || camResult.photos === 'granted',
            denied: camResult.camera === 'denied' && camResult.photos === 'denied',
            restricted: false,
            message: 'Camera and Photo access needed to upload profile pictures',
          }
        
        case 'location':
          const locResult = await Geolocation.requestPermissions()
          return {
            granted: locResult.location === 'granted',
            denied: locResult.location === 'denied',
            restricted: false,
            message: 'Location needed for nearby concerts',
          }
        
        case 'notifications':
          const notifResult = await LocalNotifications.requestPermissions()
          return {
            granted: notifResult.display === 'granted',
            denied: notifResult.display === 'denied',
            restricted: false,
            message: 'Get daily music quotes and updates',
          }
        
        case 'microphone':
          return this.requestMicrophone()
        
        case 'storage':
          try {
            if (Capacitor.isNativePlatform()) {
              const status = await MediaControl.requestMediaPermissions();
              const isAndroid13 = (status as any).media !== undefined;
              const isGranted = isAndroid13 ? (status.media === 'granted') : (status.storage === 'granted');
              const isDenied = isAndroid13 ? (status.media === 'denied') : (status.storage === 'denied');
              return {
                granted: isGranted,
                denied: isDenied,
                restricted: false,
                message: 'Media and Storage access needed to discover offline music files',
              };
            }
            const storageResult = await Filesystem.requestPermissions()
            return {
              granted: storageResult.publicStorage === 'granted',
              denied: storageResult.publicStorage === 'denied',
              restricted: false,
              message: 'Storage access needed to discover offline music files',
            }
          } catch (e) {
            return {
              granted: false,
              denied: true,
              restricted: false,
              message: String(e),
            }
          }
        
        default:
          return { granted: false, denied: false, restricted: false }
      }
    } catch (error) {
      return { 
        granted: false, 
        denied: true, 
        restricted: false,
        message: 'Permission was denied'
      }
    }
  }
  
  private async checkMicrophone(): Promise<PermissionStatus> {
    try {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName
      })
      return {
        granted: result.state === 'granted',
        denied: result.state === 'denied',
        restricted: false,
      }
    } catch {
      return { granted: false, denied: false, restricted: false }
    }
  }
  
  private async requestMicrophone(): Promise<PermissionStatus> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      })
      // Immediately stop the stream
      stream.getTracks().forEach(track => track.stop())
      
      return { 
        granted: true, 
        denied: false, 
        restricted: false,
        message: 'Microphone needed for karaoke and voice features'
      }
    } catch {
      return { 
        granted: false, 
        denied: true, 
        restricted: false,
        message: 'Microphone access denied'
      }
    }
  }
  
  private async checkWebPermission(
    type: PermissionType
  ): Promise<PermissionStatus> {
    try {
      if (type === 'microphone') return this.checkMicrophone()
      const result = await navigator.permissions.query({
        name: type as PermissionName
      })
      return {
        granted: result.state === 'granted',
        denied: result.state === 'denied',
        restricted: false,
      }
    } catch {
      return { granted: false, denied: false, restricted: false }
    }
  }
  
  private async requestWebPermission(
    type: PermissionType
  ): Promise<PermissionStatus> {
    switch (type) {
      case 'microphone':
        return this.requestMicrophone()
      case 'notifications':
        const perm = await Notification.requestPermission()
        return {
          granted: perm === 'granted',
          denied: perm === 'denied',
          restricted: false,
        }
      default:
        return { granted: false, denied: false, restricted: false }
    }
  }
  
  // Show permission rationale dialog before requesting
  async requestWithRationale(
    type: PermissionType,
    title: string,
    message: string
  ): Promise<PermissionStatus> {
    
    const status = await this.check(type)
    if (status.granted) return status
    
    // Show custom dialog explaining why
    const accepted = await this.showRationaleDialog(title, message)
    if (!accepted) {
      return { granted: false, denied: false, restricted: false }
    }
    
    return this.request(type)
  }
  
  private showRationaleDialog(
    title: string, 
    message: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Trigger custom dialog component event
      const event = new CustomEvent('show-permission-rational-dialog', {
        detail: {
          title,
          message,
          onAccept: () => resolve(true),
          onDeny: () => resolve(false),
        }
      })
      window.dispatchEvent(event)
    })
  }
}

export const permissions = new PermissionsService()
export default permissions;
