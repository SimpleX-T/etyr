import type { Settings } from '../shared/types';
import { getStorageItem, setStorageItem } from './database';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/constants';

// Models that are known to not work on the HF router — auto-migrate to default
const DEPRECATED_MODELS = [
  'meta-llama/Llama-3.2-3B-Instruct',
  'meta-llama/Llama-3.2-1B-Instruct',
];

export async function getSettings(): Promise<Settings> {
  const stored = await getStorageItem(STORAGE_KEYS.SETTINGS);
  const merged = { ...DEFAULT_SETTINGS, ...stored } as Settings;

  // Auto-migrate deprecated models
  if (merged.aiModel && DEPRECATED_MODELS.includes(merged.aiModel)) {
    merged.aiModel = DEFAULT_SETTINGS.aiModel;
    await setStorageItem(STORAGE_KEYS.SETTINGS, merged);
  }

  return merged;
}

export async function setSettings(settings: Settings): Promise<void> {
  await setStorageItem(STORAGE_KEYS.SETTINGS, settings);
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...patch };
  await setStorageItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

export function getThemeClass(theme: Settings['theme']): string {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}
