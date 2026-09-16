import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Home, Bookmark, Settings as SettingsIcon, Brain, X } from 'lucide-react';
import HomePage from '@popup/pages/HomePage';
import SavedPage from '@popup/pages/SavedPage';
import SettingsPage from '@popup/pages/SettingsPage';
import VocabPage from '@popup/pages/VocabPage';
import { getSettings, getThemeClass } from '@storage/settings';
import { MESSAGE_ACTIONS, STORAGE_KEYS } from '@shared/constants';
import { getBrowserAPI } from '@browser/types';

type Page = 'home' | 'saved' | 'learn' | 'settings';

function queryFromUrl(): string | undefined {
  try {
    const q = new URLSearchParams(window.location.search).get('q');
    return q && q.trim().length > 0 ? q.trim() : undefined;
  } catch {
    return undefined;
  }
}

export default function SidePanelApp() {
  const [page, setPage] = useState<Page>('home');
  const [initialQuery, setInitialQuery] = useState<string | undefined>(queryFromUrl);
  const consumed = useRef<string | undefined>(undefined);

  useEffect(() => {
    const applyTheme = async () => {
      const settings = await getSettings();
      document.documentElement.dataset.theme = getThemeClass(settings.theme);
    };
    void applyTheme();

    const api = getBrowserAPI();

    // Tell the content scripts that the panel is open so word selections
    // route here instead of the in-page tooltip. Cleared on teardown below.
    void api.storage.local.set({ [STORAGE_KEYS.SIDEPANEL_ACTIVE]: true });
    const clearActive = (): void => {
      void api.storage.local.set({ [STORAGE_KEYS.SIDEPANEL_ACTIVE]: false });
    };
    window.addEventListener('pagehide', clearActive);
    window.addEventListener('beforeunload', clearActive);

    const onStorageChanged = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
      area: string,
    ): void => {
      if (area === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
        void applyTheme();
      }
    };
    api.storage.onChanged.addListener(onStorageChanged);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const systemChange = () => void applyTheme();
    mql.addEventListener('change', systemChange);

    const loadQuery = (query: string | undefined): void => {
      if (!query || query === consumed.current) return;
      consumed.current = query;
      setInitialQuery(query);
    };

    // Live broadcast — the tooltip just opened the panel with a word.
    const onMessage = (message: unknown): void => {
      const msg = message as { action?: string; payload?: { query?: unknown } } | null;
      if (!msg || msg.action !== MESSAGE_ACTIONS.SIDEPANEL_LOAD) return;
      if (typeof msg.payload?.query === 'string') {
        setPage('home');
        loadQuery(msg.payload.query.trim());
      }
    };
    api.runtime.onMessage.addListener(onMessage);

    // Persisted handoff — the panel may have finished loading after the
    // broadcast above, so the word was stashed in storage.
    void (async () => {
      const stored = await api.storage.local.get(STORAGE_KEYS.SIDEPANEL_LAST_QUERY);
      const query = stored[STORAGE_KEYS.SIDEPANEL_LAST_QUERY];
      await api.storage.local.remove(STORAGE_KEYS.SIDEPANEL_LAST_QUERY);
      if (typeof query === 'string') loadQuery(query.trim());
    })();

    return () => {
      api.storage.onChanged.removeListener(onStorageChanged);
      api.runtime.onMessage.removeListener(onMessage);
      mql.removeEventListener('change', systemChange);
      window.removeEventListener('pagehide', clearActive);
      window.removeEventListener('beforeunload', clearActive);
    };
  }, []);

  const handleInitialQueryConsumed = useCallback(() => {
    setInitialQuery(undefined);
  }, []);

  const handleClose = useCallback(async () => {
    const api = getBrowserAPI();
    if (api.sidePanel) {
      try {
        await api.sidePanel.close();
        return;
      } catch {
        // Not an open side panel (e.g. new-tab fallback) — close below.
      }
    }
    try {
      window.close();
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="app side-panel">
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
            className={`nav-btn${page === 'learn' ? ' active' : ''}`}
            onClick={() => setPage('learn')}
            aria-label="Learn"
          >
            <Brain size={15} />
          </button>
          <button
            className={`nav-btn${page === 'settings' ? ' active' : ''}`}
            onClick={() => setPage('settings')}
            aria-label="Settings"
          >
            <SettingsIcon size={15} />
          </button>
          <button className="nav-btn" onClick={() => void handleClose()} aria-label="Close panel" title="Close">
            <X size={15} />
          </button>
        </nav>
      </header>

      <main className="app-content">
        {page === 'home' && (
          <HomePage initialQuery={initialQuery} onInitialQueryConsumed={handleInitialQueryConsumed} />
        )}
        {page === 'saved' && <SavedPage />}
        {page === 'learn' && <VocabPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}