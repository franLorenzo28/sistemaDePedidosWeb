import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error capturado por ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="name-prompt-overlay">
          <div className="name-prompt-card">
            <div className="name-prompt-icon">⚠️</div>
            <div className="name-prompt-title">Algo salió mal</div>
            <div className="name-prompt-sub">Ocurrió un error inesperado. Recargá la página para seguir operando.</div>
            <button className="btn btn-secondary name-prompt-btn" onClick={() => location.reload()}>Recargar página</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
