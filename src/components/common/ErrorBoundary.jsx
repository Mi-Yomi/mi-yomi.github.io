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
                <div className="error-boundary">
                    <div className="error-boundary-icon">⚠️</div>
                    <h2 className="error-boundary-title">Что-то пошло не так</h2>
                    <p className="error-boundary-message">
                        {this.state.error?.message || 'Произошла непредвиденная ошибка'}
                    </p>
                    <button className="error-boundary-btn" onClick={() => this.setState({ hasError: false, error: null })}>
                        Попробовать снова
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
