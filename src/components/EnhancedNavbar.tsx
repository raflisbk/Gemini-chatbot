'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Menu, 
  Home, 
  Search, 
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Upload,
  Bell,
  Settings,
  LogIn,
  Crown,
  Shield,
  User
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';

interface EnhancedNavbarProps {
  user?: any;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  notifications?: number;
  onMenuToggle?: () => void;
  onHomeClick?: () => void;
  onSettingsClick?: () => void;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  onUploadClick?: () => void;
  onVoiceToggle?: () => void;
  onSpeechToggle?: () => void;
  isVoiceActive?: boolean;
  isSpeechEnabled?: boolean;
}

export function EnhancedNavbar({
  user,
  isAuthenticated = false,
  isAdmin = false,
  notifications = 0,
  onMenuToggle,
  onHomeClick,
  onSettingsClick,
  onLoginClick,
  onLogoutClick,
  onUploadClick,
  onVoiceToggle,
  onSpeechToggle,
  isVoiceActive = false,
  isSpeechEnabled = false,
}: EnhancedNavbarProps) {

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="hover-lift"
            title="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Home Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onHomeClick}
            className="hover-lift"
            title="Go to Home"
          >
            <Home className="h-4 w-4" />
          </Button>

          {/* Logo & Title - SIMPLIFIED */}
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                AI Chatbot
              </h1>
            </div>
          </div>
        </div>

        {/* Center Section - Search (Hidden on mobile) */}
        <div className="hidden md:flex flex-1 items-center justify-center px-8">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Voice Controls */}
          {onVoiceToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onVoiceToggle}
              className={cn(
                "hover-lift",
                isVoiceActive && "text-red-500 animate-pulse"
              )}
              title={isVoiceActive ? "Stop listening" : "Start voice input"}
            >
              {isVoiceActive ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Speech Toggle */}
          {onSpeechToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSpeechToggle}
              className={cn(
                "hover-lift",
                isSpeechEnabled && "text-green-500"
              )}
              title={isSpeechEnabled ? "Disable speech" : "Enable speech"}
            >
              {isSpeechEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Upload Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onUploadClick}
            className="hover-lift"
            title="Upload files"
          >
            <Upload className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications (for authenticated users) */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="relative hover-lift"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0 flex items-center justify-center bg-red-500">
                  {notifications > 99 ? '99+' : notifications}
                </Badge>
              )}
            </Button>
          )}

          {/* User Menu or Login */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full hover-lift"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isAdmin && (
                    <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={onSettingsClick}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem onClick={onLogoutClick}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={onLoginClick}
              size="sm"
              className="flex items-center gap-2 hover-lift"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
}