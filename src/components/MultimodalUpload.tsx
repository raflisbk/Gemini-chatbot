import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  File, 
  Image, 
  FileText, 
  Music, 
  Video,
  Paperclip,
  Camera,
  Mic,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Eye
} from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface FileUpload {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string | null;
}

interface MultimodalUploadProps {
  onFilesChange: (files: File[]) => void;
  onFileRemove?: (fileId: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  showPreview?: boolean;
  disabled?: boolean;
  className?: string;
}

const SUPPORTED_TYPES = {
  image: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    mimeTypes: ['image/*'],
    icon: Image,
    color: 'text-blue-500'
  },
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
    mimeTypes: ['application/pdf', 'application/msword', 'text/*'],
    icon: FileText,
    color: 'text-green-500'
  },
  audio: {
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'],
    mimeTypes: ['audio/*'],
    icon: Music,
    color: 'text-purple-500'
  },
  video: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv'],
    mimeTypes: ['video/*'],
    icon: Video,
    color: 'text-red-500'
  },
  code: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.html', '.css', '.json'],
    mimeTypes: ['text/javascript', 'text/typescript', 'application/json'],
    icon: File,
    color: 'text-orange-500'
  }
};

export function MultimodalUpload({
  onFilesChange,
  onFileRemove,
  maxFiles = 10,
  maxFileSize = 50, // 50MB default
  acceptedTypes = Object.values(SUPPORTED_TYPES).flatMap(type => type.mimeTypes),
  showPreview = true,
  disabled = false,
  className = ''
}: MultimodalUploadProps) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const getFileType = (file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    for (const [type, config] of Object.entries(SUPPORTED_TYPES)) {
      if (config.extensions.includes(extension) || 
          config.mimeTypes.some(mime => file.type.startsWith(mime.replace('*', '')))) {
        return type as keyof typeof SUPPORTED_TYPES;
      }
    }
    return 'document'; // Default fallback
  };

  const generateFilePreview = async (file: File): Promise<string | undefined> => {
    if (!showPreview) return undefined;

    const fileType = getFileType(file);
    
    if (fileType === 'image') {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
    
    return undefined;
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File terlalu besar. Maksimal ${maxFileSize}MB.`;
    }

    // Check file type
    const isAccepted = acceptedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return 'Tipe file tidak didukung.';
    }

    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (uploads.length + fileArray.length > maxFiles) {
      alert(`Maksimal ${maxFiles} file dapat diupload.`);
      return;
    }

    const newUploads: FileUpload[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      const preview = await generateFilePreview(file);

      const upload: FileUpload = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
        progress: 0,
        status: error ? 'error' : 'pending',
        error
      };

      newUploads.push(upload);
    }

    setUploads(prev => [...prev, ...newUploads]);

    // Simulate upload process for valid files
    const validUploads = newUploads.filter(upload => !upload.error);
    if (validUploads.length > 0) {
      simulateUpload(validUploads);
      onFilesChange(validUploads.map(upload => upload.file));
    }
  }, [uploads.length, maxFiles, onFilesChange]);

  const simulateUpload = (uploadsToProcess: FileUpload[]) => {
    uploadsToProcess.forEach(upload => {
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { ...u, status: 'uploading' } : u
      ));

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploads(prev => prev.map(u => 
            u.id === upload.id ? { ...u, progress: 100, status: 'completed' } : u
          ));
        } else {
          setUploads(prev => prev.map(u => 
            u.id === upload.id ? { ...u, progress } : u
          ));
        }
      }, 200);
    });
  };

  const removeFile = (fileId: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== fileId));
    onFileRemove?.(fileId);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
    // Reset input
    e.target.value = '';
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
    
    const files = e.dataTransfer.files;
    if (files) {
      processFiles(files);
    }
  };

  // Audio Recording - Clean implementation with proper types
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported in this browser');
      }
      
      // Create MediaRecorder instance with proper typing
      const recorder = new window.MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      // Set up event handlers with proper typing
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { 
          type: 'audio/webm',
          lastModified: Date.now()
        });
        processFiles([file]);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (event: MediaRecorderErrorEvent) => {
        console.error('MediaRecorder error:', event.error);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Tidak dapat mengakses mikrofon. Pastikan browser mendukung fitur ini dan izin mikrofon telah diberikan.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
        setIsRecording(false);
      } else if (recorder && recorder.state === 'paused') {
        recorder.stop();
        setIsRecording(false);
      } else {
        console.warn('No active recording to stop');
        setIsRecording(false);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
    }
  };

  const renderFileIcon = (upload: FileUpload) => {
    const fileType = getFileType(upload.file);
    const config = SUPPORTED_TYPES[fileType];
    const IconComponent = config.icon;
    
    return (
      <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
        <IconComponent className="h-6 w-6" />
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        {/* Upload Area */}
        <Card 
          className={`border-2 border-dashed transition-all duration-200 ${
            isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="flex gap-1">
                  <Image className="h-6 w-6 text-blue-500" />
                  <FileText className="h-6 w-6 text-green-500" />
                  <Music className="h-6 w-6 text-purple-500" />
                  <Video className="h-6 w-6 text-red-500" />
                </div>
              </div>
              
              <div>
                <p className="text-lg font-medium">
                  {isDragOver ? 'Lepas file di sini' : 'Upload File Multimodal'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag & drop atau klik untuk memilih gambar, dokumen, audio, atau video
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Maksimal {maxFiles} file, {maxFileSize}MB per file
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      disabled={disabled}
                    >
                      <FolderOpen className="h-4 w-4 mr-1" />
                      Browse
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Pilih file dari komputer</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        isRecording ? stopRecording() : startRecording();
                      }}
                      disabled={disabled}
                      className={isRecording ? 'bg-red-500 text-white' : ''}
                    >
                      <Mic className={`h-4 w-4 mr-1 ${isRecording ? 'animate-pulse' : ''}`} />
                      {isRecording ? 'Stop' : 'Record'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rekam audio langsung</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {/* Uploaded Files List */}
        <AnimatePresence>
          {uploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                File yang Diupload ({uploads.length})
              </h4>
              
              <div className="space-y-2">
                {uploads.map((upload) => (
                  <motion.div
                    key={upload.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card className={`p-3 ${upload.status === 'error' ? 'border-destructive' : ''}`}>
                      <div className="flex items-center gap-3">
                        {/* File Icon/Preview */}
                        <div className="flex-shrink-0">
                          {upload.preview ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border">
                              <img 
                                src={upload.preview} 
                                alt={upload.file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            renderFileIcon(upload)
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {upload.file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(upload.file.size)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {getFileType(upload.file)}
                            </Badge>
                          </div>

                          {/* Progress Bar */}
                          {upload.status === 'uploading' && (
                            <Progress value={upload.progress} className="mt-2 h-1" />
                          )}

                          {/* Error Message */}
                          {upload.error && (
                            <Alert className="mt-2 p-2">
                              <AlertCircle className="h-3 w-3" />
                              <AlertDescription className="text-xs">
                                {upload.error}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-2">
                          {upload.status === 'uploading' && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          {upload.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {upload.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}

                          {/* Preview Button */}
                          {upload.preview && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => window.open(upload.preview, '_blank')}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Preview</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Remove Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                onClick={() => removeFile(upload.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Hapus file</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File Type Support Info */}
        <div className="text-xs text-muted-foreground">
          <details className="cursor-pointer">
            <summary className="hover:text-foreground">Tipe file yang didukung</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(SUPPORTED_TYPES).map(([type, config]) => (
                <div key={type} className="flex items-center gap-2">
                  <config.icon className={`h-3 w-3 ${config.color}`} />
                  <span className="capitalize">{type}:</span>
                  <span>{config.extensions.slice(0, 3).join(', ')}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </TooltipProvider>
  );
}