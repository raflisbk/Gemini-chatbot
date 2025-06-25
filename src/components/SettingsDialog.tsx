'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Settings, Palette, MessageSquare, Zap, Info, Users, Shield, 
  Plus, Trash2, Eye, EyeOff, Save, AlertCircle, CheckCircle, User,
  Monitor, Moon, Sun, Download, Upload, RotateCcw, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, UserManager } from '@/context/AuthContext';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

interface StoredUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  isActive: boolean;
  lastLogin?: string;
  messageCount: number;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { 
    isAdmin, 
    user, 
    remainingQuota,
    modelSettings,
    chatSettings,
    appearanceSettings,
    updateModelSettings,
    updateChatSettings,
    updateAppearanceSettings,
    resetSettingsToDefaults,
    exportSettings,
    importSettings
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // User Management State
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    name: '',
    role: 'user'
  });

  const [users, setUsers] = useState<StoredUser[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Load users on mount
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = () => {
    try {
      setUsers(UserManager.getUsers());
    } catch (error) {
      console.error('Failed to load users:', error);
      showNotification('error', 'Failed to load users');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotifications({ type, message });
    setTimeout(() => setNotifications(null), 3000);
  };

  const handleAddUser = () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      showNotification('error', 'All fields are required');
      return;
    }

    if (newUser.password.length < 6) {
      showNotification('error', 'Password must be at least 6 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      showNotification('error', 'Please enter a valid email address');
      return;
    }

    const success = UserManager.addUser(newUser.email, newUser.password, newUser.name, newUser.role);
    
    if (success) {
      setNewUser({ email: '', password: '', name: '', role: 'user' });
      loadUsers(); // Refresh user list
      showNotification('success', 'User added successfully!');
    } else {
      showNotification('error', 'Email already exists or error occurred');
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    if (userId === user?.id) {
      showNotification('error', 'Cannot deactivate your own account');
      return;
    }

    const success = UserManager.updateUserStatus(userId, !currentStatus);
    if (success) {
      loadUsers();
      showNotification('success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } else {
      showNotification('error', 'Failed to update user status');
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === user?.id) {
      showNotification('error', 'Cannot delete your own account');
      return;
    }

    if (userId === 'admin-001') {
      showNotification('error', 'Cannot delete the default admin account');
      return;
    }

    const success = UserManager.deleteUser(userId);
    if (success) {
      loadUsers();
      showNotification('success', 'User deleted successfully');
    } else {
      showNotification('error', 'Failed to delete user');
    }
  };

  const handleImportSettings = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showNotification('error', 'Please select a valid JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = importSettings(content);
        if (success) {
          showNotification('success', 'Settings imported successfully!');
        } else {
          showNotification('error', 'Failed to import settings - invalid format');
        }
      } catch (error) {
        showNotification('error', 'Invalid settings file format');
      }
    };
    reader.onerror = () => {
      showNotification('error', 'Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      resetSettingsToDefaults();
      showNotification('success', 'Settings reset to defaults');
    }
  };

  const handleExportSettings = () => {
    try {
      exportSettings();
      showNotification('success', 'Settings exported successfully!');
    } catch (error) {
      showNotification('error', 'Failed to export settings');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    ...(isAdmin ? [{ id: 'model', label: 'AI Model', icon: Zap }] : []),
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    ...(isAdmin ? [{ id: 'users', label: 'Users', icon: Users }] : []),
    { id: 'about', label: 'About', icon: Info },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-background border rounded-xl shadow-2xl flex overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />

          {/* Notifications - Higher z-index and better positioning */}
          <AnimatePresence>
            {notifications && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className={`absolute top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl border min-w-[280px] ${
                  notifications.type === 'success' 
                    ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800' 
                    : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800'
                }`}
              >
                {notifications.type === 'success' ? 
                  <CheckCircle className="h-4 w-4 flex-shrink-0" /> : 
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                }
                <span className="text-sm font-medium">{notifications.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header - Fixed height and better spacing */}
          <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 border-b bg-background/95 backdrop-blur-sm z-40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Settings className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Configure your AI chatbot experience
                </p>
              </div>
            </div>
            
            {/* User info section - Added spacing */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isAdmin 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {isAdmin ? 'admin' : 'user'}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </span>
                </div>
              )}
              
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content - Adjusted top padding */}
          <div className="flex flex-1 pt-20">
            {/* Sidebar */}
            <div className="w-64 border-r bg-muted/30 p-4">
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleExportSettings}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Settings
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleImportSettings}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleResetToDefaults}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  
                  {/* General Tab */}
                  {activeTab === 'general' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">General Settings</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <label className="text-sm font-medium">Account Information</label>
                              <p className="text-xs text-muted-foreground">
                                {user?.name || 'Guest'} ({user?.email || 'No email'})
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isAdmin 
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                                : user 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {isAdmin ? 'Admin' : user ? 'User' : 'Guest'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <label className="text-sm font-medium">Daily Message Quota</label>
                              <p className="text-xs text-muted-foreground">
                                {remainingQuota} messages remaining today
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold">{remainingQuota}</div>
                              <div className="text-xs text-muted-foreground">
                                / {isAdmin ? '500' : user ? '50' : '10'}
                              </div>
                            </div>
                          </div>

                          <div className="p-4 border rounded-lg bg-muted/50">
                            <h4 className="text-sm font-medium mb-2">Application Info</h4>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Version: 2.0.0</p>
                              <p>Model: Google Gemini 2.0 Flash</p>
                              <p>Framework: Next.js 14</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Model Tab */}
                  {activeTab === 'model' && isAdmin && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">AI Model Configuration</h3>
                        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                              Admin Only: These settings affect all users and apply immediately
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-sm font-medium block mb-2">
                                Temperature: {modelSettings.temperature}
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={modelSettings.temperature}
                                onChange={(e) => updateModelSettings({ 
                                  temperature: parseFloat(e.target.value) 
                                })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Lower values make output more focused, higher values more creative
                              </p>
                            </div>

                            <div>
                              <label className="text-sm font-medium block mb-2">Max Tokens</label>
                              <Input
                                type="number"
                                min="100"
                                max="4096"
                                value={modelSettings.maxTokens}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (value >= 100 && value <= 4096) {
                                    updateModelSettings({ maxTokens: value });
                                  }
                                }}
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Maximum length of AI responses (100-4096)
                              </p>
                            </div>

                            <div>
                              <label className="text-sm font-medium block mb-2">
                                Top P: {modelSettings.topP}
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={modelSettings.topP}
                                onChange={(e) => updateModelSettings({ 
                                  topP: parseFloat(e.target.value) 
                                })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Controls diversity via nucleus sampling
                              </p>
                            </div>

                            <div>
                              <label className="text-sm font-medium block mb-2">Top K</label>
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={modelSettings.topK}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (value >= 1 && value <= 100) {
                                    updateModelSettings({ topK: value });
                                  }
                                }}
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Limits vocabulary to top K tokens (1-100)
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium block mb-2">System Prompt</label>
                            <textarea
                              value={modelSettings.systemPrompt}
                              onChange={(e) => updateModelSettings({ 
                                systemPrompt: e.target.value 
                              })}
                              placeholder="Enter custom system prompt..."
                              className="w-full h-32 p-3 text-sm border rounded-lg bg-background resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              maxLength={2000}
                            />
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground">
                                Custom instructions for the AI assistant behavior
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {modelSettings.systemPrompt.length}/2000
                              </p>
                            </div>
                          </div>

                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                Changes are applied immediately to all new conversations
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Appearance Tab */}
                  {activeTab === 'appearance' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Appearance Settings</h3>
                        <div className="space-y-6">
                          <div>
                            <label className="text-sm font-medium block mb-3">Theme</label>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { value: 'light', label: 'Light', icon: Sun },
                                { value: 'dark', label: 'Dark', icon: Moon },
                                { value: 'system', label: 'System', icon: Monitor }
                              ].map(({ value, label, icon: Icon }) => (
                                <button
                                  key={value}
                                  onClick={() => updateAppearanceSettings({ theme: value as any })}
                                  className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                                    appearanceSettings.theme === value
                                      ? 'border-primary bg-primary/10'
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span className="text-sm">{label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium block mb-3">Font Size</label>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { value: 'sm', label: 'Small', description: '14px' },
                                { value: 'md', label: 'Medium', description: '16px' },
                                { value: 'lg', label: 'Large', description: '18px' }
                              ].map(({ value, label, description }) => (
                                <button
                                  key={value}
                                  onClick={() => updateAppearanceSettings({ fontSize: value as any })}
                                  className={`p-3 border rounded-lg transition-colors text-sm ${
                                    appearanceSettings.fontSize === value
                                      ? 'border-primary bg-primary/10'
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                  <div className="font-medium">{label}</div>
                                  <div className="text-xs text-muted-foreground">{description}</div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium block mb-3">Sidebar Position</label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { value: 'left', label: 'Left Side' },
                                { value: 'right', label: 'Right Side' }
                              ].map(({ value, label }) => (
                                <button
                                  key={value}
                                  onClick={() => updateAppearanceSettings({ sidebarPosition: value as any })}
                                  className={`p-3 border rounded-lg transition-colors text-sm ${
                                    appearanceSettings.sidebarPosition === value
                                      ? 'border-primary bg-primary/10'
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium block mb-3">Accent Color</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={appearanceSettings.accentColor}
                                onChange={(e) => updateAppearanceSettings({ 
                                  accentColor: e.target.value 
                                })}
                                className="w-12 h-10 border rounded-lg cursor-pointer"
                              />
                              <Input
                                type="text"
                                value={appearanceSettings.accentColor}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^#[0-9A-F]{6}$/i.test(value) || value === '') {
                                    updateAppearanceSettings({ accentColor: value });
                                  }
                                }}
                                className="flex-1"
                                placeholder="#10b981"
                                pattern="^#[0-9A-F]{6}$"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Changes apply immediately to buttons and accent elements
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chat Tab */}
                  {activeTab === 'chat' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Chat Settings</h3>
                        <div className="space-y-4">
                          {[
                            { 
                              key: 'autoSave', 
                              label: 'Auto-save conversations', 
                              description: 'Automatically save your chat history' 
                            },
                            { 
                              key: 'showTimestamps', 
                              label: 'Show timestamps', 
                              description: 'Display message timestamps' 
                            },
                            { 
                              key: 'enableSounds', 
                              label: 'Enable notification sounds', 
                              description: 'Play sounds for new messages' 
                            },
                            { 
                              key: 'compactMode', 
                              label: 'Compact mode', 
                              description: 'Use compact message layout' 
                            },
                            { 
                              key: 'autoScroll', 
                              label: 'Auto-scroll to new messages', 
                              description: 'Automatically scroll to latest message' 
                            },
                            { 
                              key: 'markdownEnabled', 
                              label: 'Enable markdown rendering', 
                              description: 'Render markdown formatting in messages' 
                            }
                          ].map(({ key, label, description }) => (
                            <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <label className="text-sm font-medium">{label}</label>
                                <p className="text-xs text-muted-foreground">{description}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={chatSettings[key as keyof typeof chatSettings] as boolean}
                                  onChange={(e) => updateChatSettings({ 
                                    [key]: e.target.checked 
                                  })}
                                  className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Users Tab */}
                  {activeTab === 'users' && isAdmin && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">User Management</h3>
                        
                        {/* Add New User */}
                        <div className="border rounded-lg p-4 mb-6">
                          <h4 className="font-medium mb-3">Add New User</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                            <Input
                              placeholder="Full Name"
                              value={newUser.name}
                              onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <Input
                              type="email"
                              placeholder="Email Address"
                              value={newUser.email}
                              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                            />
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={newUser.password}
                                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            <select
                              value={newUser.role}
                              onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                              className="px-3 py-2 text-sm border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          
                          <Button onClick={handleAddUser} size="sm" className="w-full md:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Add User
                          </Button>
                        </div>

                        {/* User Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Users</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                              {users.length}
                            </div>
                          </div>
                          
                          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-300">Active Users</span>
                            </div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                              {users.filter(u => u.isActive).length}
                            </div>
                          </div>
                          
                          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Admins</span>
                            </div>
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">
                              {users.filter(u => u.role === 'admin').length}
                            </div>
                          </div>
                        </div>

                        {/* User List */}
                        <div>
                          <h4 className="font-medium mb-3">User List ({users.length})</h4>
                          {users.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No users found</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {users.map((userData) => (
                                <div key={userData.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {userData.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{userData.name}</span>
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            userData.role === 'admin' 
                                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                          }`}>
                                            {userData.role}
                                          </span>
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            userData.isActive 
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                          }`}>
                                            {userData.isActive ? 'Active' : 'Inactive'}
                                          </span>
                                          {userData.id === user?.id && (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                              You
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          {userData.email} • {userData.messageCount} messages
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Created: {new Date(userData.createdAt).toLocaleDateString()}
                                          {userData.lastLogin && ` • Last login: ${new Date(userData.lastLogin).toLocaleDateString()}`}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleUserStatus(userData.id, userData.isActive)}
                                      disabled={userData.id === user?.id}
                                      className="text-xs"
                                    >
                                      {userData.isActive ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    {userData.id !== 'admin-001' && userData.id !== user?.id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteUser(userData.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* About Tab */}
                  {activeTab === 'about' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">About AI Chatbot</h3>
                        <div className="space-y-6">
                          
                          {/* Application Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <p className="font-medium text-sm">Version</p>
                                <p className="text-muted-foreground">2.0.0</p>
                              </div>
                              <div>
                                <p className="font-medium text-sm">AI Model</p>
                                <p className="text-muted-foreground">Google Gemini 2.0 Flash</p>
                              </div>
                              <div>
                                <p className="font-medium text-sm">Last Updated</p>
                                <p className="text-muted-foreground">{new Date().toLocaleDateString()}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <p className="font-medium text-sm">Framework</p>
                                <p className="text-muted-foreground">Next.js 14 with App Router</p>
                              </div>
                              <div>
                                <p className="font-medium text-sm">Language</p>
                                <p className="text-muted-foreground">TypeScript</p>
                              </div>
                              <div>
                                <p className="font-medium text-sm">Styling</p>
                                <p className="text-muted-foreground">Tailwind CSS</p>
                              </div>
                            </div>
                          </div>

                          {/* Features */}
                          <div>
                            <p className="font-medium text-sm mb-3">Key Features</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {[
                                'Real-time Indonesian trending topics',
                                'Advanced user authentication system',
                                'Role-based access control',
                                'Chat history persistence',
                                'Daily usage quotas',
                                'Live theme switching',
                                'Responsive design',
                                'Live AI model configuration',
                                'User management panel',
                                'Export/Import settings'
                              ].map((feature, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                                  <span className="text-muted-foreground">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* System Status */}
                          <div className="border rounded-lg p-4">
                            <p className="font-medium text-sm mb-3">System Status</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Authentication System</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-green-600 dark:text-green-400">Active</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span>Settings Integration</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-green-600 dark:text-green-400">Live</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span>AI Service</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-green-600 dark:text-green-400">Operational</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span>User Management</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-green-600 dark:text-green-400">Active</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Support Information */}
                          <div className="border rounded-lg p-4">
                            <p className="font-medium text-sm mb-3">Support & Resources</p>
                            <div className="space-y-2 text-sm">
                              <p className="text-muted-foreground">
                                For technical support or feature requests, please contact your system administrator.
                              </p>
                              <div className="flex flex-wrap gap-4 mt-3">
                                <button className="text-primary hover:underline">Documentation</button>
                                <button className="text-primary hover:underline">API Reference</button>
                                <button className="text-primary hover:underline">GitHub Repository</button>
                                <button className="text-primary hover:underline">Report Issue</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Footer - Adjusted bottom spacing */}
          <div className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-between px-6 border-t bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>All settings are applied immediately</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}