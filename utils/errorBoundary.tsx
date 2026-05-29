import React from 'react';
import { crashReporter } from '../services/crashReportService.ts';
import { analytics } from '../services/analyticsService.ts';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Top-level React Error Boundary.
 * Catches unhandled render errors, reports them to Firestore & Analytics,
 * and shows a clean recovery UI instead of a white screen.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    crashReporter.reportCrash(error, {
      component: info.componentStack?.split('\n')[1]?.trim() || 'ErrorBoundary',
      action: 'render_error',
    });
    analytics.trackError(error, 'ErrorBoundary');
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;

      return (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: '#0d0d0d',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'white', fontFamily: 'sans-serif', padding: '2rem',
            textAlign: 'center', zIndex: 99999,
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😵</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '2rem', maxWidth: 400 }}>
            We've captured this error automatically. Try recovering below.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white', border: 'none',
                padding: '0.75rem 1.5rem', borderRadius: '999px',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#9333ea',
                color: 'white', border: 'none',
                padding: '0.75rem 1.5rem', borderRadius: '999px',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
              }}
            >
              Reload App
            </button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                marginTop: '2rem', padding: '1rem',
                background: '#1a1a1a', borderRadius: '1rem',
                fontSize: '0.7rem', color: '#f87171',
                textAlign: 'left', maxWidth: '90vw',
                overflowX: 'auto', maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
