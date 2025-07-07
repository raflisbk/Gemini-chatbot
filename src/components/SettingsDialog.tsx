'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  X, 
  Bot, 
  Palette, 
  Volume2, 
  Shield,
  Save,
  RotateCcw,
  Download,
  Upload,
  Sliders,
  Users,
  UserPlus,
  Trash2,
  Edit,
  Crown,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewUser {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
}

interface ExistingUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  message_count?: number;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { 
    isAdmin,
    modelSettings,
    chatSettings,
    appearanceSettings,
    voiceSettings,
    privacySettings,
    updateModelSettings,
    updateChatSettings,
    updateAppearanceSettings,
    updateVoiceSettings,
    updatePrivacySettings,
    resetSettingsToDefaults,
    exportSettings,
    importSettings
  } = useAuth();

  const { setTheme } = useTheme();
  
  // Settings state
  const [activeTab, setActiveTab] = useState('model');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // User management state
  const [users, setUsers] = useState<ExistingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    name: '',
    password: '',
    role: 'user'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userFormErrors, setUserFormErrors] = useState<{
    email?: string;
    name?: string;
    password?: string;
  }>({});
  const [userActionMessage, setUserActionMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load users for admin
  const loadUsers = async () => {
    if (!isAdmin) return;
    
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors: typeof userFormErrors = {};
    if (!newUser.email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(newUser.email)) errors.email = 'Invalid email format';
    if (!newUser.name) errors.name = 'Name is required';
    if (!newUser.password) errors.password = 'Password is required';
    else if (newUser.password.length < 6) errors.password = 'Password must be at least 6 characters';
    
    setUserFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsCreatingUser(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();
      
      if (response.ok) {
        setUserActionMessage({
          type: 'success',
          message: `User ${newUser.email} created successfully!`
        });
        setNewUser({ email: '', name: '', password: '', role: 'user' });
        setShowAddUser(false);
        loadUsers(); // Refresh user list
      } else {
        setUserActionMessage({
          type: 'error',
          message: data.error || 'Failed to create user'
        });
      }
    } catch (error) {
      setUserActionMessage({
        type: 'error',
        message: 'Network error occurred'
      });
    } finally {
      setIsCreatingUser(false);
    }

    // Clear message after 5 seconds
    setTimeout(() => setUserActionMessage(null), 5000);
  };

  // Delete user
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUserActionMessage({
          type: 'success',
          message: `User ${userEmail} deleted successfully!`
        });
        loadUsers(); // Refresh user list
      } else {
        const data = await response.json();
        setUserActionMessage({
          type: 'error',
          message: data.error || 'Failed to delete user'
        });
      }
    } catch (error) {
      setUserActionMessage({
        type: 'error',
        message: 'Network error occurred'
      });
    }

    setTimeout(() => setUserActionMessage(null), 5000);
  };

  // Toggle user active status
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        loadUsers(); // Refresh user list
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchUsers.toLowerCase()) ||
    user.name.toLowerCase().includes(searchUsers.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && isAdmin && activeTab === 'users') {
      loadUsers();
    }
  }, [isOpen, activeTab, isAdmin]);

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Settings are automatically saved to localStorage
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-6 m-4 mb-0">
              <TabsTrigger value="model" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Model
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Voice
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Privacy
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </TabsTrigger>
              )}
            </TabsList>

            <ScrollArea className="flex-1 p-6">
              {/* User Action Message */}
              <AnimatePresence>
                {userActionMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4"
                  >
                    <Alert variant={userActionMessage.type === 'success' ? 'default' : 'destructive'}>
                      {userActionMessage.type === 'success' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{userActionMessage.message}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Model Settings */}
              <TabsContent value="model" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Model Configuration</CardTitle>
                    <CardDescription>Configure the AI model behavior and parameters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Select 
                        value={modelSettings.model} 
                        onValueChange={(value) => updateModelSettings({ model: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</SelectItem>
                          <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Accurate)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="temperature">Temperature: {modelSettings.temperature}</Label>
                      <Slider
                        value={[modelSettings.temperature]}
                        onValueChange={(value) => updateModelSettings({ temperature: value[0] })}
                        max={1}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxTokens">Max Tokens</Label>
                      <Input
                        id="maxTokens"
                        type="number"
                        value={modelSettings.maxTokens}
                        onChange={(e) => updateModelSettings({ maxTokens: parseInt(e.target.value) })}
                        min={1}
                        max={8192}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="systemPrompt">System Prompt</Label>
                      <Textarea
                        id="systemPrompt"
                        value={modelSettings.systemPrompt}
                        onChange={(e) => updateModelSettings({ systemPrompt: e.target.value })}
                        rows={4}
                        placeholder="You are a helpful AI assistant..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Chat Settings */}
              <TabsContent value="chat" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Chat Preferences</CardTitle>
                    <CardDescription>Customize your chat experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="autoSave">Auto-save conversations</Label>
                        <p className="text-sm text-muted-foreground">Automatically save your chat history</p>
                      </div>
                      <Switch
                        id="autoSave"
                        checked={chatSettings.autoSave}
                        onCheckedChange={(checked) => updateChatSettings({ autoSave: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="soundEnabled">Sound notifications</Label>
                        <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
                      </div>
                      <Switch
                        id="soundEnabled"
                        checked={chatSettings.soundEnabled}
                        onCheckedChange={(checked) => updateChatSettings({ soundEnabled: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="showTimestamps">Show timestamps</Label>
                        <p className="text-sm text-muted-foreground">Display message timestamps</p>
                      </div>
                      <Switch
                        id="showTimestamps"
                        checked={chatSettings.showTimestamps}
                        onCheckedChange={(checked) => updateChatSettings({ showTimestamps: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Settings */}
              <TabsContent value="appearance" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select 
                        value={appearanceSettings.theme} 
                        onValueChange={(value: any) => {
                          updateAppearanceSettings({ theme: value });
                          setTheme(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fontSize">Font Size: {appearanceSettings.fontSize}px</Label>
                      <Slider
                        value={[appearanceSettings.fontSize]}
                        onValueChange={(value) => updateAppearanceSettings({ fontSize: value[0] })}
                        max={20}
                        min={12}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Voice Settings */}
              <TabsContent value="voice" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Voice Settings</CardTitle>
                    <CardDescription>Configure voice input and speech synthesis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="voiceEnabled">Voice input</Label>
                        <p className="text-sm text-muted-foreground">Enable voice recognition</p>
                      </div>
                      <Switch
                        id="voiceEnabled"
                        checked={voiceSettings.enabled}
                        onCheckedChange={(checked) => updateVoiceSettings({ enabled: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="autoSpeak">Auto-speak responses</Label>
                        <p className="text-sm text-muted-foreground">Automatically read AI responses</p>
                      </div>
                      <Switch
                        id="autoSpeak"
                        checked={voiceSettings.autoSpeak}
                        onCheckedChange={(checked) => updateVoiceSettings({ autoSpeak: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Privacy Settings */}
              <TabsContent value="privacy" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy & Security</CardTitle>
                    <CardDescription>Control your privacy and data settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="saveHistory">Save chat history</Label>
                        <p className="text-sm text-muted-foreground">Keep conversation history on device</p>
                      </div>
                      <Switch
                        id="saveHistory"
                        checked={privacySettings.saveHistory}
                        onCheckedChange={(checked) => updatePrivacySettings({ saveHistory: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allowAnalytics">Usage analytics</Label>
                        <p className="text-sm text-muted-foreground">Help improve the service with usage data</p>
                      </div>
                      <Switch
                        id="allowAnalytics"
                        checked={privacySettings.allowAnalytics}
                        onCheckedChange={(checked) => updatePrivacySettings({ allowAnalytics: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* User Management - Admin Only */}
              {isAdmin && (
                <TabsContent value="users" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>User Management</CardTitle>
                          <CardDescription>Manage user accounts and permissions</CardDescription>
                        </div>
                        <Button onClick={() => setShowAddUser(true)} className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          Add User
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Search Users */}
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search users by email or name..."
                            value={searchUsers}
                            onChange={(e) => setSearchUsers(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      {/* Add User Form */}
                      <AnimatePresence>
                        {showAddUser && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 p-4 border rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">Add New User</h3>
                              <Button variant="ghost" size="icon" onClick={() => setShowAddUser(false)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <form onSubmit={handleCreateUser} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="newUserEmail">Email</Label>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      id="newUserEmail"
                                      type="email"
                                      placeholder="user@example.com"
                                      value={newUser.email}
                                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                      className={`pl-10 ${userFormErrors.email ? 'border-destructive' : ''}`}
                                    />
                                  </div>
                                  {userFormErrors.email && (
                                    <p className="text-sm text-destructive">{userFormErrors.email}</p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="newUserName">Full Name</Label>
                                  <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      id="newUserName"
                                      placeholder="John Doe"
                                      value={newUser.name}
                                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                      className={`pl-10 ${userFormErrors.name ? 'border-destructive' : ''}`}
                                    />
                                  </div>
                                  {userFormErrors.name && (
                                    <p className="text-sm text-destructive">{userFormErrors.name}</p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="newUserPassword">Password</Label>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      id="newUserPassword"
                                      type={showPassword ? 'text' : 'password'}
                                      placeholder="Password (min 6 chars)"
                                      value={newUser.password}
                                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                      className={`pl-10 pr-10 ${userFormErrors.password ? 'border-destructive' : ''}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute right-0 top-0 h-10 w-10"
                                    >
                                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                  {userFormErrors.password && (
                                    <p className="text-sm text-destructive">{userFormErrors.password}</p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="newUserRole">Role</Label>
                                  <Select 
                                    value={newUser.role} 
                                    onValueChange={(value: 'admin' | 'user') => setNewUser({ ...newUser, role: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={isCreatingUser}>
                                  {isCreatingUser ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Creating...
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="w-4 h-4 mr-2" />
                                      Create User
                                    </>
                                  )}
                                </Button>
                              </div>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Users List */}
                      <div className="space-y-2">
                        {loadingUsers ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : filteredUsers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No users found</p>
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{user.name}</h4>
                                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                      {user.role === 'admin' ? (
                                        <>
                                          <Crown className="w-3 h-3 mr-1" />
                                          Admin
                                        </>
                                      ) : (
                                        <>
                                          <User className="w-3 h-3 mr-1" />
                                          User
                                        </>
                                      )}
                                    </Badge>
                                    {!user.is_active && (
                                      <Badge variant="destructive">Inactive</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Created: {new Date(user.created_at).toLocaleDateString()}
                                    {user.message_count !== undefined && ` • Messages: ${user.message_count}`}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                >
                                  {user.is_active ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </ScrollArea>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {lastSaved && (
              <p className="text-xs text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetSettingsToDefaults}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}