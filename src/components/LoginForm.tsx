'use client';

import React, { useState, useCallback } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  Loader2, 
  AlertCircle,
  User
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { useAuth } from '@/context/AuthContext';

interface LoginFormProps {
  onCancel?: () => void;
  onSuccess?: () => void;
  showGuestOption?: boolean;
  embedded?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onCancel,
  onSuccess,
  showGuestOption = false,
  embedded = false
}) => {
  const { login, initializeGuest, isLoading, error } = useAuth();
  
  // FIXED: Minimal state - no complex objects, no cross-dependencies
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string>('');

  // FIXED: Completely isolated handlers - ZERO dependencies, ZERO side effects
  const onEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const onPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const onTogglePassword = useCallback(() => {
    setShowPassword(current => !current);
  }, []);

  // FIXED: Error clearing hanya manual, tidak automatic
  const clearError = useCallback(() => {
    setLocalError('');
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError('');
    
    // Validation
    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    if (!password.trim()) {
      setLocalError('Password is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setLocalError('Please enter a valid email');
      return;
    }
    if (password.length < 3) {
      setLocalError('Password must be at least 3 characters');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await login(email, password);
      if (success) {
        onSuccess?.();
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, login, onSuccess]);

  const handleGuestAccess = useCallback(async () => {
    try {
      await initializeGuest();
      onSuccess?.();
    } catch (err) {
      console.error('Guest access error:', err);
    }
  }, [initializeGuest, onSuccess]);

  // Simple computed values
  const isDisabled = isSubmitting || isLoading;
  const showError = error || localError;

  return (
    <div className="w-full max-w-sm mx-auto">
      <Card className="shadow-lg border bg-card">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold text-foreground">
            Welcome Back
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to continue to AI Chatbot
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* FIXED: Simple error display - no animations */}
          {showError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{showError}</AlertDescription>
              {localError && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearError}
                  className="mt-2 h-6 text-xs"
                >
                  Dismiss
                </Button>
              )}
            </Alert>
          )}

          {/* FIXED: Pure HTML form - no fancy components */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={onEmailChange}
                  disabled={isDisabled}
                  autoComplete="email"
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={onPasswordChange}
                  disabled={isDisabled}
                  autoComplete="current-password"
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onTogglePassword}
                  disabled={isDisabled}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isDisabled || !email || !password}
              className="w-full"
            >
              {isSubmitting || isLoading ? (
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

          {/* Guest Option */}
          {showGuestOption && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGuestAccess}
                disabled={isDisabled}
                className="w-full mt-4"
              >
                <User className="w-4 h-4 mr-2" />
                Continue as Guest
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Limited to 5 messages per session
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;