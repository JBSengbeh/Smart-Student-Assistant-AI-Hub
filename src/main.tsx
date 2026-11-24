import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthAndSyncProvider } from './context/AuthAndSyncContext';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthAndSyncProvider>
      <App />
    </AuthAndSyncProvider>
  </ErrorBoundary>
);
