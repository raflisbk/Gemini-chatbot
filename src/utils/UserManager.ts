// src/utils/UserManager.ts
import { generateId } from '@/lib/utils';

export interface StoredUser {
  id: string;
  email: string;
  password: string; // In production, this should be hashed
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  isActive: boolean;
  lastLogin?: string;
  messageCount: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

// Storage keys
const USERS_STORAGE_KEY = 'ai-chatbot-users';
const CURRENT_USER_KEY = 'ai-chatbot-current-user';

export class UserManager {
  /**
   * Initialize the user system with default admin account
   */
  static initialize(): void {
    const users = this.getUsers();
    
    // Create default admin if no users exist
    if (users.length === 0) {
      const defaultAdmin: StoredUser = {
        id: 'admin-001',
        email: 'admin@example.com',
        password: 'admin123', // In production, use proper hashing
        name: 'System Administrator',
        role: 'admin',
        createdAt: new Date().toISOString(),
        isActive: true,
        messageCount: 0
      };
      
      this.saveUsers([defaultAdmin]);
    }
  }

  /**
   * Get all users from localStorage
   */
  static getUsers(): StoredUser[] {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (!stored) {
        this.initialize();
        return this.getUsers();
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  /**
   * Save users to localStorage
   */
  private static saveUsers(users: StoredUser[]): void {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  /**
   * Add a new user
   */
  static addUser(email: string, password: string, name: string, role: 'admin' | 'user' = 'user'): boolean {
    try {
      const users = this.getUsers();
      
      // Check if email already exists
      if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
        return false;
      }

      const newUser: StoredUser = {
        id: generateId(),
        email: email.toLowerCase().trim(),
        password, // In production, hash this password
        name: name.trim(),
        role,
        createdAt: new Date().toISOString(),
        isActive: true,
        messageCount: 0
      };

      users.push(newUser);
      this.saveUsers(users);
      return true;
    } catch (error) {
      console.error('Error adding user:', error);
      return false;
    }
  }

  /**
   * Update user status (active/inactive)
   */
  static updateUserStatus(userId: string, isActive: boolean): boolean {
    try {
      const users = this.getUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        return false;
      }

      users[userIndex].isActive = isActive;
      this.saveUsers(users);
      return true;
    } catch (error) {
      console.error('Error updating user status:', error);
      return false;
    }
  }

  /**
   * Delete a user
   */
  static deleteUser(userId: string): boolean {
    try {
      const users = this.getUsers();
      const filteredUsers = users.filter(user => user.id !== userId);
      
      if (filteredUsers.length === users.length) {
        return false; // User not found
      }

      this.saveUsers(filteredUsers);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  /**
   * Authenticate user login
   */
  static authenticateUser(email: string, password: string): StoredUser | null {
    try {
      const users = this.getUsers();
      const user = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === password && 
        u.isActive
      );

      if (user) {
        // Update last login
        user.lastLogin = new Date().toISOString();
        this.saveUsers(users);
        return user;
      }

      return null;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  static getUserById(userId: string): StoredUser | null {
    try {
      const users = this.getUsers();
      return users.find(user => user.id === userId) || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  static getUserByEmail(email: string): StoredUser | null {
    try {
      const users = this.getUsers();
      return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Update user information
   */
  static updateUser(userId: string, updates: Partial<StoredUser>): boolean {
    try {
      const users = this.getUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        return false;
      }

      // Prevent updating sensitive fields via this method
      const allowedUpdates = { ...updates };
      delete allowedUpdates.id;
      delete allowedUpdates.password; // Use separate method for password updates
      
      users[userIndex] = { ...users[userIndex], ...allowedUpdates };
      this.saveUsers(users);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  /**
   * Update user password
   */
  static updateUserPassword(userId: string, newPassword: string): boolean {
    try {
      const users = this.getUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        return false;
      }

      users[userIndex].password = newPassword; // In production, hash this
      this.saveUsers(users);
      return true;
    } catch (error) {
      console.error('Error updating user password:', error);
      return false;
    }
  }

  /**
   * Increment user message count
   */
  static incrementMessageCount(userId: string): boolean {
    try {
      const users = this.getUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        return false;
      }

      users[userIndex].messageCount += 1;
      this.saveUsers(users);
      return true;
    } catch (error) {
      console.error('Error incrementing message count:', error);
      return false;
    }
  }

  /**
   * Get users by role
   */
  static getUsersByRole(role: 'admin' | 'user'): StoredUser[] {
    try {
      const users = this.getUsers();
      return users.filter(user => user.role === role);
    } catch (error) {
      console.error('Error getting users by role:', error);
      return [];
    }
  }

  /**
   * Get active users count
   */
  static getActiveUsersCount(): number {
    try {
      const users = this.getUsers();
      return users.filter(user => user.isActive).length;
    } catch (error) {
      console.error('Error getting active users count:', error);
      return 0;
    }
  }

  /**
   * Search users by name or email
   */
  static searchUsers(query: string): StoredUser[] {
    try {
      const users = this.getUsers();
      const searchTerm = query.toLowerCase().trim();
      
      if (!searchTerm) {
        return users;
      }

      return users.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Export users data (for admin backup)
   */
  static exportUsers(): string {
    try {
      const users = this.getUsers();
      // Remove sensitive data for export
      const exportData = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        messageCount: user.messageCount
      }));
      
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        userCount: exportData.length,
        users: exportData
      }, null, 2);
    } catch (error) {
      console.error('Error exporting users:', error);
      return '';
    }
  }

  /**
   * Get user statistics
   */
  static getUserStats(): {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    regularUsers: number;
    totalMessages: number;
  } {
    try {
      const users = this.getUsers();
      
      return {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        inactiveUsers: users.filter(u => !u.isActive).length,
        adminUsers: users.filter(u => u.role === 'admin').length,
        regularUsers: users.filter(u => u.role === 'user').length,
        totalMessages: users.reduce((sum, u) => sum + u.messageCount, 0)
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        totalMessages: 0
      };
    }
  }

  /**
   * Clear all users (use with caution)
   */
  static clearAllUsers(): void {
    try {
      localStorage.removeItem(USERS_STORAGE_KEY);
      this.initialize(); // Recreate default admin
    } catch (error) {
      console.error('Error clearing users:', error);
    }
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  UserManager.initialize();
}