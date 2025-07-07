'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  LogIn, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2,
  AlertTriangle,
  User,
  Crown
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

import { useAuth } from '@/context/AuthContext';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate input
      if (!email.trim() || !password.trim()) {
        throw new Error('Please fill in all fields');
      }

      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Attempt login
      await login(email, password);
      
      // Close dialog on success
      onClose();
      
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setPassword('');
      setError(null);
      onClose();
    }
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
          className="w-full max-w-md"
        >
          <Card className="border-2">
            <CardHeader className="text-center relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                disabled={isLoading}
                className="absolute right-4 top-4 h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-primary/10">
                  <LogIn className="w-6 h-6 text-primary" />
                </div>
              </div>
              
              <CardTitle className="text-xl">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to your account to access more features
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Display */}
                {error && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || !email.trim() || !password.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              {/* Additional Info */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Account Benefits:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Regular User: 25 messages per day
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-3 h-3" />
                    Admin: Unlimited messages + Settings access
                  </li>
                  <li>• Save conversation history</li>
                  <li>• Upload files and images</li>
                  <li>• Voice features</li>
                </ul>
              </div>

              {/* Demo Accounts (for development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Demo Accounts:</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Admin: admin@example.com</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmail('admin@example.com');
                          setPassword('admin123');
                        }}
                        disabled={isLoading}
                      >
                        Use
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>User: user@example.com</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmail('user@example.com');
                          setPassword('user123');
                        }}
                        disabled={isLoading}
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  New accounts can only be created by administrators.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}