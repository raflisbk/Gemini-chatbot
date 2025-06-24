'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle, X, Sparkles, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

interface LoginFormProps {
  open: boolean;
  onClose: () => void;
}

export function LoginForm({ open, onClose }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { login } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (isRegisterMode) {
      if (!formData.name) {
        errors.name = 'Name is required';
      }
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setError('');
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        // Registration logic here
        console.log('Register:', formData);
        setError('Registration is currently not available. Please contact admin.');
      } else {
        const success = await login(formData.email, formData.password);
        if (success) {
          onClose();
          setFormData({ email: '', password: '', confirmPassword: '', name: '' });
          setValidationErrors({});
        } else {
          setError('Invalid email or password');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setValidationErrors({});
    setFormData({ email: '', password: '', confirmPassword: '', name: '' });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-lg flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
          className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 p-8 w-full max-w-md mx-4 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background Animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/5" />
          
          {/* Floating Particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-emerald-500/30 rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 3) * 30}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut"
              }}
            />
          ))}

          {/* Close Button */}
          <motion.button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted/50 transition-colors z-10"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-4 w-4" />
          </motion.button>

          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Logo size="lg" animate={true} />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold mt-4 bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent"
            >
              {isRegisterMode ? 'Create Account' : 'Welcome Back'}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mt-2"
            >
              {isRegisterMode 
                ? 'Join our AI-powered chat experience' 
                : 'Sign in to access your chat history'
              }
            </motion.p>
          </div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Name Field (Register only) */}
            <AnimatePresence>
              {isRegisterMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium">Full Name</label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      className={`pl-10 transition-all duration-200 ${
                        validationErrors.name ? 'border-destructive focus:border-destructive' : ''
                      }`}
                      disabled={isLoading}
                    />
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {validationErrors.name && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.name}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <div className="relative">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  className={`pl-10 transition-all duration-200 ${
                    validationErrors.email ? 'border-destructive focus:border-destructive' : ''
                  }`}
                  disabled={isLoading}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {validationErrors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive flex items-center gap-1"
                >
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.email}
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className={`pl-10 pr-10 transition-all duration-200 ${
                    validationErrors.password ? 'border-destructive focus:border-destructive' : ''
                  }`}
                  disabled={isLoading}
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/50 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </motion.button>
              </div>
              {validationErrors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive flex items-center gap-1"
                >
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.password}
                </motion.p>
              )}
            </div>

            {/* Confirm Password (Register only) */}
            <AnimatePresence>
              {isRegisterMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium">Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      className={`pl-10 transition-all duration-200 ${
                        validationErrors.confirmPassword ? 'border-destructive focus:border-destructive' : ''
                      }`}
                      disabled={isLoading}
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {validationErrors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.confirmPassword}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 rounded-xl font-medium relative overflow-hidden"
              >
                {isLoading && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {isRegisterMode ? 'Create Account' : 'Sign In'}
                    </>
                  )}
                </span>
              </Button>
            </motion.div>
          </motion.form>

          {/* Toggle Mode */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center relative z-10"
          >
            <p className="text-sm text-muted-foreground">
              {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <motion.button
              onClick={toggleMode}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-500 transition-colors mt-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isRegisterMode ? 'Sign in here' : 'Create one here'}
            </motion.button>
          </motion.div>

          {/* Guest Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 p-4 bg-muted/50 rounded-xl text-center relative z-10"
          >
            <p className="text-xs text-muted-foreground">
              🎉 <strong>Guest Access:</strong> You can use the chatbot without signing in, 
              but you'll have limited messages and no chat history.
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}