// src/lib/storage.ts - COMPLETE FIXED VERSION WITH ALL EXPORTS

import { supabase, supabaseAdmin } from './supabase';

// ========================================
// CONSTANTS
// ========================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/m4a', 'audio/aac',
  // Video
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mkv',
  // Documents
  'application/pdf', 'text/plain', 'text/csv', 'text/markdown', 'application/json', 'application/xml', 'text/xml',
  // Office documents
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
];

// ========================================
// INTERFACES
// ========================================

export interface StorageQuotaInfo {
  isOverQuota: boolean;
  currentUsage: number;
  totalSize: number;
  limit: number;
  remainingStorage: number;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UserStorageUsage {
  totalStorage: number;
  usedStorage: number;
  remainingStorage: number;
  fileCount: number;
}

export interface StorageQuotaCheck {
  isOverQuota: boolean;
  currentUsage: number;
  limit: number;
  remainingStorage: number;
}

// ========================================
// FILE VALIDATION
// ========================================

export function validateFile(file: File): FileValidationResult {
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
// STORAGE QUOTA MANAGEMENT - FIXED EXPORTS
// ========================================

export async function getUserStorageUsage(userId: string): Promise<UserStorageUsage> {
  try {
    const { data: usage, error } = await supabaseAdmin
      .from('usage_tracking')
      .select('storage_used, file_uploads')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Get user role for storage limits
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      throw userError;
    }

    // Storage limits based on user role
    const STORAGE_LIMITS = {
      admin: 5 * 1024 * 1024 * 1024, // 5GB
      user: 1 * 1024 * 1024 * 1024,  // 1GB
      guest: 50 * 1024 * 1024        // 50MB
    };

    const userRole = user?.role as keyof typeof STORAGE_LIMITS || 'user';
    const totalStorage = STORAGE_LIMITS[userRole];
    const usedStorage = usage?.storage_used || 0;

    return {
      totalStorage,
      usedStorage,
      remainingStorage: Math.max(0, totalStorage - usedStorage),
      fileCount: usage?.file_uploads || 0
    };
  } catch (error) {
    console.error('Error getting user storage usage:', error);
    return {
      totalStorage: 1024 * 1024 * 1024, // 1GB default
      usedStorage: 0,
      remainingStorage: 1024 * 1024 * 1024,
      fileCount: 0
    };
  }
}

export async function checkStorageQuota(userId: string, fileSize: number = 0): Promise<StorageQuotaCheck> {
  try {
    const storageInfo = await getUserStorageUsage(userId);
    const totalAfterUpload = storageInfo.usedStorage + fileSize;
    
    return {
      isOverQuota: totalAfterUpload >= storageInfo.totalStorage,
      currentUsage: storageInfo.usedStorage,
      limit: storageInfo.totalStorage,
      remainingStorage: storageInfo.remainingStorage
    };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return {
      isOverQuota: false,
      currentUsage: 0,
      limit: 1024 * 1024 * 1024, // 1GB default
      remainingStorage: 1024 * 1024 * 1024
    };
  }
}

// ========================================
// STORAGE QUOTA WITH FILE SIZE
// ========================================

export async function checkStorageQuotaWithFile(userId: string, fileSize: number): Promise<StorageQuotaInfo> {
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

// ========================================
// STORAGE USAGE MANAGEMENT
// ========================================

export async function updateStorageUsage(userId: string, fileSize: number): Promise<void> {
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
          message_count: 0
        });
    }
  } catch (error) {
    console.error('Storage usage update error:', error);
    throw error;
  }
}

// ========================================
// FILE MANAGEMENT
// ========================================

export async function deleteFile(fileId: string, userId: string): Promise<boolean> {
  try {
    // Get file record first to check ownership and get file details
    const { data: fileRecord, error: fetchError } = await supabaseAdmin
      .from('file_attachments')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId) // Ensure user owns the file
      .single();

    if (fetchError) {
      console.error('Error fetching file for deletion:', fetchError);
      return false;
    }

    if (!fileRecord) {
      console.error('File not found or access denied');
      return false;
    }

    // Delete from database first
    const { error: dbError } = await supabaseAdmin
      .from('file_attachments')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('Error deleting file from database:', dbError);
      return false;
    }

    // Update storage usage (reduce)
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: usage, error: usageError } = await supabaseAdmin
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (!usageError && usage) {
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
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

export function generateSafeFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
  
  return `${timestamp}_${randomString}_${baseName}${extension ? '.' + extension : ''}`;
}

export function getMimeTypeFromExtension(filename: string): string {
  const extension = getFileExtension(filename).toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    
    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/mkv',
    
    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
    
    // Office
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'doc': 'application/msword',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

// ========================================
// HEALTH CHECK
// ========================================

export async function getStorageHealth(): Promise<{
  status: 'healthy' | 'warning' | 'error';
  details: any;
}> {
  try {
    // Check database connectivity
    const { data, error } = await supabaseAdmin
      .from('file_attachments')
      .select('count(*)')
      .limit(1);

    if (error) {
      return {
        status: 'error',
        details: {
          error: 'Database connectivity issue',
          message: error.message
        }
      };
    }

    return {
      status: 'healthy',
      details: {
        timestamp: new Date().toISOString(),
        dbConnected: true
      }
    };
  } catch (error) {
    return {
      status: 'error',
      details: {
        error: 'Storage health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}