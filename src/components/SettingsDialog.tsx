'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  User, 
  Palette, 
  MessageSquare, 
  Bot, 
  Volume2, 
  VolumeX,
  Moon,
  Sun,
  Monitor,
  Download,
  Upload,
  RotateCcw,
  Save,
  Check,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  Zap,
  Shield,
  Database,
  Bell
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModelSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface ChatSettings {
  autoSave: boolean;
  showTimestamps: boolean;
  enableSounds: boolean;
  compactMode: boolean;
  autoScroll: boolean;
  messageLimit: number;
  typingIndicator: boolean;
  readReceipts: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  primaryColor: string;
  borderRadius: number;
  compactUI: boolean;
  animations: boolean;
  transparency: number;
}

interface VoiceSettings {
  enabled: boolean;
  autoSpeak: boolean;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  recognition: boolean;
  language: string;
}

interface PrivacySettings {
  saveHistory: boolean;
  allowAnalytics: boolean;
  shareUsageData: boolean;
  encryptMessages: boolean;
  autoDeleteAfter: number;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Settings State
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0
  });

  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    autoSave: true,
    showTimestamps: true,
    enableSounds: false,
    compactMode: false,
    autoScroll: true,
    messageLimit: 100,
    typingIndicator: true,
    readReceipts: true
  });

  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    theme: 'system',
    fontSize: 14,
    fontFamily: 'Inter',
    primaryColor: '#10b981',
    borderRadius: 8,
    compactUI: false,
    animations: true,
    transparency: 95
  });

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    enabled: false,
    autoSpeak: false,
    voice: 'default',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    recognition: false,
    language: 'id-ID'
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    saveHistory: true,
    allowAnalytics: false,
    shareUsageData: false,
    encryptMessages: true,
    autoDeleteAfter: 30
  });

  const { user, updateUsage } = useAuth();
  const { theme, setTheme } = useTheme();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        saveSettings();
      }, 1000); // Auto-save after 1 second of inactivity

      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges]);

  // Apply theme changes immediately
  useEffect(() => {
    if (appearanceSettings.theme !== 'system') {
      setTheme(appearanceSettings.theme);
    }
  }, [appearanceSettings.theme, setTheme]);

  // Load settings from localStorage
  const loadSettings = () => {
    try {
      const savedModelSettings = localStorage.getItem('ai-chatbot-model-settings');
      const savedChatSettings = localStorage.getItem('ai-chatbot-chat-settings');
      const savedAppearanceSettings = localStorage.getItem('ai-chatbot-appearance-settings');
      const savedVoiceSettings = localStorage.getItem('ai-chatbot-voice-settings');
      const savedPrivacySettings = localStorage.getItem('ai-chatbot-privacy-settings');

      if (savedModelSettings) {
        setModelSettings(prev => ({ ...prev, ...JSON.parse(savedModelSettings) }));
      }
      if (savedChatSettings) {
        setChatSettings(prev => ({ ...prev, ...JSON.parse(savedChatSettings) }));
      }
      if (savedAppearanceSettings) {
        setAppearanceSettings(prev => ({ ...prev, ...JSON.parse(savedAppearanceSettings) }));
      }
      if (savedVoiceSettings) {
        setVoiceSettings(prev => ({ ...prev, ...JSON.parse(savedVoiceSettings) }));
      }
      if (savedPrivacySettings) {
        setPrivacySettings(prev => ({ ...prev, ...JSON.parse(savedPrivacySettings) }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // Save settings to localStorage
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('ai-chatbot-model-settings', JSON.stringify(modelSettings));
      localStorage.setItem('ai-chatbot-chat-settings', JSON.stringify(chatSettings));
      localStorage.setItem('ai-chatbot-appearance-settings', JSON.stringify(appearanceSettings));
      localStorage.setItem('ai-chatbot-voice-settings', JSON.stringify(voiceSettings));
      localStorage.setItem('ai-chatbot-privacy-settings', JSON.stringify(privacySettings));
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('settingsUpdated', {
        detail: {
          modelSettings,
          chatSettings,
          appearanceSettings,
          voiceSettings,
          privacySettings
        }
      }));
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setModelSettings({
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    });
    setChatSettings({
      autoSave: true,
      showTimestamps: true,
      enableSounds: false,
      compactMode: false,
      autoScroll: true,
      messageLimit: 100,
      typingIndicator: true,
      readReceipts: true
    });
    setAppearanceSettings({
      theme: 'system',
      fontSize: 14,
      fontFamily: 'Inter',
      primaryColor: '#10b981',
      borderRadius: 8,
      compactUI: false,
      animations: true,
      transparency: 95
    });
    setVoiceSettings({
      enabled: false,
      autoSpeak: false,
      voice: 'default',
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8,
      recognition: false,
      language: 'id-ID'
    });
    setPrivacySettings({
      saveHistory: true,
      allowAnalytics: false,
      shareUsageData: false,
      encryptMessages: true,
      autoDeleteAfter: 30
    });
    setHasUnsavedChanges(true);
  };

  // Export settings
  const exportSettings = () => {
    const settings = {
      modelSettings,
      chatSettings,
      appearanceSettings,
      voiceSettings,
      privacySettings,
      exportedAt: new Date().toISOString(),
      version: '2.0.0'
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chatbot-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import settings
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        
        if (settings.modelSettings) setModelSettings(settings.modelSettings);
        if (settings.chatSettings) setChatSettings(settings.chatSettings);
        if (settings.appearanceSettings) setAppearanceSettings(settings.appearanceSettings);
        if (settings.voiceSettings) setVoiceSettings(settings.voiceSettings);
        if (settings.privacySettings) setPrivacySettings(settings.privacySettings);
        
        setHasUnsavedChanges(true);
      } catch (error) {
        console.error('Failed to import settings:', error);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card rounded-lg border shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Settings</h2>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="ml-2">
                  {isSaving ? 'Saving...' : 'Unsaved changes'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex">
              {/* Sidebar */}
              <div className="w-64 border-r bg-muted/30">
                <TabsList className="grid w-full grid-cols-1 h-auto bg-transparent p-2">
                  <TabsTrigger value="general" className="justify-start gap-2 w-full">
                    <Settings className="w-4 h-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="model" className="justify-start gap-2 w-full">
                    <Bot className="w-4 h-4" />
                    AI Model
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="justify-start gap-2 w-full">
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="justify-start gap-2 w-full">
                    <Palette className="w-4 h-4" />
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="justify-start gap-2 w-full">
                    <Volume2 className="w-4 h-4" />
                    Voice
                  </TabsTrigger>
                  <TabsTrigger value="privacy" className="justify-start gap-2 w-full">
                    <Shield className="w-4 h-4" />
                    Privacy
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Main Content */}
              <div className="flex-1">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    {/* General Tab */}
                    <TabsContent value="general" className="m-0 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Profile Information</CardTitle>
                          <CardDescription>
                            Manage your account settings and preferences
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {user && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" value={user.email} disabled />
                              </div>
                              <div>
                                <Label htmlFor="name">Display Name</Label>
                                <Input 
                                  id="name" 
                                  placeholder="Enter your name"
                                  onChange={() => setHasUnsavedChanges(true)}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Settings Management</CardTitle>
                          <CardDescription>
                            Export, import, or reset your settings
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex gap-2">
                            <Button onClick={exportSettings} variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              Export Settings
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <label htmlFor="import-settings">
                                <Upload className="w-4 h-4 mr-2" />
                                Import Settings
                              </label>
                            </Button>
                            <input
                              id="import-settings"
                              type="file"
                              accept=".json"
                              onChange={importSettings}
                              className="hidden"
                            />
                            <Button onClick={resetToDefaults} variant="outline" size="sm">
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Reset to Defaults
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Model Tab */}
                    <TabsContent value="model" className="m-0 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>AI Model Settings</CardTitle>
                          <CardDescription>
                            Configure how the AI responds to your messages
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="model">Model</Label>
                            <Select 
                              value={modelSettings.model} 
                              onValueChange={(value: string) => { // FIXED: Add explicit type
                                setModelSettings(prev => ({ ...prev, model: value }));
                                setHasUnsavedChanges(true);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                                <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="temperature">Temperature: {modelSettings.temperature}</Label>
                            <Slider
                              value={[modelSettings.temperature]}
                              onValueChange={([value]) => {
                                setModelSettings(prev => ({ ...prev, temperature: value }));
                                setHasUnsavedChanges(true);
                              }}
                              max={2}
                              min={0}
                              step={0.1}
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Higher values make output more random, lower values more focused
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="maxTokens">Max Tokens: {modelSettings.maxTokens}</Label>
                            <Slider
                              value={[modelSettings.maxTokens]}
                              onValueChange={([value]) => {
                                setModelSettings(prev => ({ ...prev, maxTokens: value }));
                                setHasUnsavedChanges(true);
                              }}
                              max={8192}
                              min={512}
                              step={256}
                              className="mt-2"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Chat Tab */}
                    <TabsContent value="chat" className="m-0 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Chat Behavior</CardTitle>
                          <CardDescription>
                            Customize how the chat interface behaves
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="autoSave">Auto-save conversations</Label>
                              <p className="text-xs text-muted-foreground">
                                Automatically save your chat history
                              </p>
                            </div>
                            <Switch
                              id="autoSave"
                              checked={chatSettings.autoSave}
                              onCheckedChange={(checked) => {
                                setChatSettings(prev => ({ ...prev, autoSave: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="showTimestamps">Show timestamps</Label>
                              <p className="text-xs text-muted-foreground">
                                Display message timestamps
                              </p>
                            </div>
                            <Switch
                              id="showTimestamps"
                              checked={chatSettings.showTimestamps}
                              onCheckedChange={(checked) => {
                                setChatSettings(prev => ({ ...prev, showTimestamps: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="enableSounds">Enable notification sounds</Label>
                              <p className="text-xs text-muted-foreground">
                                Play sounds for new messages
                              </p>
                            </div>
                            <Switch
                              id="enableSounds"
                              checked={chatSettings.enableSounds}
                              onCheckedChange={(checked) => {
                                setChatSettings(prev => ({ ...prev, enableSounds: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="compactMode">Compact mode</Label>
                              <p className="text-xs text-muted-foreground">
                                Use compact message layout
                              </p>
                            </div>
                            <Switch
                              id="compactMode"
                              checked={chatSettings.compactMode}
                              onCheckedChange={(checked) => {
                                setChatSettings(prev => ({ ...prev, compactMode: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="autoScroll">Auto-scroll to new messages</Label>
                              <p className="text-xs text-muted-foreground">
                                Automatically scroll to latest message
                              </p>
                            </div>
                            <Switch
                              id="autoScroll"
                              checked={chatSettings.autoScroll}
                              onCheckedChange={(checked) => {
                                setChatSettings(prev => ({ ...prev, autoScroll: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Appearance Tab */}
                    <TabsContent value="appearance" className="m-0 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Theme & Visual Settings</CardTitle>
                          <CardDescription>
                            Customize the look and feel of the interface
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="theme">Theme</Label>
                            <Select 
                              value={appearanceSettings.theme} 
                              onValueChange={(value: 'light' | 'dark' | 'system') => {
                                setAppearanceSettings(prev => ({ ...prev, theme: value }));
                                setHasUnsavedChanges(true);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="light">
                                  <div className="flex items-center gap-2">
                                    <Sun className="w-4 h-4" />
                                    Light
                                  </div>
                                </SelectItem>
                                <SelectItem value="dark">
                                  <div className="flex items-center gap-2">
                                    <Moon className="w-4 h-4" />
                                    Dark
                                  </div>
                                </SelectItem>
                                <SelectItem value="system">
                                  <div className="flex items-center gap-2">
                                    <Monitor className="w-4 h-4" />
                                    System
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="fontSize">Font Size: {appearanceSettings.fontSize}px</Label>
                            <Slider
                              value={[appearanceSettings.fontSize]}
                              onValueChange={([value]) => {
                                setAppearanceSettings(prev => ({ ...prev, fontSize: value }));
                                setHasUnsavedChanges(true);
                              }}
                              max={20}
                              min={12}
                              step={1}
                              className="mt-2"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="animations">Enable animations</Label>
                              <p className="text-xs text-muted-foreground">
                                Show smooth transitions and effects
                              </p>
                            </div>
                            <Switch
                              id="animations"
                              checked={appearanceSettings.animations}
                              onCheckedChange={(checked) => {
                                setAppearanceSettings(prev => ({ ...prev, animations: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Voice Tab */}
                    <TabsContent value="voice" className="m-0 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Voice & Speech Settings</CardTitle>
                          <CardDescription>
                            Configure text-to-speech and voice recognition
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="voiceEnabled">Enable text-to-speech</Label>
                              <p className="text-xs text-muted-foreground">
                                Read AI responses aloud
                              </p>
                            </div>
                            <Switch
                              id="voiceEnabled"
                              checked={voiceSettings.enabled}
                              onCheckedChange={(checked) => {
                                setVoiceSettings(prev => ({ ...prev, enabled: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="voiceRecognition">Enable voice input</Label>
                              <p className="text-xs text-muted-foreground">
                                Use speech-to-text for input
                              </p>
                            </div>
                            <Switch
                              id="voiceRecognition"
                              checked={voiceSettings.recognition}
                              onCheckedChange={(checked) => {
                                setVoiceSettings(prev => ({ ...prev, recognition: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>

                          <div>
                            <Label htmlFor="voiceRate">Speech Rate: {voiceSettings.rate}</Label>
                            <Slider
                              value={[voiceSettings.rate]}
                              onValueChange={([value]) => {
                                setVoiceSettings(prev => ({ ...prev, rate: value }));
                                setHasUnsavedChanges(true);
                              }}
                              max={2}
                              min={0.5}
                              step={0.1}
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label htmlFor="voiceVolume">Volume: {Math.round(voiceSettings.volume * 100)}%</Label>
                            <Slider
                              value={[voiceSettings.volume]}
                              onValueChange={([value]) => {
                                setVoiceSettings(prev => ({ ...prev, volume: value }));
                                setHasUnsavedChanges(true);
                              }}
                              max={1}
                              min={0}
                              step={0.1}
                              className="mt-2"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Privacy Tab */}
                    <TabsContent value="privacy" className="m-0 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Privacy & Data Settings</CardTitle>
                          <CardDescription>
                            Control how your data is handled and stored
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="saveHistory">Save chat history</Label>
                              <p className="text-xs text-muted-foreground">
                                Store conversations for future reference
                              </p>
                            </div>
                            <Switch
                              id="saveHistory"
                              checked={privacySettings.saveHistory}
                              onCheckedChange={(checked) => {
                                setPrivacySettings(prev => ({ ...prev, saveHistory: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="encryptMessages">Encrypt messages</Label>
                              <p className="text-xs text-muted-foreground">
                                Encrypt stored messages for security
                              </p>
                            </div>
                            <Switch
                              id="encryptMessages"
                              checked={privacySettings.encryptMessages}
                              onCheckedChange={(checked) => {
                                setPrivacySettings(prev => ({ ...prev, encryptMessages: checked }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>

                          <div>
                            <Label htmlFor="autoDelete">Auto-delete after (days): {privacySettings.autoDeleteAfter}</Label>
                            <Slider
                              value={[privacySettings.autoDeleteAfter]}
                              onValueChange={([value]) => {
                                setPrivacySettings(prev => ({ ...prev, autoDeleteAfter: value }));
                                setHasUnsavedChanges(true);
                              }}
                              max={365}
                              min={1}
                              step={1}
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Automatically delete conversations after this many days
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </div>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isSaving && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Settings className="w-4 h-4" />
                  </motion.div>
                  <span>Saving settings...</span>
                </>
              )}
              {!isSaving && lastSaved && (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Settings saved automatically</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={saveSettings} disabled={!hasUnsavedChanges || isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Now'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}