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
import type { MediaRecorderErrorEvent, MediaRecorderOptions } from '@/types/media-recorder';

// Types untuk file upload
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
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const MAX_FILES_PER_UPLOAD = parseInt(process.env.MAX_FILES_PER_UPLOAD || '5');
const MAX_TOTAL_UPLOAD_SIZE = parseInt(process.env.MAX_TOTAL_UPLOAD_SIZE || '52428800'); // 50MB

export default function MultimodalUpload({
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
    
    const totalSize = uploadedFiles.reduce((sum, f) => sum + f.file.size, 0) + file.size;
    if (totalSize > MAX_TOTAL_UPLOAD_SIZE) {
      return `Total ukuran file melebihi batas ${formatFileSize(MAX_TOTAL_UPLOAD_SIZE)}`;
    }
    
    if (uploadedFiles.length >= maxFiles) {
      return `Maksimal ${maxFiles} file dapat diupload`;
    }
    
    return null;
  };

  // Upload function with proper error handling
  const uploadFile = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // File handling
  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }
      
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFile: UploadedFile = {
        id: fileId,
        file,
        url: URL.createObjectURL(file),
        type: getFileType(file),
        progress: 0,
        status: 'uploading'
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
      
      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
          ));
        }, 100);
        
        await uploadFile(file);
        
        clearInterval(progressInterval);
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f
        ));
        
        toast.success(`${file.name} berhasil diupload`);
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'error' } : f
        ));
        toast.error(`Gagal upload ${file.name}: ${error}`);
      }
    }
    
    const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
    onFilesUploaded(completedFiles);
  };

  // Audio recording functions
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
      
      // Fix untuk error TypeScript - gunakan MediaRecorderOptions yang benar
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      // Check if browser supports the mime type
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          delete options.mimeType; // Fallback to default
        }
      }
      
      // Fix untuk Error 7009 dan 2554 - constructor yang benar
      const mediaRecorder = new MediaRecorder(stream, options);
      audioRecorderRef.current = mediaRecorder;
      
      // Fix untuk Error 2552 - gunakan interface yang benar
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Event error dengan type yang benar
      mediaRecorder.onerror = (event: MediaRecorderErrorEvent) => {
        console.error('MediaRecorder error:', event.error);
        toast.error('Error during recording: ' + event.error.message);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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
      toast.error('Gagal memulai rekaman audio: ' + error);
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

  // Video recording functions
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
      
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus'
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          delete options.mimeType;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      videoRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onerror = (event: MediaRecorderErrorEvent) => {
        console.error('MediaRecorder error:', event.error);
        toast.error('Error during video recording: ' + event.error.message);
      };
      
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
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
      toast.error('Gagal memulai rekaman video: ' + error);
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

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  // File removal
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      onFilesUploaded(updated.filter(f => f.status === 'completed'));
      return updated;
    });
  };

  // Render file preview
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