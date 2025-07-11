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
  CheckCircle,
  Loader2,
  Sliders,
  Mic,
  Eye
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';

import { useAuth } from '@/context/AuthContext';

interface CompactSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to convert fontSize between string and number
const convertFontSizeToNumber = (fontSize: string | number): number => {
  if (typeof fontSize === 'number') return fontSize;
  
  switch (fontSize) {
    case 'sm': return 14;
    case 'md': return 16;
    case 'lg': return 18;
    default: return 16;
  }
};

const convertFontSizeToString = (fontSize: string | number): 'sm' | 'md' | 'lg' => {
  if (typeof fontSize === 'string' && ['sm', 'md', 'lg'].includes(fontSize)) {
    return fontSize as 'sm' | 'md' | 'lg';
  }
  
  if (typeof fontSize === 'number') {
    if (fontSize <= 14) return 'sm';
    if (fontSize <= 16) return 'md';
    return 'lg';
  }
  
  return 'md';
};

export function CompactSettingsDialog({ isOpen, onClose }: CompactSettingsDialogProps) {
  const {
    modelSettings,
    chatSettings,
    appearanceSettings,
    voiceSettings,
    privacySettings,
    updateModelSettings,
    updateChatSettings,
    updateAppearanceSettings,
    updateVoiceSettings,
    updatePrivacySettings
  } = useAuth();

  const [tempSettings, setTempSettings] = useState({
    model: { ...modelSettings },
    chat: { ...chatSettings },
    appearance: { 
      ...appearanceSettings,
      fontSize: convertFontSizeToNumber(appearanceSettings?.fontSize || 16)
    },
    voice: { ...voiceSettings },
    privacy: { ...privacySettings }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = 
      JSON.stringify(tempSettings.model) !== JSON.stringify(modelSettings) ||
      JSON.stringify(tempSettings.chat) !== JSON.stringify(chatSettings) ||
      JSON.stringify(tempSettings.appearance) !== JSON.stringify({
        ...appearanceSettings,
        fontSize: convertFontSizeToNumber(appearanceSettings?.fontSize || 16)
      }) ||
      JSON.stringify(tempSettings.voice) !== JSON.stringify(voiceSettings) ||
      JSON.stringify(tempSettings.privacy) !== JSON.stringify(privacySettings);
    
    setHasUnsavedChanges(hasChanges);
  }, [tempSettings, modelSettings, chatSettings, appearanceSettings, voiceSettings, privacySettings]);

  // Update temp settings when props change
  useEffect(() => {
    setTempSettings({
      model: { ...modelSettings },
      chat: { ...chatSettings },
      appearance: { 
        ...appearanceSettings,
        fontSize: convertFontSizeToNumber(appearanceSettings?.fontSize || 16)
      },
      voice: { ...voiceSettings },
      privacy: { ...privacySettings }
    });
  }, [modelSettings, chatSettings, appearanceSettings, voiceSettings, privacySettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Apply all settings with proper type conversion for fontSize
      const appearanceToSave = {
        ...tempSettings.appearance,
        fontSize: convertFontSizeToNumber(tempSettings.appearance.fontSize)
      };

      // Save settings one by one with proper null checks
      if (updateModelSettings) {
        await updateModelSettings(tempSettings.model);
      }
      if (updateChatSettings) {
        await updateChatSettings(tempSettings.chat);
      }
      if (updateAppearanceSettings) {
        await updateAppearanceSettings(appearanceToSave);
      }
      if (updateVoiceSettings) {
        await updateVoiceSettings(tempSettings.voice);
      }
      if (updatePrivacySettings) {
        await updatePrivacySettings(tempSettings.privacy);
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTempSettings({
      model: { ...modelSettings },
      chat: { ...chatSettings },
      appearance: { 
        ...appearanceSettings,
        fontSize: convertFontSizeToNumber(appearanceSettings?.fontSize || 16)
      },
      voice: { ...voiceSettings },
      privacy: { ...privacySettings }
    });
    setHasUnsavedChanges(false);
  };

  const updateTempSettings = (category: keyof typeof tempSettings, updates: any) => {
    setTempSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], ...updates }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 pb-0 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-hidden p-4">
          <Tabs defaultValue="model" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="model" className="text-xs">
                <Bot className="h-3 w-3 mr-1" />
                Model
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs">
                <Sliders className="h-3 w-3 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="appearance" className="text-xs">
                <Palette className="h-3 w-3 mr-1" />
                Theme
              </TabsTrigger>
              <TabsTrigger value="voice" className="text-xs">
                <Volume2 className="h-3 w-3 mr-1" />
                Voice
              </TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Privacy
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              {/* Model Settings */}
              <TabsContent value="model" className="mt-0 space-y-4">
                <Card className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="model">AI Model</Label>
                      <Select
                        value={tempSettings.model.model || 'gpt-4'} // FIXED: Use 'model' instead of 'selectedModel'
                        onValueChange={(value) => updateTempSettings('model', { model: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="claude-3">Claude 3</SelectItem>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="temperature">Creativity ({tempSettings.model.temperature || 0.7})</Label>
                      <Slider
                        id="temperature"
                        min={0}
                        max={2}
                        step={0.1}
                        value={[tempSettings.model.temperature || 0.7]}
                        onValueChange={([value]) => updateTempSettings('model', { temperature: value })}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Lower = more focused, Higher = more creative
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="maxTokens">Max Response Length</Label>
                      <Input
                        id="maxTokens"
                        type="number"
                        value={tempSettings.model.maxTokens || 2048}
                        onChange={(e) => updateTempSettings('model', { maxTokens: parseInt(e.target.value) || 2048 })}
                        className="mt-1"
                        min={100}
                        max={4000}
                      />
                    </div>

                    <div>
                      <Label htmlFor="systemPrompt">System Prompt</Label>
                      <Textarea
                        id="systemPrompt"
                        placeholder="Custom instructions for the AI..."
                        value={tempSettings.model.systemPrompt || ''}
                        onChange={(e) => updateTempSettings('model', { systemPrompt: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Chat Settings */}
              <TabsContent value="chat" className="mt-0 space-y-4">
                <Card className="p-4">
                  <div className="space-y-4">
                    {[
                      { key: 'autoSave', label: 'Auto-save conversations', desc: 'Automatically save chat history' },
                      { key: 'showTimestamps', label: 'Show timestamps', desc: 'Display message timestamps' },
                      { key: 'compactMode', label: 'Compact mode', desc: 'Smaller message bubbles' },
                      { key: 'enableNotifications', label: 'Enable notifications', desc: 'Desktop notifications for responses' }
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={key}>{label}</Label>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          id={key}
                          checked={tempSettings.chat[key as keyof typeof tempSettings.chat] as boolean || false}
                          onCheckedChange={(checked) => updateTempSettings('chat', { [key]: checked })}
                        />
                      </div>
                    ))}

                    <div>
                      <Label htmlFor="messageLimit">Messages per session</Label>
                      <Input
                        id="messageLimit"
                        type="number"
                        value={tempSettings.chat.messageLimit || 50}
                        onChange={(e) => updateTempSettings('chat', { messageLimit: parseInt(e.target.value) || 50 })}
                        className="mt-1"
                        min={10}
                        max={1000}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Appearance Settings */}
              <TabsContent value="appearance" className="mt-0 space-y-4">
                <Card className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="theme">Theme</Label>
                      <Select
                        value={tempSettings.appearance.theme || 'system'}
                        onValueChange={(value: 'light' | 'dark' | 'system') => 
                          updateTempSettings('appearance', { theme: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="fontSize">Font Size</Label>
                      <Select
                        value={convertFontSizeToString(tempSettings.appearance.fontSize)}
                        onValueChange={(value: 'sm' | 'md' | 'lg') => 
                          updateTempSettings('appearance', { fontSize: convertFontSizeToNumber(value) })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">Small</SelectItem>
                          <SelectItem value="md">Medium</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sidebarPosition">Sidebar Position</Label>
                      <Select
                        value={tempSettings.appearance.sidebarPosition || 'left'}
                        onValueChange={(value: 'left' | 'right') => 
                          updateTempSettings('appearance', { sidebarPosition: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="accentColor">Accent Color</Label>
                      <Input
                        id="accentColor"
                        type="color"
                        value={tempSettings.appearance.accentColor || '#3b82f6'}
                        onChange={(e) => updateTempSettings('appearance', { accentColor: e.target.value })}
                        className="mt-1 h-10 w-20"
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Voice Settings */}
              <TabsContent value="voice" className="mt-0 space-y-4">
                <Card className="p-4">
                  <div className="space-y-4">
                    {[
                      { key: 'enabled', label: 'Enable voice input', desc: 'Use microphone for input' },
                      { key: 'autoSpeak', label: 'Auto-speak responses', desc: 'Automatically read AI responses' },
                      { key: 'recognition', label: 'Background listening', desc: 'Listen even when not focused' }
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={key}>{label}</Label>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          id={key}
                          checked={tempSettings.voice[key as keyof typeof tempSettings.voice] as boolean || false}
                          onCheckedChange={(checked) => updateTempSettings('voice', { [key]: checked })}
                        />
                      </div>
                    ))}

                    <div>
                      <Label htmlFor="speechRate">Speech Rate ({tempSettings.voice.rate || 1})</Label> {/* FIXED: Use 'rate' instead of 'speechRate' */}
                      <Slider
                        id="speechRate"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={[tempSettings.voice.rate || 1]}
                        onValueChange={([value]) => updateTempSettings('voice', { rate: value })}  
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="speechPitch">Speech Pitch ({tempSettings.voice.pitch || 1})</Label> {/* FIXED: Use 'pitch' instead of 'speechPitch' */}
                      <Slider
                        id="speechPitch"
                        min={0}
                        max={2}
                        step={0.1}
                        value={[tempSettings.voice.pitch || 1]}
                        onValueChange={([value]) => updateTempSettings('voice', { pitch: value })} 
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="volume">Volume ({tempSettings.voice.volume || 1})</Label>
                      <Slider
                        id="volume"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[tempSettings.voice.volume || 1]}
                        onValueChange={([value]) => updateTempSettings('voice', { volume: value })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Privacy Settings */}
              <TabsContent value="privacy" className="mt-0 space-y-4">
                <Card className="p-4">
                  <div className="space-y-4">
                    {[
                      { key: 'saveHistory', label: 'Save chat history', desc: 'Store conversations locally' },
                      { key: 'allowAnalytics', label: 'Allow analytics', desc: 'Help improve the service' },
                      { key: 'shareUsageData', label: 'Share usage data', desc: 'Anonymous usage statistics' },
                      { key: 'encryptMessages', label: 'Encrypt messages', desc: 'Encrypt stored messages' }
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={key}>{label}</Label>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          id={key}
                          checked={tempSettings.privacy[key as keyof typeof tempSettings.privacy] as boolean || false}
                          onCheckedChange={(checked) => updateTempSettings('privacy', { [key]: checked })}
                        />
                      </div>
                    ))}

                    <div>
                      <Label htmlFor="autoDeleteAfter">Auto-delete after (days)</Label>
                      <Input
                        id="autoDeleteAfter"
                        type="number"
                        value={tempSettings.privacy.autoDeleteAfter || 30}
                        onChange={(e) => updateTempSettings('privacy', { autoDeleteAfter: parseInt(e.target.value) || 30 })}
                        className="mt-1"
                        min={1}
                        max={365}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </ScrollArea>

            {hasUnsavedChanges && (
              <Alert className="mt-4">
                <AlertDescription>
                  You have unsaved changes. Click Save to apply them.
                </AlertDescription>
              </Alert>
            )}
          </Tabs>
        </div>

        {/* Footer with buttons positioned at bottom right */}
        <DialogFooter className="p-4 border-t border-border">
          <div className="flex justify-end gap-2 w-full">
            {hasUnsavedChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-8"
                disabled={isSaving}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              size="sm"
              className="h-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}