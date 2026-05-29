import React, { type ReactNode, type ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

import { AuthProvider } from './contexts/AuthContext.tsx';

// Suppress benign ResizeObserver loop errors
const resizeObserverLoopErr = /Loop completed with undelivered notifications|ResizeObserver loop limit exceeded/;
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && resizeObserverLoopErr.test(args[0])) {
    return;
  }
  originalError.call(console, ...args);
};

window.addEventListener('error', (e) => {
  if (resizeObserverLoopErr.test(e.message)) {
    e.stopImmediatePropagation();
  }
});

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };
  
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          color: '#fff', 
          padding: '20px', 
          textAlign: 'center', 
          background: '#0D0D0D', 
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Something went wrong.</h1>
          <p style={{ color: '#888', marginBottom: '20px', maxWidth: '300px' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '12px 24px', 
              background: '#C8F052', 
              color: 'black', 
              border: 'none', 
              borderRadius: '99px', 
              fontWeight: 'bold',
              cursor: 'pointer' 
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (e) {
    console.error("Root render failed", e);
    // Fallback manual error display if React fails completely
    rootElement.innerHTML = '<div style="color:red; padding:20px;">Fatal Error: App failed to mount. Check console.</div>';
  }
}

// Register PWA Service Worker manually (Only on Web/Browser, skip in native Android APK / Capacitor app)
if ('serviceWorker' in navigator && !(window as any).Capacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PWA Service Worker registered:', reg.scope))
      .catch(err => console.error('PWA Service Worker registration failed:', err));
  });
}