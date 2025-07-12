// GitHub-based database system for persistent storage
export class GitHubDatabase {
  private static readonly REPO_OWNER = 'aladhefafalquran';
  private static readonly REPO_NAME = 'clever-code-chisel';
  private static readonly BRANCH = 'master';
  private static readonly DATA_PATH = 'data';
  
  // GitHub API endpoints
  private static readonly API_BASE = 'https://api.github.com';
  private static readonly CONTENTS_API = `${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents`;

  // Check if GitHub API is available
  static async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.CONTENTS_API}/${this.DATA_PATH}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Housekeeping-App'
        }
      });
      return response.ok || response.status === 404; // 404 is OK, means folder doesn't exist yet
    } catch (error) {
      console.error('GitHub API check failed:', error);
      return false;
    }
  }

  // Get file content from GitHub
  static async getFile(filename: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.CONTENTS_API}/${this.DATA_PATH}/${filename}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Housekeeping-App'
        }
      });

      if (response.status === 404) {
        console.log(`File ${filename} not found in GitHub repository`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Decode base64 content
      const content = atob(data.content.replace(/\n/g, ''));
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to get file ${filename} from GitHub:`, error);
      return null;
    }
  }

  // Save file to GitHub (requires authentication)
  static async saveFile(filename: string, data: any, message: string = 'Update data'): Promise<boolean> {
    try {
      // First, try to get the current file to get its SHA (required for updates)
      let sha: string | undefined;
      
      try {
        const currentResponse = await fetch(`${this.CONTENTS_API}/${this.DATA_PATH}/${filename}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Housekeeping-App'
          }
        });

        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          sha = currentData.sha;
        }
      } catch (error) {
        // File doesn't exist, that's OK
      }

      // Encode content as base64
      const content = btoa(JSON.stringify(data, null, 2));

      const requestBody: any = {
        message: `${message} - ${new Date().toISOString()}`,
        content: content,
        branch: this.BRANCH
      };

      // Include SHA if we're updating an existing file
      if (sha) {
        requestBody.sha = sha;
      }

      // Note: This requires authentication token, but we'll try without first
      const response = await fetch(`${this.CONTENTS_API}/${this.DATA_PATH}/${filename}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Housekeeping-App'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`GitHub API save failed:`, response.status, errorData);
        return false;
      }

      console.log(`Successfully saved ${filename} to GitHub`);
      return true;
    } catch (error) {
      console.error(`Failed to save file ${filename} to GitHub:`, error);
      return false;
    }
  }

  // Initialize default data files
  static async initializeDefaultFiles(): Promise<void> {
    const defaultData = {
      rooms: this.getDefaultRooms(),
      tasks: [],
      messages: [],
      archives: []
    };

    // Try to create each file if it doesn't exist
    for (const [filename, data] of Object.entries(defaultData)) {
      const existing = await this.getFile(`${filename}.json`);
      if (!existing) {
        console.log(`Creating default ${filename}.json in GitHub repository`);
        await this.saveFile(`${filename}.json`, data, `Initialize default ${filename} data`);
      }
    }
  }

  // Get default rooms data
  private static getDefaultRooms() {
    const defaultRooms = [];
    for (let floor = 1; floor <= 5; floor++) {
      for (let roomNum = 1; roomNum <= 8; roomNum++) {
        const roomNumber = `${floor}0${roomNum}`;
        defaultRooms.push({
          id: (floor - 1) * 8 + roomNum,
          number: roomNumber,
          floor,
          status: 'default',
          hasGuests: false,
          lastCleaned: null,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    return defaultRooms;
  }

  // Get all rooms
  static async getRooms(): Promise<any[]> {
    const rooms = await this.getFile('rooms.json');
    return rooms || this.getDefaultRooms();
  }

  // Save rooms
  static async saveRooms(rooms: any[]): Promise<boolean> {
    return await this.saveFile('rooms.json', rooms, 'Update rooms data');
  }

  // Get all tasks
  static async getTasks(): Promise<any[]> {
    const tasks = await this.getFile('tasks.json');
    return tasks || [];
  }

  // Save tasks
  static async saveTasks(tasks: any[]): Promise<boolean> {
    return await this.saveFile('tasks.json', tasks, 'Update tasks data');
  }

  // Get all messages
  static async getMessages(): Promise<any[]> {
    const messages = await this.getFile('messages.json');
    return messages || [];
  }

  // Save messages
  static async saveMessages(messages: any[]): Promise<boolean> {
    return await this.saveFile('messages.json', messages, 'Update messages data');
  }

  // Get all archives
  static async getArchives(): Promise<any[]> {
    const archives = await this.getFile('archives.json');
    return archives || [];
  }

  // Save archives
  static async saveArchives(archives: any[]): Promise<boolean> {
    return await this.saveFile('archives.json', archives, 'Update archives data');
  }

  // Export all data
  static async exportAllData(): Promise<string> {
    try {
      const [rooms, tasks, messages, archives] = await Promise.all([
        this.getRooms(),
        this.getTasks(),
        this.getMessages(),
        this.getArchives()
      ]);

      return JSON.stringify({
        rooms,
        tasks,
        messages,
        archives,
        exported_at: new Date().toISOString()
      }, null, 2);
    } catch (error) {
      console.error('Failed to export data from GitHub:', error);
      return '{}';
    }
  }

  // Import all data
  static async importAllData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      const promises = [];
      if (data.rooms) promises.push(this.saveRooms(data.rooms));
      if (data.tasks) promises.push(this.saveTasks(data.tasks));
      if (data.messages) promises.push(this.saveMessages(data.messages));
      if (data.archives) promises.push(this.saveArchives(data.archives));

      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Failed to import data to GitHub:', error);
      return false;
    }
  }

  // Clear all data (reset to defaults)
  static async clearAllData(): Promise<boolean> {
    try {
      const promises = [
        this.saveRooms(this.getDefaultRooms()),
        this.saveTasks([]),
        this.saveMessages([]),
        this.saveArchives([])
      ];

      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Failed to clear data in GitHub:', error);
      return false;
    }
  }
}