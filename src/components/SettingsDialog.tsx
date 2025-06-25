'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  Palette, 
  MessageSquare, 
  Zap, 
  Info, 
  Users, 
  Shield, 
  Plus, 
  Trash2,
  Download,
  Upload as UploadIcon,
  User,
  Mail,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
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
      setAddUserError('All fields are required');
      return;
    }

    if (newUser.password.length < 6) {
      setAddUserError('Password must be at least 6 characters');
      return;
    }

    const success = UserManager.addUser(newUser.email, newUser.password, newUser.name, newUser.role);
    
    if (success) {
      setAddUserSuccess('User successfully added');
      setNewUser({ email: '', password: '', name: '', role: 'user' });
      setUsers(UserManager.getUsers());
    } else {
      setAddUserError('Email already exists or an error occurred');
    }
  };

  const handleToggleUserStatus = (userId: string, isActive: boolean) => {
    const success = isActive 
      ? UserManager.deactivateUser(userId)
      : UserManager.activateUser(userId);
    
    if (success) {
      setUsers(UserManager.getUsers());
    }
  };

  const exportData = () => {
    // Export functionality
    console.log('Exporting data...');
  };

  const importData = () => {
    // Import functionality
    console.log('Importing data...');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl border border-emerald-200/40 dark:border-emerald-800/40 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-emerald-200/30 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-blue-50/50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-blue-950/30">
              <div className="flex items-center gap-3">
                <Logo size="lg" variant="icon-only" animated={true} />
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                    Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Customize your AI Chatbot experience
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 border-r border-emerald-200/30 dark:border-emerald-800/30 bg-gradient-to-b from-emerald-50/20 via-teal-50/10 to-blue-50/20 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20">
                <div className="p-4 space-y-1">
                  {tabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? 'default' : 'ghost'}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full justify-start gap-3 transition-all duration-200 ${
                        activeTab === tab.id 
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 text-white shadow-lg' 
                          : 'hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </Button>
                  ))}
                </div>

                {/* User Info in Sidebar */}
                <div className="mt-auto p-4 border-t border-emerald-200/30 dark:border-emerald-800/30">
                  <div className="bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-blue-50/50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-blue-950/30 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                        {isAdmin ? (
                          <Crown className="h-4 w-4 text-white" />
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="mt-2 px-2 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded text-xs font-medium text-emerald-700 dark:text-emerald-300 text-center">
                        Administrator
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {activeTab === 'general' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Settings className="h-5 w-5 text-emerald-600" />
                          General Settings
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50/30 via-teal-50/20 to-blue-50/30 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30">
                            <div>
                              <h4 className="font-medium">Auto-save conversations</h4>
                              <p className="text-sm text-muted-foreground">Automatically save your chat history</p>
                            </div>
                            <Button
                              variant={settings.autoSave ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSettings(prev => ({ ...prev, autoSave: !prev.autoSave }))}
                              className={settings.autoSave ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : ''}
                            >
                              {settings.autoSave ? 'Enabled' : 'Disabled'}
                            </Button>
                          </div>

                          <div className="p-4 bg-gradient-to-r from-emerald-50/30 via-teal-50/20 to-blue-50/30 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30">
                            <h4 className="font-medium mb-2">Data Management</h4>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={exportData} className="flex items-center gap-2">
                                <Download className="h-3 w-3" />
                                Export Data
                              </Button>
                              <Button variant="outline" size="sm" onClick={importData} className="flex items-center gap-2">
                                <UploadIcon className="h-3 w-3" />
                                Import Data
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'appearance' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Palette className="h-5 w-5 text-emerald-600" />
                          Appearance
                        </h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-gradient-to-r from-emerald-50/30 via-teal-50/20 to-blue-50/30 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30">
                            <label className="text-sm font-medium block mb-2">Theme</label>
                            <select
                              value={settings.darkMode}
                              onChange={(e) => setSettings(prev => ({ ...prev, darkMode: e.target.value }))}
                              className="w-40 p-2 text-sm border border-emerald-200 dark:border-emerald-800 rounded-lg bg-background focus:border-emerald-400 dark:focus:border-emerald-600 transition-colors"
                            >
                              <option value="light">Light</option>
                              <option value="dark">Dark</option>
                              <option value="auto">Auto</option>
                            </select>
                          </div>

                          <div className="p-4 bg-gradient-to-r from-emerald-50/30 via-teal-50/20 to-blue-50/30 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30">
                            <h4 className="font-medium mb-2">Brand Colors</h4>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 rounded"></div>
                              <span className="text-sm text-muted-foreground">Emerald • Teal • Blue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'about' && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <Logo size="3xl" variant="default" animated={true} className="mx-auto mb-6" />
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent mb-2">
                          AI Chatbot v2.0
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Your intelligent conversation companion powered by advanced AI
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gradient-to-r from-emerald-50/30 via-teal-50/20 to-blue-50/30 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30">
                          <h4 className="font-medium mb-2">Version</h4>
                          <p className="text-sm text-muted-foreground">2.0.0</p>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-emerald-50/30 via-teal-50/20 to-blue-50/30 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30">
                          <h4 className="font-medium mb-2">AI Model</h4>
                          <p className="text-sm text-muted-foreground">Google Gemini Pro</p>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-emerald-50/30 via-teal-50/20 to-blue-50/30 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30">
                          <h4 className="font-medium mb-2">Built with</h4>
                          <p className="text-sm text-muted-foreground">Next.js, TypeScript, Tailwind CSS</p>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-emerald-50/30 via-teal-50/20 to-blue-50/30 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30">
                          <h4 className="font-medium mb-2">Features</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Neural network logo design</li>
                            <li>• Real-time conversations</li>
                            <li>• File upload support</li>
                            <li>• Code mode assistance</li>
                            <li>• Responsive design</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-emerald-200/30 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50/20 via-teal-50/10 to-blue-50/20 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20">
              <div className="flex items-center gap-2">
                <Logo size="sm" variant="minimal" animated={false} />
                <span className="text-xs text-muted-foreground">
                  Powered by advanced AI technology
                </span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/50">
                  Cancel
                </Button>
                <Button onClick={onClose} className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:via-teal-600 hover:to-blue-700 text-white">
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}