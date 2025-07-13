'use client';

import React from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import LoginForm from './LoginForm';

export interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

  // FIXED: Handle dialog close properly
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* FIXED: Remove custom className from DialogContent to avoid conflicts */}
      {/* FIXED: Use proper padding and max-width */}
      <DialogContent className="max-w-md p-6 sm:p-8">
        {/* FIXED: Remove onCancel prop since dialog handles close automatically */}
        <LoginForm
          onSuccess={handleSuccess}
          showGuestOption={showGuestOption}
          embedded={true}
        />
      </DialogContent>
    </Dialog>
  );
};