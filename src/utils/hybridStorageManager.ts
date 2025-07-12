import { GitHubDatabase } from './githubDatabase';
import { StorageManager } from './storageManager';

// Hybrid storage manager that prioritizes GitHub over local storage
export class HybridStorageManager {
  private static githubAvailable: boolean | null = null;

  // Initialize and check GitHub availability
  static async init(): Promise<void> {
    this.githubAvailable = await GitHubDatabase.isAvailable();
    console.log('Hybrid Storage Manager initialized:', {
      github: this.githubAvailable,
      localStorage: StorageManager.isLocalStorageAvailable()
    });

    // Initialize StorageManager for fallback
    await StorageManager.init();
  }

  // Get storage status
  static getStorageStatus(): { github: boolean, indexedDB: boolean, localStorage: boolean } {
    const localStatus = StorageManager.getStorageStatus();
    return {
      github: this.githubAvailable || false,
      indexedDB: localStatus.indexedDB,
      localStorage: localStatus.localStorage
    };
  }

  // Get data with GitHub priority
  static async getData(key: string): Promise<any | null> {
    console.log(`HybridStorage: Getting ${key}`);

    // Try GitHub first (most authoritative)
    if (this.githubAvailable) {
      try {
        const githubData = await GitHubDatabase.getFile(`${key}.json`);
        if (githubData !== null) {
          console.log(`HybridStorage: Retrieved ${key} from GitHub`);
          
          // Cache in local storage for offline access
          await StorageManager.setItem(key, githubData);
          
          return githubData;
        }
      } catch (error) {
        console.error(`Failed to get ${key} from GitHub:`, error);
      }
    }

    // Fallback to local storage
    console.log(`HybridStorage: Falling back to local storage for ${key}`);
    return await StorageManager.getItem(key);
  }

  // Save data to both GitHub and local storage
  static async setData(key: string, data: any): Promise<boolean> {
    console.log(`HybridStorage: Saving ${key}`);
    
    const results = await Promise.allSettled([
      // Primary: Save to GitHub
      this.githubAvailable ? this.saveToGitHub(key, data) : Promise.resolve(false),
      
      // Secondary: Save to local storage (immediate feedback)
      StorageManager.setItem(key, data)
    ]);

    const githubSuccess = results[0].status === 'fulfilled' && results[0].value;
    const localSuccess = results[1].status === 'fulfilled' && results[1].value;

    console.log(`HybridStorage: Save results for ${key} - GitHub: ${githubSuccess}, Local: ${localSuccess}`);
    
    // Return true if at least one method succeeded
    return githubSuccess || localSuccess;
  }

  // Save to GitHub with specific method based on data type
  private static async saveToGitHub(key: string, data: any): Promise<boolean> {
    try {
      switch (key) {
        case 'rooms':
          return await GitHubDatabase.saveRooms(data);
        case 'tasks':
          return await GitHubDatabase.saveTasks(data);
        case 'messages':
          return await GitHubDatabase.saveMessages(data);
        case 'archives':
          return await GitHubDatabase.saveArchives(data);
        default:
          // For custom data, save as JSON file
          return await GitHubDatabase.saveFile(`${key}.json`, data, `Update ${key} data`);
      }
    } catch (error) {
      console.error(`Failed to save ${key} to GitHub:`, error);
      return false;
    }
  }

  // Get rooms with proper date conversion
  static async getRooms(): Promise<any[]> {
    const rooms = await this.getData('rooms');
    if (!rooms || !Array.isArray(rooms)) {
      return [];
    }

    // Convert date strings back to Date objects for frontend compatibility
    return rooms.map((room: any) => ({
      ...room,
      hasGuests: Boolean(room.hasGuests),
      lastCleaned: room.lastCleaned ? new Date(room.lastCleaned) : null,
      lastUpdated: new Date(room.lastUpdated)
    }));
  }

  // Save rooms
  static async saveRooms(rooms: any[]): Promise<boolean> {
    return await this.setData('rooms', rooms);
  }

  // Update room status
  static async updateRoomStatus(roomNumber: string, status: string): Promise<boolean> {
    const rooms = await this.getData('rooms');
    if (!rooms) return false;

    const room = rooms.find((r: any) => r.number === roomNumber);
    if (room) {
      room.status = status;
      room.lastCleaned = status === 'clean' ? new Date().toISOString() : room.lastCleaned;
      room.lastUpdated = new Date().toISOString();
      return await this.saveRooms(rooms);
    }
    return false;
  }

  // Update guest status
  static async updateGuestStatus(roomNumber: string, hasGuests: boolean): Promise<boolean> {
    const rooms = await this.getData('rooms');
    if (!rooms) return false;

    const room = rooms.find((r: any) => r.number === roomNumber);
    if (room) {
      room.hasGuests = hasGuests;
      room.lastUpdated = new Date().toISOString();
      return await this.saveRooms(rooms);
    }
    return false;
  }

  // Get tasks with proper date conversion
  static async getTasks(): Promise<any[]> {
    const tasks = await this.getData('tasks');
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }

    // Convert date strings back to Date objects for frontend compatibility
    return tasks.map((task: any) => ({
      ...task,
      timestamp: new Date(task.timestamp),
      completed: Boolean(task.completed),
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined
    }));
  }

  // Add task
  static async addTask(task: any): Promise<any> {
    const tasks = await this.getData('tasks') || [];
    
    const newTask = {
      ...task,
      id: task.id || Date.now().toString(),
      timestamp: new Date().toISOString(),
      completed: false
    };
    
    tasks.push(newTask);
    await this.setData('tasks', tasks);
    
    // Return with Date object for frontend compatibility
    return {
      ...newTask,
      timestamp: new Date(newTask.timestamp)
    };
  }

  // Complete task
  static async completeTask(taskId: string, completedBy: string): Promise<boolean> {
    const tasks = await this.getData('tasks');
    if (!tasks) return false;

    const task = tasks.find((t: any) => t.id === taskId);
    if (task) {
      task.completed = true;
      task.completedBy = completedBy;
      task.completedAt = new Date().toISOString();
      return await this.setData('tasks', tasks);
    }
    return false;
  }

  // Get messages with proper date conversion
  static async getMessages(): Promise<any[]> {
    const messages = await this.getData('messages');
    if (!messages || !Array.isArray(messages)) {
      return [];
    }

    // Convert date strings back to Date objects for frontend compatibility
    return messages.map((message: any) => ({
      ...message,
      timestamp: new Date(message.timestamp)
    }));
  }

  // Add message
  static async addMessage(message: any): Promise<any> {
    const messages = await this.getData('messages') || [];
    
    const newMessage = {
      ...message,
      id: message.id || Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    messages.push(newMessage);
    await this.setData('messages', messages);
    
    // Return with Date object for frontend compatibility
    return {
      ...newMessage,
      timestamp: new Date(newMessage.timestamp)
    };
  }

  // Get archives
  static async getArchives(): Promise<any[]> {
    const archives = await this.getData('archives');
    return archives || [];
  }

  // Add archive
  static async addArchive(archiveData: any): Promise<boolean> {
    const archives = await this.getArchives();
    const newArchive = {
      id: Date.now(),
      ...archiveData,
      createdAt: new Date().toISOString()
    };
    archives.push(newArchive);
    return await this.setData('archives', archives);
  }

  // Export all data
  static async exportData(): Promise<string> {
    if (this.githubAvailable) {
      try {
        return await GitHubDatabase.exportAllData();
      } catch (error) {
        console.error('Failed to export from GitHub, using local storage:', error);
      }
    }
    
    // Fallback to local storage export
    return await StorageManager.exportData();
  }

  // Import data
  static async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      const promises: Promise<boolean>[] = [];
      
      if (data.rooms) promises.push(this.setData('rooms', data.rooms));
      if (data.tasks) promises.push(this.setData('tasks', data.tasks));
      if (data.messages) promises.push(this.setData('messages', data.messages));
      if (data.archives) promises.push(this.setData('archives', data.archives));

      const results = await Promise.all(promises);
      return results.some(result => result); // Return true if at least one succeeded
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    const promises = [];
    
    if (this.githubAvailable) {
      promises.push(GitHubDatabase.clearAllData());
    }
    
    promises.push(StorageManager.clearAll());
    
    await Promise.allSettled(promises);
  }
}