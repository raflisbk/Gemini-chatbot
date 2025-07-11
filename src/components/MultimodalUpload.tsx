'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Upload, 
  X, 
  Play, 
  Pause, 
  Square,
  FileImage,
  FileText,
  FileVideo
} from 'lucide-react';
import { cn } from '@/lib/utils';

// FIXED: Local types untuk menghindari import issues
type LocalRecordingState = 'inactive' | 'recording' | 'paused';

// FIXED: Simple types without conflicts
interface UploadedFile {
  id: string;
  file: File;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

interface MultimodalUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onAudioRecorded: (audioBlob: Blob) => void;
  onVideoRecorded: (videoBlob: Blob) => void;
  maxFileSize?: number;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

// Constants dari environment variables
const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'); // 10MB default
const MAX_FILES_PER_UPLOAD = parseInt(process.env.NEXT_PUBLIC_MAX_FILES_PER_UPLOAD || '5');
const MAX_TOTAL_UPLOAD_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_TOTAL_UPLOAD_SIZE || '52428800'); // 50MB

// FIXED: Default export component
function MultimodalUpload({
  onFilesUploaded,
  onAudioRecorded,
  onVideoRecorded,
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = MAX_FILES_PER_UPLOAD,
  acceptedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*'],
  className
}: MultimodalUploadProps) {
  // States
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Utility functions
  const getFileType = (file: File): UploadedFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // File validation
  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File terlalu besar. Maksimal ${formatFileSize(maxFileSize)}`;
    }

    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return 'Tipe file tidak didukung';
    }

    return null;
  };

  // File handling
  const handleFiles = useCallback(async (files: FileList) => {
    if (uploadedFiles.length + files.length > maxFiles) {
      toast.error(`Maksimal ${maxFiles} file yang bisa diunggah`);
      return;
    }

    const validFiles: File[] = [];
    let totalSize = uploadedFiles.reduce((sum, f) => sum + f.file.size, 0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateFile(file);
      
      if (validation) {
        toast.error(`${file.name}: ${validation}`);
        continue;
      }

      if (totalSize + file.size > MAX_TOTAL_UPLOAD_SIZE) {
        toast.error('Total ukuran file melebihi batas maksimal');
        break;
      }

      validFiles.push(file);
      totalSize += file.size;
    }

    // Process valid files
    const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      type: getFileType(file),
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    // Simulate upload progress
    newUploadedFiles.forEach((uploadedFile) => {
      simulateUpload(uploadedFile.id);
    });

  }, [uploadedFiles, maxFiles, maxFileSize]);

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, progress: 100, status: 'completed' }
              : f
          )
        );
        clearInterval(interval);
      } else {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, progress }
              : f
          )
        );
      }
    }, 100);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // FIXED: Audio recording functions dengan simple types
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // FIXED: Simple MediaRecorder options
      const options: any = {};
      
      // Try to set the best supported mime type
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options.mimeType = type;
          break;
        }
      }
      
      // FIXED: Simple constructor
      const mediaRecorder = new MediaRecorder(stream, options);
      audioRecorderRef.current = mediaRecorder;
      
      // FIXED: Simple event handlers
      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // FIXED: Simple error handler
      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        toast.error('Error during recording');
      };
      
      mediaRecorder.onstop = () => {
        const mimeType = options.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        onAudioRecorded(audioBlob);
        cleanup();
      };
      
      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecordingAudio(true);
      setRecordingTime(0);
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('Mulai merekam audio');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      toast.error('Gagal memulai rekaman audio');
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
      audioRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
    setRecordingTime(0);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  // FIXED: Video recording functions dengan simple types
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      streamRef.current = stream;
      videoChunksRef.current = [];
      
      // FIXED: Simple options untuk video
      const options: any = {};
      
      const supportedTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options.mimeType = type;
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      videoRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        toast.error('Error during video recording');
      };
      
      mediaRecorder.onstop = () => {
        const mimeType = options.mimeType || 'video/webm';
        const videoBlob = new Blob(videoChunksRef.current, { type: mimeType });
        onVideoRecorded(videoBlob);
        cleanup();
      };
      
      mediaRecorder.start(1000);
      setIsRecordingVideo(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('Mulai merekam video');
    } catch (error) {
      console.error('Error starting video recording:', error);
      toast.error('Gagal memulai rekaman video');
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && videoRecorderRef.current.state === 'recording') {
      videoRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
    setRecordingTime(0);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  // Notify parent when files change
  useEffect(() => {
    const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
    if (completedFiles.length > 0) {
      onFilesUploaded(completedFiles);
    }
  }, [uploadedFiles, onFilesUploaded]);

  // File preview component
  const renderFilePreview = (file: UploadedFile) => {
    const IconComponent = {
      image: FileImage,
      video: FileVideo,
      audio: Mic,
      document: FileText
    }[file.type];

    return (
      <div key={file.id} className="relative border rounded-lg p-3 bg-background">
        <div className="flex items-center gap-3">
          <IconComponent className="h-8 w-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.file.size)}
            </p>
            {file.status === 'uploading' && (
              <Progress value={file.progress} className="mt-2 h-2" />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeFile(file.id)}
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {file.status === 'error' && (
          <p className="text-xs text-destructive mt-1">Upload gagal</p>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          "hover:border-primary/50 hover:bg-primary/5"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              Drag dan drop file atau{' '}
              <Button
                variant="link"
                className="h-auto p-0 text-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                pilih file
              </Button>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maks {maxFiles} file, {formatFileSize(maxFileSize)} per file
            </p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Recording Controls */}
      <div className="flex gap-2">
        <Button
          variant={isRecordingAudio ? "destructive" : "outline"}
          size="sm"
          onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
          disabled={isRecordingVideo}
        >
          {isRecordingAudio ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {isRecordingAudio ? 'Stop Audio' : 'Record Audio'}
        </Button>
        
        <Button
          variant={isRecordingVideo ? "destructive" : "outline"}
          size="sm"
          onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
          disabled={isRecordingAudio}
        >
          {isRecordingVideo ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {isRecordingVideo ? 'Stop Video' : 'Record Video'}
        </Button>
        
        {(isRecordingAudio || isRecordingVideo) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Files ({uploadedFiles.length})</h4>
          <div className="space-y-2">
            {uploadedFiles.map(renderFilePreview)}
          </div>
        </div>
      )}
    </div>
  );
}

// FIXED: Default export
export default MultimodalUpload;