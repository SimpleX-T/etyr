import { useCallback, useEffect, useState } from 'react';
import {
  Globe,
  X,
  Trash2,
  Download,
  Plus,
  BookOpen,
} from 'lucide-react';
import type { Settings } from '@shared/types';
import { MESSAGE_ACTIONS, STORAGE_KEYS } from '@shared/constants';
import { sendMessage } from '@shared/messaging';
import { getBrowserAPI } from '@browser/types';
import { getSettings, getThemeClass } from '@storage/settings';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function downloadBlob(content: string, fileName: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function extractDomain(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

interface ToggleFieldProps {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function ToggleField({ label, desc, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="field-row">
      <div className="field-text">
        <span className="field-label">{label}</span>
        {desc && <span className="field-desc">{desc}</span>}
      </div>
      <span className={`toggle${checked ? ' on' : ''}`}>
        <input
          type="checkbox"
          className="toggle-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-track">
          <span className="toggle-thumb" />
        </span>
      </span>
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  desc?: string;
  value: string | number;
  options: Array<{ value: string | number; label: string }>;
  onChange: (value: string) => void;
}

function SelectField({ label, desc, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="field-row">
      <div className="field-text">
        <span className="field-label">{label}</span>
        {desc && <span className="field-desc">{desc}</span>}
      </div>
      <select
        className="field-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* -- loaders ----------------------------------------------------- */

  const loadSettings = useCallback(async () => {
    const res = await sendMessage<Settings>({
      action: MESSAGE_ACTIONS.SETTINGS_GET,
    });
    if (res?.ok === true && res.data) setSettings(res.data);
  }, []);

  const loadExclusions = useCallback(async () => {
    const res = await sendMessage<string[]>({
      action: MESSAGE_ACTIONS.EXCLUSION_GET_ALL,
    });
    if (res?.ok === true && Array.isArray(res.data)) setExclusions(res.data);
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadExclusions();
  }, [loadSettings, loadExclusions]);

  useEffect(() => {
    const applyTheme = async () => {
      const current = await getSettings();
      document.documentElement.dataset.theme = getThemeClass(current.theme);
    };
    void applyTheme();

    const api = getBrowserAPI();
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
        void applyTheme();
      }
    };
    api.storage.onChanged.addListener(listener);
    
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const systemListener = () => void applyTheme();
    mql.addEventListener('change', systemListener);
    
    return () => {
      api.storage.onChanged.removeListener(listener);
      mql.removeEventListener('change', systemListener);
    };
  }, []);

  /* -- settings mutations ------------------------------------------ */

  const updateSetting = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
      void sendMessage({
        action: MESSAGE_ACTIONS.SETTINGS_SET,
        payload: patch,
      });
    },
    [],
  );

  /* -- exclusions -------------------------------------------------- */

  const addCurrentSite = useCallback(async () => {
    const api = getBrowserAPI();
    try {
      const tabs = await api.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      const url = tab?.url;
      if (!url) {
        setNotice('Could not read the current tab URL. Grant the "tabs" permission to use this feature.');
        return;
      }
      const domain = extractDomain(url);
      if (!domain) {
        setNotice('Could not extract a domain from the current tab.');
        return;
      }
      if (exclusions.includes(domain)) {
        setNotice(`${domain} is already excluded.`);
        return;
      }
      await sendMessage({
        action: MESSAGE_ACTIONS.EXCLUSION_ADD,
        payload: { domain },
      });
      setExclusions((prev) => [...prev, domain]);
      setNotice(`Added ${domain} to exclusions.`);
    } catch {
      setNotice('An error occurred while reading the current tab.');
    }
  }, [exclusions]);

  const removeExclusion = useCallback(async (domain: string) => {
    await sendMessage({
      action: MESSAGE_ACTIONS.EXCLUSION_REMOVE,
      payload: { domain },
    });
    setExclusions((prev) => prev.filter((d) => d !== domain));
  }, []);

  /* -- data actions ------------------------------------------------- */

  const clearHistory = useCallback(async () => {
    await sendMessage({ action: MESSAGE_ACTIONS.HISTORY_CLEAR });
    setNotice('Lookup history cleared.');
  }, []);

  const clearSavedWords = useCallback(async () => {
    await sendMessage({ action: MESSAGE_ACTIONS.SAVED_CLEAR });
    setNotice('Saved words cleared.');
  }, []);

  const exportSavedWords = useCallback(async () => {
    const res = await sendMessage<{ json: string; count: number }>({
      action: MESSAGE_ACTIONS.EXPORT_SAVED,
    });
    if (res?.ok === true && res.data) {
      downloadBlob(res.data.json, 'etyr-saved-words.json', 'application/json');
      setNotice(`Exported ${res.data.count} words.`);
    } else {
      setNotice('Export failed.');
    }
  }, []);

  /* -- confirm dialog ----------------------------------------------- */

  const confirmBefore = useCallback(
    (message: string, action: () => void) => {
      setConfirm({ message, onConfirm: action });
    },
    [],
  );

  /* -- render ----------------------------------------------------- */

  return (
    <div className="options-shell">
      <header className="options-header">
        <div className="options-brand">
          <BookOpen size={18} className="brand-icon" />
          <span className="brand-name">Etyr Settings</span>
        </div>
      </header>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            className="icon-btn dismiss"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {!settings && (
        <div className="status">Loading&hellip;</div>
      )}

      {settings && (
        <>
          {/* ---- Behavior ---- */}
          <section className="settings-section">
            <h2 className="section-head">Behavior</h2>

            <ToggleField
              label="Auto lookup"
              desc="Show definitions automatically when text is selected."
              checked={settings.autoLookup}
              onChange={(v) => updateSetting({ autoLookup: v })}
            />
            <ToggleField
              label="Pronunciation"
              desc="Read words aloud with a speaker button."
              checked={settings.enablePronunciation}
              onChange={(v) => updateSetting({ enablePronunciation: v })}
            />
            <ToggleField
              label="Lookup history"
              desc="Keep a record of recent lookups."
              checked={settings.enableHistory}
              onChange={(v) => updateSetting({ enableHistory: v })}
            />
            <SelectField
              label="Lookup delay"
              desc="How long to wait before looking up a selection."
              value={settings.lookupDelayMs}
              options={[
                { value: 1000, label: '1 second' },
                { value: 1500, label: '1.5 seconds' },
                { value: 2000, label: '2 seconds' },
              ]}
              onChange={(v) => updateSetting({ lookupDelayMs: Number(v) })}
            />
            <SelectField
              label="Theme"
              desc="Interface appearance."
              value={settings.theme}
              options={[
                { value: 'system', label: 'System' },
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ]}
              onChange={(v) =>
                updateSetting({ theme: v as Settings['theme'] })
              }
            />
          </section>

          {/* ---- Exclusions ---- */}
          <section className="settings-section">
            <h2 className="section-head">Excluded sites</h2>
            <p className="section-desc">
              Etyr will not activate on these sites.
            </p>

            {exclusions.length > 0 ? (
              <ul className="exclusion-list">
                {exclusions.map((domain) => (
                  <li key={domain} className="exclusion-item">
                    <Globe size={13} className="exclusion-icon" />
                    <span className="exclusion-domain">{domain}</span>
                    <button
                      className="icon-btn danger"
                      onClick={() => void removeExclusion(domain)}
                      aria-label={`Remove ${domain}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-hint">No sites excluded. Etyr works everywhere.</p>
            )}

            <button className="btn" onClick={() => void addCurrentSite()}>
              <Plus size={13} /> Add current site
            </button>
          </section>

          {/* ---- Data ---- */}
          <section className="settings-section">
            <h2 className="section-head">Data</h2>

            <div className="button-row">
              <button
                className="btn"
                onClick={() => void exportSavedWords()}
              >
                <Download size={13} /> Export saved words
              </button>

              <button
                className="btn danger"
                onClick={() =>
                  confirmBefore(
                    'Delete all saved words?',
                    () => void clearSavedWords(),
                  )
                }
              >
                <Trash2 size={13} /> Clear saved words
              </button>

              <button
                className="btn danger"
                onClick={() =>
                  confirmBefore(
                    'Clear all lookup history?',
                    () => void clearHistory(),
                  )
                }
              >
                <Trash2 size={13} /> Clear history
              </button>
            </div>
          </section>
        </>
      )}

      {/* ---- Confirm dialog ---- */}
      {confirm && (
        <div
          className="confirm-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirm(null)}
        >
          <div
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="confirm-message">{confirm.message}</p>
            <div className="confirm-actions">
              <button
                className="btn"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  confirm.onConfirm();
                  setConfirm(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}