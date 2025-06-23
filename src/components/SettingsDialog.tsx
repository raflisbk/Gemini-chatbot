'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Palette, MessageSquare, Zap, Info, Users, Shield, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { isAdmin, user, remainingQuota } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    modelTemperature: 0.7,
    maxTokens: 1024,
    systemPrompt: '',
    autoSave: true,
    darkMode: 'auto',
  });

  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    name: '',
    role: 'user'
  });

  const [users, setUsers] = useState(UserManager.getUsers());
  const [addUserSuccess, setAddUserSuccess] = useState('');
  const [addUserError, setAddUserError] = useState('');

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    ...(isAdmin ? [{ id: 'model', label: 'AI Model', icon: Zap }] : []),
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    ...(isAdmin ? [{ id: 'users', label: 'Users', icon: Users }] : []),
    { id: 'about', label: 'About', icon: Info },
  ];

  const handleAddUser = () => {
    setAddUserError('');
    setAddUserSuccess('');

    if (!newUser.email || !newUser.password || !newUser.name) {
      setAddUserError('Semua field harus diisi');
      return;
    }

    if (newUser.password.length < 6) {
      setAddUserError('Password minimal 6 karakter');
      return;
    }

    const success = UserManager.addUser(newUser.email, newUser.password, newUser.name, newUser.role);
    
    if (success) {
      setAddUserSuccess('User berhasil ditambahkan');
      setNewUser({ email: '', password: '', name: '', role: 'user' });
      setUsers(UserManager.getUsers()); // Refresh user list
    } else {
      setAddUserError('Email sudah terdaftar atau terjadi kesalahan');
    }
  };

  const handleToggleUserStatus = (userId: string, isActive: boolean) => {
    const success = isActive ? UserManager.deactivateUser(userId) : UserManager.activateUser(userId);
    if (success) {
      setUsers(UserManager.getUsers()); // Refresh user list
    }
  };

  const handleUpdateUserRole = (userId: string, role: 'admin' | 'user') => {
    const success = UserManager.updateUserRole(userId, role);
    if (success) {
      setUsers(UserManager.getUsers()); // Refresh user list
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-4 md:inset-8 lg:inset-16 bg-card rounded-xl border shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Settings</h2>
              {isAdmin && (
                <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Quota: {remainingQuota} pesan tersisa
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex h-[calc(100%-5rem)]">
            {/* Sidebar */}
            <div className="w-48 border-r bg-muted/20">
              <div className="p-2">
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
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">General Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Auto-save conversations</label>
                          <p className="text-xs text-muted-foreground">Automatically save your chat history</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.autoSave}
                          onChange={(e) => setSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                          className="rounded"
                        />
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Account Type</label>
                            <p className="text-xs text-muted-foreground">
                              {isAdmin ? 'Administrator account' : 'Regular user account'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            isAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isAdmin ? 'Admin' : 'User'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'model' && isAdmin && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">AI Model Configuration</h3>
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
                      <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin Only: These settings affect all users
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium block mb-2">Temperature: {settings.modelTemperature}</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.modelTemperature}
                          onChange={(e) => setSettings(prev => ({ ...prev, modelTemperature: parseFloat(e.target.value) }))}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Lower values make output more focused, higher values more creative
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium block mb-2">Max Tokens</label>
                        <Input
                          type="number"
                          value={settings.maxTokens}
                          onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                          className="w-32"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum length of AI responses
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium block mb-2">System Prompt</label>
                        <textarea
                          value={settings.systemPrompt}
                          onChange={(e) => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                          placeholder="Enter custom system prompt..."
                          className="w-full h-24 p-3 text-sm border rounded-lg bg-background resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Custom instructions for the AI assistant
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'users' && isAdmin && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">User Management</h3>
                    
                    {/* Add New User */}
                    <div className="bg-muted/50 rounded-lg p-4 mb-6">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add New User
                      </h4>
                      
                      {addUserError && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded p-2 mb-3">
                          <p className="text-sm text-destructive">{addUserError}</p>
                        </div>
                      )}
                      
                      {addUserSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded p-2 mb-3">
                          <p className="text-sm text-green-700">{addUserSuccess}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <Input
                          placeholder="Name"
                          value={newUser.name}
                          onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Input
                          placeholder="Email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <Input
                          placeholder="Password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        />
                        <select
                          value={newUser.role}
                          onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                          className="px-3 py-2 text-sm border rounded-lg bg-background"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      
                      <Button onClick={handleAddUser} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </div>

                    {/* User List */}
                    <div>
                      <h4 className="font-medium mb-3">Existing Users ({users.length})</h4>
                      <div className="space-y-2">
                        {users.map((userData) => (
                          <div key={userData.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{userData.name}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  userData.role === 'admin' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {userData.role}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  userData.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {userData.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{userData.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Created: {new Date(userData.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <select
                                value={userData.role}
                                onChange={(e) => handleUpdateUserRole(userData.id, e.target.value as 'admin' | 'user')}
                                className="px-2 py-1 text-xs border rounded bg-background"
                                disabled={userData.id === user?.id} // Can't change own role
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                              
                              <Button
                                size="sm"
                                variant={userData.isActive ? "destructive" : "default"}
                                onClick={() => handleToggleUserStatus(userData.id, userData.isActive)}
                                disabled={userData.id === user?.id} // Can't deactivate self
                              >
                                {userData.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Appearance</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium block mb-2">Theme</label>
                        <select
                          value={settings.darkMode}
                          onChange={(e) => setSettings(prev => ({ ...prev, darkMode: e.target.value }))}
                          className="w-40 p-2 text-sm border rounded-lg bg-background"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Chat Settings</h3>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Chat-specific settings will be available in future updates.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'about' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">About AI Chatbot</h3>
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="font-medium">Version</p>
                        <p className="text-muted-foreground">2.0.0</p>
                      </div>
                      <div>
                        <p className="font-medium">Built with</p>
                        <p className="text-muted-foreground">Next.js, TypeScript, Tailwind CSS, Framer Motion</p>
                      </div>
                      <div>
                        <p className="font-medium">AI Model</p>
                        <p className="text-muted-foreground">Google Gemini Pro</p>
                      </div>
                      <div>
                        <p className="font-medium">Features</p>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Real-time Indonesian trending topics</li>
                          <li>User authentication & management</li>
                          <li>Chat history persistence</li>
                          <li>Role-based access control</li>
                          <li>Daily usage quotas</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              Save Changes
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}