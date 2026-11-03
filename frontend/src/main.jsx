import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { initButtonSpinFeedback } from './lib/buttonSpinFeedback'

// Auto-recovery for SPA deployment version skew (stale dynamic import chunk hashes)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = parseInt(sessionStorage.getItem('last_chunk_reload') || '0', 10);
  const now = Date.now();
  if (now - lastReload > 8000) {
    sessionStorage.setItem('last_chunk_reload', String(now));
    window.location.reload();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed')
  ) {
    const lastReload = parseInt(sessionStorage.getItem('last_chunk_reload') || '0', 10);
    const now = Date.now();
    if (now - lastReload > 8000) {
      sessionStorage.setItem('last_chunk_reload', String(now));
      window.location.reload();
    }
  }
});

// Initialize universal button click spin micro-interaction
initButtonSpinFeedback();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchInterval: 10000, // 10s default polling
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
