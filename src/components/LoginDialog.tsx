'use client';

import React from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import LoginForm from './LoginForm';

// FIXED: Updated interface to match actual usage
export interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;        // FIXED: Made optional
  showGuestOption?: boolean;
  className?: string;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showGuestOption = true,
  className = ''
}) => {
  const handleSuccess = () => {
    onSuccess?.();  // Call onSuccess if provided
    onClose();      // Always close dialog on success
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md p-0 ${className}`}>
        <LoginForm
          onCancel={onClose}
          onSuccess={handleSuccess}
          showGuestOption={showGuestOption}
          embedded={true}
        />
      </DialogContent>
    </Dialog>
  );
};