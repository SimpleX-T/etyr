import type { Settings } from '../shared/types';
import { getStorageItem, setStorageItem } from './database';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/constants';

export async function getSettings(): Promise<Settings> {
  const stored = await getStorageItem(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
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
