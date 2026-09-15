import { getStorageItem, setStorageItem } from './database';
import { STORAGE_KEYS } from '../shared/constants';

export async function getExcludedSites(): Promise<string[]> {
  return (await getStorageItem(STORAGE_KEYS.EXCLUDED_SITES)) || [];
}

export async function isSiteExcluded(domain?: string): Promise<boolean> {
  if (!domain) {
    domain = window.location.hostname;
  }
  const excluded = await getExcludedSites();
  return excluded.some(d => domain!.includes(d) || d.includes(domain!));
}

export async function addExclusion(domain: string): Promise<void> {
  const excluded = await getExcludedSites();
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  if (!excluded.includes(normalized)) {
    excluded.push(normalized);
    await setStorageItem(STORAGE_KEYS.EXCLUDED_SITES, excluded);
  }
}

export async function removeExclusion(domain: string): Promise<void> {
  const excluded = await getExcludedSites();
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  const filtered = excluded.filter(d => d !== normalized);
  await setStorageItem(STORAGE_KEYS.EXCLUDED_SITES, filtered);
}

export function getCurrentDomain(): string {
  return window.location.hostname.replace(/^www\./, '');
}
