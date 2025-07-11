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
            {/* FIXED: Icon with consistent color palette */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <LogIn className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              {/* FIXED: Title with consistent color palette */}
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
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

            {/* FIXED: Submit Button with consistent color palette */}
            <Button
              type="submit"
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isSubmitting || isLoading}
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

          {/* FIXED: Guest Access Button with consistent styling */}
          {showGuestOption && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-3">
                or continue without an account
              </p>
              <Button
                variant="outline"
                onClick={handleGuestAccess}
                className="w-full h-10 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                disabled={isLoading}
              >
                <User className="w-4 h-4 mr-2" />
                Continue as Guest
              </Button>
            </div>
          )}

          {/* FIXED: Account Benefits Info with consistent styling */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-medium mb-2 text-foreground">Account Benefits:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <User className="w-3 h-3 text-primary" />
                Regular User: 25 messages per day
              </li>
              <li className="flex items-center gap-2">
                <Crown className="w-3 h-3 text-primary" />
                Admin: Unlimited messages + Settings access
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 flex items-center justify-center">•</span>
                Save conversation history
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 flex items-center justify-center">•</span>
                Upload files and images
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 flex items-center justify-center">•</span>
                Voice features
              </li>
            </ul>
          </div>

          {/* Footer Note */}
          <div className="mt-4 text-center">
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <LoginContent />
    </div>
  );
};

export default LoginForm;