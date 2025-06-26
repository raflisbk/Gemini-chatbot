// src/components/FileUpload.tsx - Enhanced with better file type support

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, X, FileText, Image, File, AlertCircle, 
  Music, Video, FileArchive, FileCode, FileSpreadsheet,
  Paperclip, CheckCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { formatFileSize, isValidFileType } from '@/lib/utils';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

// Enhanced default accepted types with better multimodal support
const defaultAcceptedTypes = [
  // Images
  'image/*',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
  'image/webp', 'image/bmp', 'image/svg+xml',
  
  // Documents
  '.pdf', '.doc', '.docx', '.txt', '.rtf',
  '.json', '.csv', '.xlsx', '.xls', '.ppt', '.pptx',
  '.md', '.html', '.xml',
  
  // Audio
  'audio/*',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
  'audio/m4a', 'audio/aac', 'audio/webm',
  
  // Video
  'video/*',
  'video/mp4', 'video/avi', 'video/mov', 'video/webm',
  'video/mkv', 'video/quicktime',
  
  // Code files
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c',
  '.php', '.rb', '.go', '.rs', '.swift', '.kt'
];

export function FileUpload({
  onFilesSelected,
  selectedFiles,
  onRemoveFile,
  maxFiles = 10,
  maxSize = 25, // Increased default size for multimedia files
  acceptedTypes = defaultAcceptedTypes,
  className = ''
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Dynamic size limits based on file type
    const getMaxSize = (file: File): number => {
      if (file.type.startsWith('image/')) return 10; // 10MB for images
      if (file.type.startsWith('audio/')) return 25; // 25MB for audio
      if (file.type.startsWith('video/')) return 50; // 50MB for video
      return maxSize; // Default for documents and others
    };

    const fileMaxSize = getMaxSize(file);
    if (file.size > fileMaxSize * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size for ${file.type.split('/')[0]} files is ${fileMaxSize}MB.`;
    }

    if (!isValidFileType(file, acceptedTypes)) {
      return `File type "${file.type || 'unknown'}" is not supported.`;
    }

    return null;
  };

  const handleFileSelect = async (files: FileList) => {
    setError(null);
    setProcessingFiles(true);
    
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      if (selectedFiles.length + validFiles.length >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed.`);
        break;
      }

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      try {
        onFilesSelected(validFiles);
        console.log(`✅ Successfully selected ${validFiles.length} files`);
      } catch (error) {
        console.error('Error processing files:', error);
        setError('Error processing selected files. Please try again.');
      }
    }
    
    setProcessingFiles(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (type.startsWith('audio/')) {
      return <Music className="h-4 w-4 text-purple-500" />;
    } else if (type.startsWith('video/')) {
      return <Video className="h-4 w-4 text-red-500" />;
    } else if (type.includes('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return <FileText className="h-4 w-4 text-green-500" />;
    } else if (type.includes('json') || type.includes('csv') || file.name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|php|rb|go|rs|swift|kt)$/)) {
      return <FileCode className="h-4 w-4 text-orange-500" />;
    } else if (type.includes('spreadsheet') || file.name.match(/\.(xlsx|xls|csv)$/)) {
      return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
    } else if (type.includes('zip') || type.includes('rar') || type.includes('7z')) {
      return <FileArchive className="h-4 w-4 text-yellow-500" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFileTypeDescription = (file: File): string => {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('audio/')) return 'Audio';
    if (type.startsWith('video/')) return 'Video';
    if (type.includes('pdf')) return 'PDF Document';
    if (type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) return 'Word Document';
    if (type.includes('text') || file.name.endsWith('.txt')) return 'Text File';
    if (type.includes('json')) return 'JSON Data';
    if (type.includes('csv')) return 'CSV Data';
    if (file.name.match(/\.(js|ts|jsx|tsx)$/)) return 'JavaScript/TypeScript';
    if (file.name.endsWith('.py')) return 'Python Code';
    if (file.name.match(/\.(java|cpp|c)$/)) return 'Programming Code';
    
    return 'Document';
  };

  return (
    <div className={className}>
      {/* Enhanced Drop Zone */}
      <div
        className={`file-upload-zone transition-all duration-300 ${
          isDragOver ? 'dragover border-primary bg-primary/10' : ''
        } ${processingFiles ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !processingFiles && fileInputRef.current?.click()}
      >
        <motion.div
          whileHover={{ scale: processingFiles ? 1 : 1.02 }}
          whileTap={{ scale: processingFiles ? 1 : 0.98 }}
          className="flex flex-col items-center gap-3"
        >
          {processingFiles ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          
          <div className="text-center">
            <p className="text-sm font-medium">
              {processingFiles ? 'Processing files...' : 'Drop files here or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports images, documents, audio, video & code files
            </p>
            <p className="text-xs text-muted-foreground">
              Max {maxFiles} files, up to 50MB each for video
            </p>
          </div>
        </motion.div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={processingFiles}
        />
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Selected Files */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                Selected Files ({selectedFiles.length}/{maxFiles})
              </div>
              {selectedFiles.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    for (let i = selectedFiles.length - 1; i >= 0; i--) {
                      onRemoveFile(i);
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50 group hover:bg-muted/50 transition-colors"
                >
                  {getFileIcon(file)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {getFileTypeDescription(file)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* File Type Summary */}
            <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded border-l-2 border-primary/30">
              <strong>Tip:</strong> AI can analyze images, read documents, transcribe audio, and understand video content. 
              Mix different file types for comprehensive analysis!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}