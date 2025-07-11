'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Paperclip,
  File,
  Image,
  Music,
  Video,
  FileText,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface FileItem {
  id: string;
  file: File;
  url?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface SmartFileUploadProps {
  files: FileItem[];
  onFilesChange: (files: FileItem[]) => void;
  onFileAdd: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  className?: string;
  autoCollapse?: boolean;
  showUploadArea?: boolean;
  isCompact?: boolean;
}

export function SmartFileUpload({
  files,
  onFilesChange,
  onFileAdd,
  onFileRemove,
  maxFiles = 5,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*'],
  className,
  autoCollapse = true,
  showUploadArea = true,
  isCompact = false
}: SmartFileUploadProps) {
  const [isExpanded, setIsExpanded] = useState(!autoCollapse);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-collapse when no files and not dragging
  useEffect(() => {
    if (autoCollapse && files.length === 0 && !dragActive) {
      setIsExpanded(false);
    }
  }, [autoCollapse, files.length, dragActive]);

  // Auto-expand when files are added
  useEffect(() => {
    if (files.length > 0) {
      setIsExpanded(true);
    }
  }, [files.length]);

  const getFileType = (file: File): FileItem['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getFileIcon = (type: FileItem['type']) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return File;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File too large. Maximum size is ${formatFileSize(maxFileSize)}`;
    }

    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return 'File type not supported';
    }

    return null;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const error = validateFile(file);
      
      if (error) {
        alert(`${file.name}: ${error}`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFileAdd(validFiles);
      setIsExpanded(true);
    }
  }, [files.length, maxFiles, onFileAdd]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      setIsExpanded(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const hasFiles = files.length > 0;
  const shouldShowCollapsible = hasFiles || showUploadArea;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toggle Button */}
      {shouldShowCollapsible && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="h-8 px-2"
            >
              <Paperclip className="h-3 w-3 mr-1" />
              <span className="text-xs">
                Files {hasFiles && `(${files.length})`}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3 ml-1" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-1" />
              )}
            </Button>
            
            {hasFiles && !isExpanded && (
              <div className="flex gap-1">
                {files.slice(0, 3).map((file) => {
                  const IconComponent = getFileIcon(file.type);
                  return (
                    <Badge key={file.id} variant="secondary" className="text-xs">
                      <IconComponent className="h-2 w-2 mr-1" />
                      {file.file.name.length > 10 
                        ? file.file.name.substring(0, 10) + '...' 
                        : file.file.name
                      }
                    </Badge>
                  );
                })}
                {files.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{files.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {hasFiles && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFilesChange([])}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              title="Clear all files"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {/* Upload Area */}
              {showUploadArea && (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 transition-colors",
                    dragActive 
                      ? "border-primary bg-primary/5" 
                      : "border-muted-foreground/25 hover:border-primary/50",
                    isCompact && "p-2"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className={cn("text-muted-foreground", isCompact ? "h-4 w-4" : "h-6 w-6")} />
                    <div>
                      <p className={cn("font-medium", isCompact ? "text-xs" : "text-sm")}>
                        Drop files here or{' '}
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-primary"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          browse
                        </Button>
                      </p>
                      <p className={cn("text-muted-foreground", isCompact ? "text-xs" : "text-xs")}>
                        Max {maxFiles} files, {formatFileSize(maxFileSize)} each
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Files List */}
              {hasFiles && (
                <div className="space-y-2">
                  {files.map((fileItem) => {
                    const IconComponent = getFileIcon(fileItem.type);
                    return (
                      <motion.div
                        key={fileItem.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                      >
                        <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {fileItem.file.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(fileItem.file.size)}
                            </p>
                            {fileItem.status === 'uploading' && (
                              <div className="flex items-center gap-1">
                                <Progress 
                                  value={fileItem.progress} 
                                  className="w-16 h-1" 
                                />
                                <span className="text-xs text-muted-foreground">
                                  {fileItem.progress}%
                                </span>
                              </div>
                            )}
                            {fileItem.status === 'completed' && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                            {fileItem.status === 'error' && (
                              <AlertCircle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onFileRemove(fileItem.id)}
                          className="h-6 w-6 p-0 flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Add More Button */}
              {hasFiles && files.length < maxFiles && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add More Files ({files.length}/{maxFiles})
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
}

export default SmartFileUpload;