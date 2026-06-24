import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mwijay.music.app',
  appName: 'Mwijay Music',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#C8F052",
      sound: "beep.wav",
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      clientId: "848484568269-pcjiscjcd2mg05j3rrfrnfpan5i122a1.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
    Keyboard: {
      resize: 'none' as any,
      style: 'DARK' as any,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e1b4b',
      overlaysWebView: false,
    },
  },
};

export default config;
