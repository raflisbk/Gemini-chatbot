'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  Loader2, 
  AlertCircle,
  User,
  Crown,
  X
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

interface ValidationErrors {
  email?: string;
  password?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onCancel,
  onSuccess,
  showGuestOption = false,
  embedded = false
}) => {
  const { login, initializeGuest, isLoading, error } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 3) {
      errors.password = 'Password must be at least 3 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const success = await login(email, password);
      if (success) {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestAccess = async () => {
    try {
      await initializeGuest();
      onSuccess?.();
    } catch (error) {
      console.error('Guest access error:', error);
    }
  };

  const LoginContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-sm mx-auto"
    >
      <Card className="shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/30">
        <CardHeader className="space-y-4 pb-6">
          {/* Close Button (if onCancel provided) */}
          {onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="absolute right-4 top-4 h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to continue to AI Chatbot
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-2"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 h-10 ${validationErrors.email ? 'border-destructive' : ''}`}
                  disabled={isSubmitting || isLoading}
                  autoComplete="email"
                />
              </div>
              {validationErrors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 pr-10 h-10 ${validationErrors.password ? 'border-destructive' : ''}`}
                  disabled={isSubmitting || isLoading}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                  disabled={isSubmitting || isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {validationErrors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Guest Option */}
          {showGuestOption && (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted-foreground/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-10"
                onClick={handleGuestAccess}
                disabled={isSubmitting}
              >
                Continue as Guest
                <span className="ml-2 text-xs text-muted-foreground">(5 messages)</span>
              </Button>
            </div>
          )}

          {/* Account Benefits Info */}
          <div className="p-4 bg-muted/30 rounded-lg">
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

          {/* Footer Note */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              New accounts can only be created by administrators.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (embedded) {
    return <LoginContent />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/50 to-background">
      <LoginContent />
    </div>
  );
};

export default LoginForm;