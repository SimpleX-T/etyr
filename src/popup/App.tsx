import { useState, useEffect } from 'react';
import { BookOpen, Home, Bookmark, Settings as SettingsIcon } from 'lucide-react';
import HomePage from './pages/HomePage';
import SavedPage from './pages/SavedPage';
import SettingsPage from './pages/SettingsPage';
import { getSettings, getThemeClass } from '@storage/settings';
import { STORAGE_KEYS } from '@shared/constants';
import { getBrowserAPI } from '@browser/types';

type Page = 'home' | 'saved' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('home');

  useEffect(() => {
    const applyTheme = async () => {
      const settings = await getSettings();
      document.documentElement.dataset.theme = getThemeClass(settings.theme);
    };
    void applyTheme();

    const api = getBrowserAPI();
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
        void applyTheme();
      }
    };
    api.storage.onChanged.addListener(listener);
    
    // Also listen for system theme changes if set to system
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const systemListener = () => void applyTheme();
    mql.addEventListener('change', systemListener);
    
    return () => {
      api.storage.onChanged.removeListener(listener);
      mql.removeEventListener('change', systemListener);
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <BookOpen size={16} className="brand-icon" />
          <span className="brand-name">Etyr</span>
        </div>
        <nav className="nav">
          <button
            className={`nav-btn${page === 'home' ? ' active' : ''}`}
            onClick={() => setPage('home')}
            aria-label="Home"
          >
            <Home size={15} />
          </button>
          <button
            className={`nav-btn${page === 'saved' ? ' active' : ''}`}
            onClick={() => setPage('saved')}
            aria-label="Saved words"
          >
            <Bookmark size={15} />
          </button>
          <button
            className={`nav-btn${page === 'settings' ? ' active' : ''}`}
            onClick={() => setPage('settings')}
            aria-label="Settings"
          >
            <SettingsIcon size={15} />
          </button>
        </nav>
      </header>

      <main className="app-content">
        {page === 'home' && <HomePage />}
        {page === 'saved' && <SavedPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}