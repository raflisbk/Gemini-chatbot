import { put, del, list, head } from '@vercel/blob';
import { supabase, supabaseAdmin } from './supabase';
import type { FileAttachmentInsert } from './supabase';
import crypto from 'crypto';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;

if (!BLOB_TOKEN) {
  throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
}

export interface UploadResult {
  success: boolean;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    url: string;
    size: number;
    mimeType: string;
  };
  error?: string;
}

export interface FileValidation {
  isValid: boolean;
  errors: string[];
}

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Code files
  'text/javascript', 'application/javascript', 'text/typescript', 'application/typescript',
  'text/html', 'text/css', 'application/json', 'text/xml', 'application/xml',
  'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++src',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac',
  // Video
  'video/mp4', 'video/avi', 'video/quicktime', 'video/webm',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
];

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.ps1', '.msi', 
  '.deb', '.rpm', '.dmg', '.app', '.jar', '.sh', '.run'
];

// Validate file before upload
export const validateFile = (file: File): FileValidation => {
  const errors: string[] = [];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`);
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Check dangerous extensions
  const fileName = file.name.toLowerCase();
  const hasDangerousExtension = DANGEROUS_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (hasDangerousExtension) {
    errors.push('This file type is not allowed for security reasons');
  }

  // Check if file has an extension
  if (!fileName.includes('.')) {
    errors.push('File must have an extension');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate secure filename
export const generateSecureFilename = (originalName: string, userId: string): string => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  const sanitizedName = originalName
    .substring(0, originalName.lastIndexOf('.'))
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50);
  
  return `${userId}/${timestamp}_${random}_${sanitizedName}${extension}`;
};

// Upload file to Vercel Blob
export const uploadFile = async (
  file: File, 
  userId: string, 
  messageId?: string
): Promise<UploadResult> => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    // Generate secure filename
    const secureFilename = generateSecureFilename(file.name, userId);

    // Upload to Vercel Blob
    const blob = await put(secureFilename, file, {
      access: 'public',
      token: BLOB_TOKEN,
    });

    // Save file metadata to database
    const fileData: FileAttachmentInsert = {
      user_id: userId,
      message_id: messageId || null,
      filename: secureFilename,
      original_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      blob_url: blob.url,
      metadata: {
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        contentType: blob.contentType,
        contentDisposition: blob.contentDisposition,
      }
    };

    const { data: savedFile, error } = await supabaseAdmin
      .from('file_attachments')
      .insert(fileData)
      .select()
      .single();

    if (error) {
      // If database save fails, delete the blob
      await deleteFile(blob.url, userId);
      return {
        success: false,
        error: 'Failed to save file metadata'
      };
    }

    return {
      success: true,
      file: {
        id: savedFile.id,
        filename: savedFile.filename,
        originalName: savedFile.original_name,
        url: savedFile.blob_url,
        size: savedFile.file_size,
        mimeType: savedFile.mime_type,
      }
    };

  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: 'Failed to upload file'
    };
  }
};

// Upload multiple files
export const uploadFiles = async (
  files: File[], 
  userId: string, 
  messageId?: string
): Promise<{ successes: UploadResult[]; failures: UploadResult[] }> => {
  const results = await Promise.allSettled(
    files.map(file => uploadFile(file, userId, messageId))
  );

  const successes: UploadResult[] = [];
  const failures: UploadResult[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        successes.push(result.value);
      } else {
        failures.push(result.value);
      }
    } else {
      failures.push({
        success: false,
        error: `Failed to upload ${files[index].name}: ${result.reason}`
      });
    }
  });

  return { successes, failures };
};

// Delete file from blob and database
export const deleteFile = async (urlOrId: string, userId: string): Promise<boolean> => {
  try {
    let fileRecord;

    // Check if it's a URL or ID
    if (urlOrId.startsWith('http')) {
      // It's a URL, find by blob_url
      const { data } = await supabaseAdmin
        .from('file_attachments')
        .select('*')
        .eq('blob_url', urlOrId)
        .eq('user_id', userId)
        .single();
      fileRecord = data;
    } else {
      // It's an ID
      const { data } = await supabaseAdmin
        .from('file_attachments')
        .select('*')
        .eq('id', urlOrId)
        .eq('user_id', userId)
        .single();
      fileRecord = data;
    }

    if (!fileRecord) {
      return false;
    }

    // Delete from blob storage
    await del(fileRecord.blob_url, { token: BLOB_TOKEN });

    // Delete from database
    const { error } = await supabaseAdmin
      .from('file_attachments')
      .delete()
      .eq('id', fileRecord.id);

    return !error;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
};

// Get file metadata
export const getFileMetadata = async (fileId: string, userId: string) => {
  const { data, error } = await supabase
    .from('file_attachments')
    .select('*')
    .eq('id', fileId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
};

// List user files with pagination
export const getUserFiles = async (
  userId: string, 
  page: number = 1, 
  limit: number = 20
) => {
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('file_attachments')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { files: [], total: 0, page, limit };
  }

  return {
    files: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
};

// Get storage usage for user
export const getUserStorageUsage = async (userId: string) => {
  const { data, error } = await supabase
    .from('file_attachments')
    .select('file_size')
    .eq('user_id', userId);

  if (error || !data) {
    return { totalSize: 0, fileCount: 0 };
  }

  const totalSize = data.reduce((sum, file) => sum + file.file_size, 0);
  
  return {
    totalSize,
    fileCount: data.length,
    totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
  };
};

// Check if user has reached storage quota
export const checkStorageQuota = async (userId: string, additionalSize: number = 0) => {
  const STORAGE_QUOTA_MB = 500; // 500MB per user
  const usage = await getUserStorageUsage(userId);
  const totalSizeWithAddition = usage.totalSize + additionalSize;
  const quotaBytes = STORAGE_QUOTA_MB * 1024 * 1024;

  return {
    currentUsageMB: usage.totalSizeMB ?? 0,
    quotaMB: STORAGE_QUOTA_MB,
    remainingMB: Math.max(0, STORAGE_QUOTA_MB - (usage.totalSizeMB ?? 0)),
    isOverQuota: totalSizeWithAddition > quotaBytes,
    usagePercentage: Math.round((totalSizeWithAddition / quotaBytes) * 100)
  };
};