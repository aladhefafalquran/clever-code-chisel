import { IndexedDBManager } from './indexedDBManager';

// Storage persistence manager with multiple fallback methods
export class StorageManager {
  private static readonly STORAGE_PREFIX = 'housekeeping_';
  private static readonly BACKUP_PREFIX = 'housekeeping_backup_';
  private static indexedDBReady = false;

  // Initialize all storage methods
  static async init(): Promise<void> {
    this.indexedDBReady = await IndexedDBManager.init();
    console.log('Storage Manager initialized:', {
      localStorage: this.isLocalStorageAvailable(),
      indexedDB: this.indexedDBReady
    });
  }
  
  // Check if localStorage is available and working
  static isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Get storage quota info
  static async getStorageInfo(): Promise<{used: number, quota: number, available: number}> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        return {
          used,
          quota,
          available: quota - used
        };
      } catch {
        return { used: 0, quota: 0, available: 0 };
      }
    }
    return { used: 0, quota: 0, available: 0 };
  }

  // Set item with multiple storage methods
  static async setItem(key: string, value: any): Promise<boolean> {
    const results = await Promise.allSettled([
      // Primary: IndexedDB (most persistent)
      this.indexedDBReady ? IndexedDBManager.setItem(key, value) : Promise.resolve(false),
      
      // Secondary: localStorage with backup
      this.setLocalStorageItem(key, value),
      
      // Tertiary: Auto-backup to downloads (for critical data)
      this.scheduleAutoBackup(key, value)
    ]);

    // Return true if at least one method succeeded
    const success = results.some(result => 
      result.status === 'fulfilled' && result.value === true
    );

    console.log(`Storage: Saved ${key} - IndexedDB: ${results[0].status}, localStorage: ${results[1].status}`);
    return success;
  }

  // localStorage fallback method
  private static setLocalStorageItem(key: string, value: any): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isLocalStorageAvailable()) {
        resolve(false);
        return;
      }
      
      try {
        const fullKey = this.STORAGE_PREFIX + key;
        const backupKey = this.BACKUP_PREFIX + key;
        const serializedValue = JSON.stringify(value);
        
        // Store main copy
        localStorage.setItem(fullKey, serializedValue);
        
        // Store backup copy
        localStorage.setItem(backupKey, serializedValue);
        
        resolve(true);
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
        resolve(false);
      }
    });
  }

  // Get item with multiple fallback methods
  static async getItem<T>(key: string): Promise<T | null> {
    // Try IndexedDB first (most persistent)
    if (this.indexedDBReady) {
      try {
        const indexedData = await IndexedDBManager.getItem<T>(key);
        if (indexedData !== null) {
          console.log(`Storage: Retrieved ${key} from IndexedDB`);
          return indexedData;
        }
      } catch (error) {
        console.error(`Failed to get ${key} from IndexedDB:`, error);
      }
    }

    // Fallback to localStorage
    return this.getLocalStorageItem<T>(key);
  }

  // localStorage fallback method
  private static getLocalStorageItem<T>(key: string): T | null {
    if (!this.isLocalStorageAvailable()) return null;
    
    try {
      const fullKey = this.STORAGE_PREFIX + key;
      const backupKey = this.BACKUP_PREFIX + key;
      
      // Try main copy first
      let item = localStorage.getItem(fullKey);
      
      // If main copy fails, try backup
      if (!item) {
        item = localStorage.getItem(backupKey);
        if (item) {
          // Restore main copy from backup
          localStorage.setItem(fullKey, item);
        }
      }
      
      const result = item ? JSON.parse(item) : null;
      if (result) {
        console.log(`Storage: Retrieved ${key} from localStorage`);
      }
      return result;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  }

  // Auto-backup critical data to downloads folder
  private static scheduleAutoBackup(key: string, value: any): Promise<boolean> {
    return new Promise((resolve) => {
      // Only auto-backup critical data types
      if (!['rooms', 'tasks', 'messages'].includes(key)) {
        resolve(true);
        return;
      }

      try {
        // Schedule backup after a delay to avoid overwhelming the system
        setTimeout(() => {
          this.createBackupFile(key, value);
        }, 5000);
        resolve(true);
      } catch (error) {
        console.error('Auto-backup scheduling failed:', error);
        resolve(false);
      }
    });
  }

  // Create backup file in downloads
  private static createBackupFile(key: string, value: any): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `housekeeping-${key}-backup-${timestamp}.json`;
      
      const data = { [key]: value, timestamp: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      console.log(`Auto-backup created: ${filename}`);
    } catch (error) {
      console.error('Failed to create backup file:', error);
    }
  }

  // Remove item from all storage methods
  static async removeItem(key: string): Promise<void> {
    const promises = [];

    // Remove from IndexedDB
    if (this.indexedDBReady) {
      promises.push(IndexedDBManager.removeItem(key));
    }

    // Remove from localStorage
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(this.STORAGE_PREFIX + key);
        localStorage.removeItem(this.BACKUP_PREFIX + key);
        promises.push(Promise.resolve(true));
      } catch (error) {
        console.error('Failed to remove from localStorage:', error);
        promises.push(Promise.resolve(false));
      }
    }

    await Promise.allSettled(promises);
  }

  // Export all data from all storage methods
  static async exportData(): Promise<string> {
    const data: Record<string, any> = {};
    
    // Try IndexedDB first
    if (this.indexedDBReady) {
      try {
        const indexedData = await IndexedDBManager.exportData();
        const parsed = JSON.parse(indexedData);
        Object.assign(data, parsed);
      } catch (error) {
        console.error('Failed to export from IndexedDB:', error);
      }
    }
    
    // Fallback to localStorage
    if (this.isLocalStorageAvailable()) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.STORAGE_PREFIX)) {
            const cleanKey = key.replace(this.STORAGE_PREFIX, '');
            // Only add if not already in data from IndexedDB
            if (!data[cleanKey]) {
              const value = localStorage.getItem(key);
              if (value) {
                data[cleanKey] = JSON.parse(value);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to export from localStorage:', error);
      }
    }
    
    return JSON.stringify(data, null, 2);
  }

  // Import data to all storage methods
  static async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      const promises: Promise<boolean>[] = [];
      
      for (const [key, value] of Object.entries(data)) {
        promises.push(this.setItem(key, value));
      }
      
      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Get all keys
  static getAllKeys(): string[] {
    if (!this.isLocalStorageAvailable()) return [];
    
    const keys: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          keys.push(key.replace(this.STORAGE_PREFIX, ''));
        }
      }
    } catch (error) {
      console.error('Failed to get keys:', error);
    }
    
    return keys;
  }

  // Clear all app data from all storage methods
  static async clearAll(): Promise<void> {
    const promises = [];

    // Clear IndexedDB
    if (this.indexedDBReady) {
      promises.push(IndexedDBManager.clearAll());
    }

    // Clear localStorage
    if (this.isLocalStorageAvailable()) {
      try {
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.STORAGE_PREFIX) || key?.startsWith(this.BACKUP_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        promises.push(Promise.resolve(true));
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
        promises.push(Promise.resolve(false));
      }
    }

    await Promise.allSettled(promises);
  }

  // Get storage method status
  static getStorageStatus(): { indexedDB: boolean, localStorage: boolean } {
    return {
      indexedDB: this.indexedDBReady,
      localStorage: this.isLocalStorageAvailable()
    };
  }
}