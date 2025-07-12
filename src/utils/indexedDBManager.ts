// IndexedDB manager for more persistent storage
export class IndexedDBManager {
  private static readonly DB_NAME = 'HousekeepingDB';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'housekeeping_data';
  
  private static db: IDBDatabase | null = null;

  // Initialize IndexedDB
  static async init(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) {
        console.log('IndexedDB not supported');
        resolve(false);
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open failed:', request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Ensure DB is initialized
  private static async ensureDB(): Promise<boolean> {
    if (this.db) return true;
    return await this.init();
  }

  // Set item in IndexedDB
  static async setItem(key: string, value: any): Promise<boolean> {
    const dbReady = await this.ensureDB();
    if (!dbReady || !this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const data = {
        key,
        value: JSON.stringify(value),
        timestamp: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`IndexedDB: Saved ${key}`);
        resolve(true);
      };

      request.onerror = () => {
        console.error(`IndexedDB: Failed to save ${key}:`, request.error);
        resolve(false);
      };
    });
  }

  // Get item from IndexedDB
  static async getItem<T>(key: string): Promise<T | null> {
    const dbReady = await this.ensureDB();
    if (!dbReady || !this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result) {
          try {
            const parsed = JSON.parse(request.result.value);
            resolve(parsed);
          } catch (error) {
            console.error(`IndexedDB: Failed to parse ${key}:`, error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error(`IndexedDB: Failed to get ${key}:`, request.error);
        resolve(null);
      };
    });
  }

  // Remove item from IndexedDB
  static async removeItem(key: string): Promise<boolean> {
    const dbReady = await this.ensureDB();
    if (!dbReady || !this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error(`IndexedDB: Failed to remove ${key}:`, request.error);
        resolve(false);
      };
    });
  }

  // Get all keys
  static async getAllKeys(): Promise<string[]> {
    const dbReady = await this.ensureDB();
    if (!dbReady || !this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to get keys:', request.error);
        resolve([]);
      };
    });
  }

  // Export all data
  static async exportData(): Promise<string> {
    const dbReady = await this.ensureDB();
    if (!dbReady || !this.db) return '{}';

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const data: Record<string, any> = {};
        request.result.forEach((item: any) => {
          try {
            data[item.key] = JSON.parse(item.value);
          } catch (error) {
            console.error(`Failed to parse ${item.key}:`, error);
          }
        });
        resolve(JSON.stringify(data, null, 2));
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to export data:', request.error);
        resolve('{}');
      };
    });
  }

  // Import data
  static async importData(jsonData: string): Promise<boolean> {
    const dbReady = await this.ensureDB();
    if (!dbReady || !this.db) return false;

    try {
      const data = JSON.parse(jsonData);
      const promises: Promise<boolean>[] = [];

      for (const [key, value] of Object.entries(data)) {
        promises.push(this.setItem(key, value));
      }

      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('IndexedDB: Failed to import data:', error);
      return false;
    }
  }

  // Clear all data
  static async clearAll(): Promise<boolean> {
    const dbReady = await this.ensureDB();
    if (!dbReady || !this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to clear data:', request.error);
        resolve(false);
      };
    });
  }

  // Check if IndexedDB is available and working
  static async isAvailable(): Promise<boolean> {
    return await this.ensureDB();
  }
}