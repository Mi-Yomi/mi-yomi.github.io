import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 40, textAlign: 'center', color: '#b3b3b3' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h2 style={{ color: '#fff', marginBottom: 8 }}>Что-то пошло не так</h2>
                    <p style={{ fontSize: 14, marginBottom: 24 }}>
                        {this.state.error?.message || 'Произошла непредвиденная ошибка'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            padding: '12px 24px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #e50914, #ff4444)', color: '#fff',
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        Попробовать снова
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
