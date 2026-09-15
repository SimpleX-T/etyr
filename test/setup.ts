import 'fake-indexeddb/auto';

class MockStorageArea {
  private data: Record<string, unknown> = {};

  async get(keys: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>> {
    if (typeof keys === 'string') {
      return keys in this.data ? { [keys]: this.data[keys] } : {};
    }
    if (Array.isArray(keys)) {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in this.data) result[key] = this.data[key];
      }
      return result;
    }
    return {};
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.data, items);
  }

  async remove(keys: string | string[]): Promise<void> {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) {
      delete this.data[key];
    }
  }

  async clear(): Promise<void> {
    this.data = {};
  }
}

const mockStorageLocal = new MockStorageArea();
const mockStorageSync = new MockStorageArea();

(globalThis as Record<string, unknown>).chrome = {
  storage: {
    local: mockStorageLocal,
    sync: mockStorageSync,
  },
  runtime: {
    sendMessage: async () => ({}),
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  tabs: {
    query: async () => [],
  },
};
