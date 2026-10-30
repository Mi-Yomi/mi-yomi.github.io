import { Component } from 'react';
import { isChunkLoadError, reloadForChunkError } from '../../lib/chunkRecovery.js';

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
        reloadForChunkError(error);
    }

    render() {
        if (this.state.hasError) {
            const outdated = isChunkLoadError(this.state.error);
            return (
                <div className="error-boundary">
                    <div className="error-boundary-icon">⚠️</div>
                    <h2 className="error-boundary-title">Что-то пошло не так</h2>
                    <p className="error-boundary-message">
                        {outdated
                            ? 'Не удалось загрузить часть приложения. Обновите страницу; если нет связи — дождитесь подключения.'
                            : this.state.error?.message || 'Произошла непредвиденная ошибка'}
                    </p>
                    <button className="error-boundary-btn" onClick={() => outdated
                        ? window.location.reload()
                        : this.setState({ hasError: false, error: null })}>
                        {outdated ? 'Обновить страницу' : 'Попробовать снова'}
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
