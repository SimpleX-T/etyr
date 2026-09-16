export interface BrowserStorageArea {
  get(keys: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface BrowserAPI {
  storage: {
    local: BrowserStorageArea;
    sync: BrowserStorageArea;
    onChanged: {
      addListener(callback: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => void): void;
      removeListener(callback: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => void): void;
    };
  };
  runtime: {
    sendMessage(message: unknown): Promise<unknown>;
    onMessage: {
      addListener(callback: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => void): void;
      removeListener(callback: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => void): void;
    };
  };
  tabs: {
    query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Array<{ id?: number; url?: string }>>;
    create(properties: { url: string; active?: boolean }): Promise<{ id?: number }>;
  };
  sidePanel?: {
    open(options: { tabId?: number; windowId?: number }): Promise<void>;
    close(): Promise<void>;
    setOptions(options: { path?: string; tabId?: number; enabled?: boolean }): Promise<void>;
  };
  contextMenus?: {
    create(properties: Record<string, unknown>): void;
  };
}

let cachedAPI: BrowserAPI | null = null;

function hasExtensionAPI(obj: unknown): obj is BrowserAPI {
  if (!obj || typeof obj !== 'object') return false;
  const api = obj as Record<string, unknown>;
  if (!api.runtime || typeof api.runtime !== 'object') return false;
  const runtime = api.runtime as Record<string, unknown>;
  return typeof runtime.sendMessage === 'function';
}

export function getBrowserAPI(): BrowserAPI {
  if (cachedAPI) return cachedAPI;

  const globalObj = globalThis as Record<string, unknown>;

  if (hasExtensionAPI(globalObj.chrome)) {
    cachedAPI = globalObj.chrome as BrowserAPI;
  } else if (hasExtensionAPI(globalObj.browser)) {
    cachedAPI = globalObj.browser as BrowserAPI;
  } else {
    throw new Error('No browser extension API available');
  }

  return cachedAPI;
}

export function isExtensionContext(): boolean {
  try {
    const api = getBrowserAPI();
    return typeof api.runtime?.sendMessage === 'function';
  } catch {
    return false;
  }
}
