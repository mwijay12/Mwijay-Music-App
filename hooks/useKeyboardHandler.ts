import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

interface KeyboardState {
  isOpen: boolean
  height: number
}

export function useKeyboardHandler() {
  const [keyboard, setKeyboard] = useState<KeyboardState>({
    isOpen: false,
    height: 0,
  })
  
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback using visualViewport
      const handleResize = () => {
        if (!window.visualViewport) return
        
        const heightDiff = window.innerHeight - window.visualViewport.height
        setKeyboard({
          isOpen: heightDiff > 150,
          height: heightDiff,
        })
      }
      
      window.visualViewport?.addEventListener('resize', handleResize)
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize)
      }
    }
    
    // Native Capacitor keyboard events
    let showListener: any = null
    let hideListener: any = null
    
    Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboard({ isOpen: true, height: info.keyboardHeight })
    }).then((listener) => {
      showListener = listener
    })
    
    Keyboard.addListener('keyboardWillHide', () => {
      setKeyboard({ isOpen: false, height: 0 })
    }).then((listener) => {
      hideListener = listener
    })
    
    return () => {
      if (showListener) showListener.remove()
      if (hideListener) hideListener.remove()
    }
  }, [])
  
  return keyboard
}

export default useKeyboardHandler;
