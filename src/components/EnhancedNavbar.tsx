// src/components/EnhancedNavbar.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Menu,
  Settings,
  Upload,
  User,
  LogIn,
  LogOut,
  MessageSquare,
  Bot,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Zap,
  Crown,
  Shield,
  Bell,
  Search,
  ChevronDown,
  HelpCircle
} from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface EnhancedNavbarProps {
  onMenuToggle?: () => void;
  onHomeClick?: () => void;
  onUploadClick?: () => void;
  onSettingsClick?: () => void;
  onVoiceToggle?: () => void;
  onSpeechToggle?: () => void;
  isVoiceActive?: boolean;
  isSpeechEnabled?: boolean;
  showSidebar?: boolean;
  className?: string;
}

export function EnhancedNavbar({
  onMenuToggle,
  onHomeClick,
  onUploadClick,
  onSettingsClick,
  onVoiceToggle,
  onSpeechToggle,
  isVoiceActive = false,
  isSpeechEnabled = false,
  showSidebar = false,
  className
}: EnhancedNavbarProps) {
  const { user, isAuthenticated, isLoading, isAdmin, logout, login } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [notifications, setNotifications] = useState(3); // Example notification count

  const handleLoginClick = () => {
    if (isAuthenticated) {
      logout();
    } else {
      setShowLoginForm(true);
    }
  };

  return (
    <>
      <nav className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}>
        <div className="container flex h-16 items-center">
          {/* Left Section */}
          <div className="flex items-center gap-4">
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

            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  AI Chatbot Indonesia
                </h1>
                <p className="text-xs text-muted-foreground">
                  Powered by Gemini AI
                </p>
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
                  
                  {/* Quick Stats */}
                  <div className="px-2 py-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Messages this month</span>
                      <Badge variant="outline" className="text-xs">
                        45/100
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={onHomeClick}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Home</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={onSettingsClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>My Conversations</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help & Support</span>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={handleLoginClick}
                variant="default"
                size="sm"
                className="gap-2 enhanced-button"
                disabled={isLoading}
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Login Form Modal */}
      <AnimatePresence>
        {showLoginForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card border border-border rounded-lg p-6 w-full max-w-md login-container"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Welcome Back</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLoginForm(false)}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              <SimpleLoginForm 
                onSuccess={() => setShowLoginForm(false)}
                onCancel={() => setShowLoginForm(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Simple Login Form Component
interface SimpleLoginFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function SimpleLoginForm({ onSuccess, onCancel }: SimpleLoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and redirect
        localStorage.setItem('auth_token', data.token);
        window.location.reload(); // Simple reload to update auth state
        onSuccess();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setFormData({
      email: 'demo@example.com',
      password: 'demo123'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Enter your email"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Enter your password"
          required
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 enhanced-button"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            />
          ) : (
            'Login'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>

      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDemoLogin}
          className="text-xs demo-account"
        >
          Use Demo Account
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Don't have an account?{' '}
        <button type="button" className="text-primary hover:underline">
          Sign up
        </button>
      </div>
    </form>
  );
}