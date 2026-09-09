import React from 'react';

interface State {
  error: Error | null;
  info: string | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: info.componentStack });
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 20,
          background: '#1a1a2e',
          color: '#ff6b6b',
          fontFamily: 'monospace',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          minHeight: '100vh',
        }}>
          <h2 style={{ color: '#fff' }}>App Crashed</h2>
          <p><strong>{this.state.error.name}:</strong> {this.state.error.message}</p>
          <pre>{this.state.error.stack}</pre>
          {this.state.info && (
            <>
              <h3 style={{ color: '#fff' }}>Component Stack</h3>
              <pre>{this.state.info}</pre>
            </>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
