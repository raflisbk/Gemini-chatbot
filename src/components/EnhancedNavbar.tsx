'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Menu, 
  Plus, 
  Settings, 
  LogIn, 
  Home,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  Crown,
  Shield
} from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import Logo from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/context/AuthContext';

export interface EnhancedNavbarProps {
  onHomeClick?: () => void;
  onSettingsClick?: () => void;
  onLoginClick?: () => void;
  onNewChat?: () => void;
  onVoiceToggle?: () => void;
  onSpeechToggle?: () => void;
  isVoiceActive?: boolean;
  isSpeechEnabled?: boolean;
  className?: string;
}

export const EnhancedNavbar: React.FC<EnhancedNavbarProps> = ({
  onHomeClick,
  onSettingsClick,
  onLoginClick,
  onNewChat,
  onVoiceToggle,
  onSpeechToggle,
  isVoiceActive = false,
  isSpeechEnabled = false,
  className = ''
}) => {
  const { user, isGuest, isAdmin } = useAuth();

  // ========================================
  // FIXED: Settings access control logic
  // ========================================
  const canAccessSettings = user && !isGuest; // Only authenticated non-guest users can access settings

  return (
    <motion.nav
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm ${className}`}
    >
      {/* Left Side - Logo & Navigation */}
      <div className="flex items-center gap-4">
        {/* Menu/Home Button */}
        {onHomeClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onHomeClick}
            className="md:hidden"
            title="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {/* Logo */}
        <Logo 
          size="md" 
          variant="gradient"
          showText={true}
          className="hidden sm:flex"
        />
        
        {/* Mobile Logo */}
        <Logo 
          size="sm" 
          variant="gradient"
          showText={false}
          className="sm:hidden"
        />

        {/* New Chat Button */}
        {onNewChat && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="hidden md:flex items-center gap-2"
          >
            <Plus className="h-3 w-3" />
            New Chat
          </Button>
        )}
      </div>

      {/* Center - Voice Controls (Optional) */}
      {(onVoiceToggle || onSpeechToggle) && (
        <div className="flex items-center gap-2">
          {/* Voice Input Toggle */}
          {onVoiceToggle && (
            <Button
              variant={isVoiceActive ? "default" : "ghost"}
              size="sm"
              onClick={onVoiceToggle}
              className="hidden sm:flex items-center gap-2"
              title={isVoiceActive ? "Stop listening" : "Start voice input"}
            >
              {isVoiceActive ? (
                <MicOff className="h-3 w-3" />
              ) : (
                <Mic className="h-3 w-3" />
              )}
              <span className="text-xs">
                {isVoiceActive ? "Listening" : "Voice"}
              </span>
            </Button>
          )}

          {/* Speech Output Toggle */}
          {onSpeechToggle && (
            <Button
              variant={isSpeechEnabled ? "default" : "ghost"}
              size="sm"
              onClick={onSpeechToggle}
              className="hidden sm:flex items-center gap-2"
              title={isSpeechEnabled ? "Disable speech" : "Enable speech"}
            >
              {isSpeechEnabled ? (
                <Volume2 className="h-3 w-3" />
              ) : (
                <VolumeX className="h-3 w-3" />
              )}
              <span className="text-xs">
                {isSpeechEnabled ? "Speech On" : "Speech Off"}
              </span>
            </Button>
          )}
        </div>
      )}

      {/* Right Side - User & Controls */}
      <div className="flex items-center gap-2">
        {/* User Status */}
        {user ? (
          <div className="flex items-center gap-2">
            {/* User Badge */}
            <Badge 
              variant={isAdmin ? "default" : isGuest ? "secondary" : "outline"}
              className="hidden sm:flex items-center gap-1"
            >
              {isAdmin ? (
                <Crown className="h-3 w-3" />
              ) : isGuest ? (
                <User className="h-3 w-3" />
              ) : (
                <Shield className="h-3 w-3" />
              )}
              <span className="text-xs">
                {isAdmin ? "Admin" : isGuest ? "Guest" : "User"}
              </span>
            </Badge>

            {/* Mobile User Icon */}
            <div className="sm:hidden">
              {isAdmin ? (
                <Crown className="h-4 w-4 text-primary" />
              ) : isGuest ? (
                <User className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Shield className="h-4 w-4 text-primary" />
              )}
            </div>
          </div>
        ) : (
          /* Login Button */
          onLoginClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoginClick}
              className="flex items-center gap-2"
            >
              <LogIn className="h-3 w-3" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          )
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* FIXED: Settings Button - Only show for authenticated non-guest users */}
        {onSettingsClick && canAccessSettings && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            title="Open settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}

        {/* FIXED: Guest notification - Optional: Show why settings is not available */}
        {isGuest && onSettingsClick && (
          <div className="hidden sm:block">
            <Button
              variant="ghost"
              size="icon"
              disabled
              title="Settings not available for guest users. Please sign in to access settings."
              className="opacity-50 cursor-not-allowed"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.nav>
  );
};