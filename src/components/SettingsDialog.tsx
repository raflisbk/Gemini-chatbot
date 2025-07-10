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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
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
    if (fontSize >= 18) return 'lg';
    return 'md';
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
    updatePrivacySettings,
    resetSettingsToDefaults,
  } = useAuth();

  const [activeTab, setActiveTab] = useState('model');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [tempSettings, setTempSettings] = useState({
    model: { ...modelSettings },
    chat: { ...chatSettings },
    appearance: { 
      ...appearanceSettings,
      fontSize: convertFontSizeToNumber(appearanceSettings.fontSize)
    },
    voice: { ...voiceSettings },
    privacy: { ...privacySettings }
  });

  // Track changes
  useEffect(() => {
    const hasChanges = 
      JSON.stringify(tempSettings.model) !== JSON.stringify(modelSettings) ||
      JSON.stringify(tempSettings.chat) !== JSON.stringify(chatSettings) ||
      JSON.stringify({
        ...tempSettings.appearance,
        fontSize: convertFontSizeToNumber(tempSettings.appearance.fontSize)
      }) !== JSON.stringify({
        ...appearanceSettings,
        fontSize: convertFontSizeToNumber(appearanceSettings.fontSize)
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
        fontSize: convertFontSizeToNumber(appearanceSettings.fontSize)
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

      await Promise.all([
        updateModelSettings(tempSettings.model),
        updateChatSettings(tempSettings.chat),
        updateAppearanceSettings(appearanceToSave),
        updateVoiceSettings(tempSettings.voice),
        updatePrivacySettings(tempSettings.privacy)
      ]);

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
        fontSize: convertFontSizeToNumber(appearanceSettings.fontSize)
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
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {hasUnsavedChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-8"
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
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 pb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[500px]">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="model" className="flex items-center gap-1 text-xs">
                <Bot className="h-3 w-3" />
                Model
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-1 text-xs">
                <Sliders className="h-3 w-3" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-1 text-xs">
                <Palette className="h-3 w-3" />
                Theme
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-1 text-xs">
                <Mic className="h-3 w-3" />
                Voice
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-1 text-xs">
                <Shield className="h-3 w-3" />
                Privacy
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[420px] pr-4">
              {/* Model Settings */}
              <TabsContent value="model" className="mt-0 space-y-4">
                <Card className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="model">AI Model</Label>
                      <Select
                        value={tempSettings.model.model}
                        onValueChange={(value) => updateTempSettings('model', { model: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                          <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="temperature">
                        Temperature: {tempSettings.model.temperature}
                      </Label>
                      <Slider
                        value={[tempSettings.model.temperature]}
                        onValueChange={([value]) => updateTempSettings('model', { temperature: value })}
                        max={2}
                        min={0}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxTokens">
                        Max Tokens: {tempSettings.model.maxTokens}
                      </Label>
                      <Slider
                        value={[tempSettings.model.maxTokens]}
                        onValueChange={([value]) => updateTempSettings('model', { maxTokens: value })}
                        max={8192}
                        min={256}
                        step={256}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="systemPrompt">System Prompt</Label>
                      <Textarea
                        id="systemPrompt"
                        value={tempSettings.model.systemPrompt}
                        onChange={(e) => updateTempSettings('model', { systemPrompt: e.target.value })}
                        className="mt-1"
                        rows={3}
                        placeholder="Enter system prompt..."
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
                      { key: 'autoSave', label: 'Auto-save conversations', desc: 'Automatically save chat sessions' },
                      { key: 'showTimestamps', label: 'Show timestamps', desc: 'Display message timestamps' },
                      { key: 'enableSounds', label: 'Enable sounds', desc: 'Play notification sounds' },
                      { key: 'compactMode', label: 'Compact mode', desc: 'Reduce spacing between messages' },
                      { key: 'autoScroll', label: 'Auto-scroll', desc: 'Scroll to new messages automatically' },
                      { key: 'markdownEnabled', label: 'Markdown rendering', desc: 'Render markdown in messages' }
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={key}>{label}</Label>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          id={key}
                          checked={tempSettings.chat[key as keyof typeof tempSettings.chat] as boolean}
                          onCheckedChange={(checked) => updateTempSettings('chat', { [key]: checked })}
                        />
                      </div>
                    ))}
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
                        value={tempSettings.appearance.theme}
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
                        value={tempSettings.appearance.sidebarPosition}
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
                        value={tempSettings.appearance.accentColor}
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
                      { key: 'enabled', label: 'Voice input enabled', desc: 'Enable voice recognition' },
                      { key: 'autoSpeak', label: 'Auto-speak responses', desc: 'Automatically read AI responses' },
                      { key: 'recognition', label: 'Continuous recognition', desc: 'Keep listening after each input' }
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={key}>{label}</Label>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          id={key}
                          checked={tempSettings.voice[key as keyof typeof tempSettings.voice] as boolean}
                          onCheckedChange={(checked) => updateTempSettings('voice', { [key]: checked })}
                        />
                      </div>
                    ))}

                    <div>
                      <Label htmlFor="rate">
                        Speech Rate: {tempSettings.voice.rate}
                      </Label>
                      <Slider
                        value={[tempSettings.voice.rate]}
                        onValueChange={([value]) => updateTempSettings('voice', { rate: value })}
                        max={2}
                        min={0.5}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="volume">
                        Volume: {Math.round(tempSettings.voice.volume * 100)}%
                      </Label>
                      <Slider
                        value={[tempSettings.voice.volume]}
                        onValueChange={([value]) => updateTempSettings('voice', { volume: value })}
                        max={1}
                        min={0}
                        step={0.1}
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
                          checked={tempSettings.privacy[key as keyof typeof tempSettings.privacy] as boolean}
                          onCheckedChange={(checked) => updateTempSettings('privacy', { [key]: checked })}
                        />
                      </div>
                    ))}

                    <div>
                      <Label htmlFor="autoDeleteAfter">Auto-delete after (days)</Label>
                      <Input
                        id="autoDeleteAfter"
                        type="number"
                        value={tempSettings.privacy.autoDeleteAfter}
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
          </Tabs>

          {hasUnsavedChanges && (
            <Alert className="mt-4">
              <AlertDescription>
                You have unsaved changes. Click Save to apply them.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}