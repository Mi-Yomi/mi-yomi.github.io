import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { AppProvider } from './context/AppContext.jsx';
import App from './App.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <AppProvider>
        <App />
    </AppProvider>
);

// vite-plugin-pwa service worker (precached shell, autoUpdate). No-op in dev.
registerSW({ immediate: true });

// Drop caches left behind by the old hand-rolled service worker.
if ('caches' in window) {
    caches.delete('hades-v3').catch(() => {});
    caches.delete('tmdb-images-v2').catch(() => {});
}
