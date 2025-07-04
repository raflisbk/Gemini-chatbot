// src/lib/storage.ts - FIXED VERSION
import { put, del } from '@vercel/blob';
import { supabaseAdmin, createFileAttachment } from './supabase';

// ========================================
// INTERFACES
// ========================================

export interface UploadResult {
  success: boolean;
  file?: {
    id: string;
    name: string;
    url: string;
    mimeType: string;
    size: number;
    base64?: string;
  };
  error?: string;
}

export interface StorageQuotaInfo {
  isOverQuota: boolean;
  currentUsage: number;
  totalSize: number;
  limit: number;
  remainingStorage: number;
}

// ========================================
// CONSTANTS
// ========================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
  // Video
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  // Documents
  'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
  'application/json', 'application/xml', 'text/xml',
  // Office documents
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

// ========================================
// HELPER FUNCTIONS
// ========================================

function generateSafeFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
  
  return `${timestamp}_${randomString}_${baseName}${extension ? '.' + extension : ''}`;
}

async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix (data:image/jpeg;base64,)
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: `File type '${file.type}' is not supported` 
    };
  }

  // Check file name
  if (!file.name || file.name.length < 1) {
    return { 
      isValid: false, 
      error: 'File name is required' 
    };
  }

  return { isValid: true };
}

// ========================================
// STORAGE QUOTA MANAGEMENT
// ========================================

export async function checkStorageQuota(userId: string, fileSize: number): Promise<StorageQuotaInfo> {
  try {
    // Get user's current storage usage
    const { data: usage, error } = await supabaseAdmin
      .from('usage_tracking')
      .select('storage_used')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    const currentUsage = usage?.storage_used || 0;
    const totalAfterUpload = currentUsage + fileSize;
    
    // Storage limits (in bytes)
    const STORAGE_LIMITS = {
      admin: 5 * 1024 * 1024 * 1024, // 5GB
      user: 1 * 1024 * 1024 * 1024,  // 1GB
      guest: 50 * 1024 * 1024        // 50MB
    };

    // Get user role
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      throw userError;
    }

    const userRole = user?.role as keyof typeof STORAGE_LIMITS || 'user';
    const limit = STORAGE_LIMITS[userRole] || STORAGE_LIMITS.user;

    return {
      isOverQuota: totalAfterUpload > limit,
      currentUsage,
      totalSize: totalAfterUpload,
      limit,
      remainingStorage: limit - currentUsage
    };
  } catch (error) {
    console.error('Storage quota check error:', error);
    return { 
      isOverQuota: false, 
      currentUsage: 0, 
      totalSize: fileSize, 
      limit: 1024 * 1024 * 1024, 
      remainingStorage: 1024 * 1024 * 1024 
    };
  }
}

async function updateStorageUsage(userId: string, fileSize: number): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create usage record
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      // Update existing record
      await supabaseAdmin
        .from('usage_tracking')
        .update({
          storage_used: (existing.storage_used || 0) + fileSize,
          file_uploads: (existing.file_uploads || 0) + 1
        })
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabaseAdmin
        .from('usage_tracking')
        .insert({
          user_id: userId,
          date: today,
          storage_used: fileSize,
          file_uploads: 1,
          message_count: 0,
          tokens_used: 0
        });
    }
  } catch (error) {
    console.error('Storage usage update error:', error);
    throw error;
  }
}

// ========================================
// MAIN UPLOAD FUNCTIONS
// ========================================

export async function uploadFile(
  file: File, 
  userId: string, 
  messageId?: string
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Check storage quota
    const quotaCheck = await checkStorageQuota(userId, file.size);
    if (quotaCheck.isOverQuota) {
      return { 
        success: false, 
        error: `Storage quota exceeded. ${(quotaCheck.remainingStorage / 1024 / 1024).toFixed(2)}MB remaining.`
      };
    }

    // Generate safe file name
    const safeFileName = generateSafeFileName(file.name);

    // Convert to base64 for AI processing
    const base64Data = await convertFileToBase64(file);

    // Upload to Vercel Blob
    const { url } = await put(safeFileName, file, {
      access: 'public',
    });

    // Save file metadata to database
    const fileRecord = await createFileAttachment({
      message_id: messageId,
      user_id: userId,
      filename: safeFileName,
      original_name: file.name,
      file_path: url,
      blob_url: url,
      mime_type: file.type,
      file_size: file.size,
      processing_status: 'completed',
      ai_analysis: {}
    });

    if (!fileRecord) {
      return { success: false, error: 'Failed to save file metadata' };
    }

    // Update storage usage
    await updateStorageUsage(userId, file.size);

    return {
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.original_name,
        url: fileRecord.blob_url || url,
        mimeType: fileRecord.mime_type,
        size: fileRecord.file_size,
        base64: base64Data
      }
    };

  } catch (error) {
    console.error('File upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

export async function uploadFiles(
  files: File[], 
  userId: string, 
  messageId?: string
): Promise<{
  successes: UploadResult[];
  failures: UploadResult[];
}> {
  const successes: UploadResult[] = [];
  const failures: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadFile(file, userId, messageId);
    if (result.success) {
      successes.push(result);
    } else {
      failures.push(result);
    }
  }

  return { successes, failures };
}

// ========================================
// FILE MANAGEMENT FUNCTIONS
// ========================================

export async function deleteFile(fileId: string, userId: string): Promise<boolean> {
  try {
    // Get file info from database
    const { data: fileRecord, error: fetchError } = await supabaseAdmin
      .from('file_attachments')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !fileRecord) {
      console.error('File not found:', fetchError);
      return false;
    }

    // Delete from Vercel Blob
    if (fileRecord.blob_url) {
      try {
        await del(fileRecord.blob_url);
      } catch (blobError) {
        console.error('Error deleting from blob storage:', blobError);
        // Continue with database deletion even if blob deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('file_attachments')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      console.error('Error deleting file record:', deleteError);
      return false;
    }

    // Update storage usage
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await supabaseAdmin
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (usage) {
        await supabaseAdmin
          .from('usage_tracking')
          .update({
            storage_used: Math.max(0, (usage.storage_used || 0) - fileRecord.file_size),
            file_uploads: Math.max(0, (usage.file_uploads || 0) - 1)
          })
          .eq('id', usage.id);
      }
    } catch (usageError) {
      console.error('Error updating usage after file deletion:', usageError);
      // Don't fail the deletion if usage update fails
    }

    return true;
  } catch (error) {
    console.error('Delete file error:', error);
    return false;
  }
}

export async function getFileMetadata(fileId: string, userId: string): Promise<any> {
  try {
    const { data: fileRecord, error } = await supabaseAdmin
      .from('file_attachments')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }

    return fileRecord;
  } catch (error) {
    console.error('Exception in getFileMetadata:', error);
    return null;
  }
}

export async function getUserFiles(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const { data: files, error } = await supabaseAdmin
      .from('file_attachments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting user files:', error);
      return [];
    }

    return files || [];
  } catch (error) {
    console.error('Exception in getUserFiles:', error);
    return [];
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileCategory(file: File): string {
  const type = file.type.toLowerCase();
  
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  if (type.includes('pdf')) return 'document';
  if (type.includes('text/') || type.includes('json') || type.includes('csv')) return 'text';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'archive';
  
  return 'other';
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('text/') || mimeType.includes('json')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
  return '📁';
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

export function isDocumentFile(mimeType: string): boolean {
  const documentTypes = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  return documentTypes.includes(mimeType);
}