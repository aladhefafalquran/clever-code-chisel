// Storage persistence manager with better reliability
export class StorageManager {
  private static readonly STORAGE_PREFIX = 'housekeeping_';
  private static readonly BACKUP_PREFIX = 'housekeeping_backup_';
  
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

  // Set item with backup
  static setItem(key: string, value: any): boolean {
    if (!this.isLocalStorageAvailable()) return false;
    
    try {
      const fullKey = this.STORAGE_PREFIX + key;
      const backupKey = this.BACKUP_PREFIX + key;
      const serializedValue = JSON.stringify(value);
      
      // Store main copy
      localStorage.setItem(fullKey, serializedValue);
      
      // Store backup copy
      localStorage.setItem(backupKey, serializedValue);
      
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  // Get item with fallback to backup
  static getItem<T>(key: string): T | null {
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
      
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  }

  // Remove item and its backup
  static removeItem(key: string): void {
    if (!this.isLocalStorageAvailable()) return;
    
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
      localStorage.removeItem(this.BACKUP_PREFIX + key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }

  // Export all data
  static exportData(): string {
    const data: Record<string, any> = {};
    
    if (!this.isLocalStorageAvailable()) return JSON.stringify(data);
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          const cleanKey = key.replace(this.STORAGE_PREFIX, '');
          const value = localStorage.getItem(key);
          if (value) {
            data[cleanKey] = JSON.parse(value);
          }
        }
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
    
    return JSON.stringify(data, null, 2);
  }

  // Import data
  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      for (const [key, value] of Object.entries(data)) {
        this.setItem(key, value);
      }
      
      return true;
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

  // Clear all app data
  static clearAll(): void {
    if (!this.isLocalStorageAvailable()) return;
    
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX) || key?.startsWith(this.BACKUP_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }
}