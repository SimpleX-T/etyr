import { useCallback, useEffect, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import type { Settings } from '@shared/types';
import { MESSAGE_ACTIONS } from '@shared/constants';
import { sendMessage } from '@shared/messaging';
import { getBrowserAPI } from '@browser/types';

/* ------------------------------------------------------------------ */
/*  Toggle row (compact for popup)                                     */
/* ------------------------------------------------------------------ */

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <label className="field-row">
      <span className="field-label">{label}</span>
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadSettings = useCallback(async () => {
    const res = await sendMessage<Settings>({
      action: MESSAGE_ACTIONS.SETTINGS_GET,
    });
    if (res?.ok === true && res.data) {
      setSettings(res.data);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
      void sendMessage({
        action: MESSAGE_ACTIONS.SETTINGS_SET,
        payload: patch,
      });
    },
    [],
  );

  const openFullSettings = useCallback(() => {
    const runtime = getBrowserAPI().runtime as unknown as {
      openOptionsPage?: () => void;
    };
    if (runtime.openOptionsPage) runtime.openOptionsPage();
  }, []);

  if (!settings) {
    return <div className="status">Loading&hellip;</div>;
  }

  return (
    <div className="popup-settings">
      <ToggleRow
        label="Auto lookup"
        checked={settings.autoLookup}
        onChange={(v) => update({ autoLookup: v })}
      />
      <ToggleRow
        label="Pronunciation"
        checked={settings.enablePronunciation}
        onChange={(v) => update({ enablePronunciation: v })}
      />
      <ToggleRow
        label="History"
        checked={settings.enableHistory}
        onChange={(v) => update({ enableHistory: v })}
      />

      <label className="field-row">
        <span className="field-label">Delay</span>
        <select
          className="field-select"
          value={settings.lookupDelayMs}
          onChange={(e) =>
            update({ lookupDelayMs: Number(e.target.value) })
          }
        >
          <option value={1000}>1 s</option>
          <option value={1500}>1.5 s</option>
          <option value={2000}>2 s</option>
        </select>
      </label>

      <label className="field-row">
        <span className="field-label">Theme</span>
        <select
          className="field-select"
          value={settings.theme}
          onChange={(e) =>
            update({ theme: e.target.value as Settings['theme'] })
          }
        >
          <option value="system">System</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>

      <button className="btn full" onClick={openFullSettings}>
        <SettingsIcon size={13} /> Full settings
      </button>
    </div>
  );
}