// src/app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { put } from '@vercel/blob';
import { supabase } from '@/lib/supabase';
import { trackUsage } from '@/lib/supabase';

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
  // Archives (for extraction)
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
];

// ========================================
// INTERFACES
// ========================================

interface UploadResponse {
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
  details?: any;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

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

async function checkStorageQuota(userId: string, fileSize: number): Promise<{ allowed: boolean; details?: any }> {
  try {
    // Get user's current storage usage
    const { data: usage, error } = await supabase
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
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      throw userError;
    }

    const userRole = user.role as keyof typeof STORAGE_LIMITS;
    const limit = STORAGE_LIMITS[userRole] || STORAGE_LIMITS.user;

    return {
      allowed: totalAfterUpload <= limit,
      details: {
        currentUsage,
        fileSize,
        totalAfterUpload,
        limit,
        remainingStorage: limit - currentUsage
      }
    };
  } catch (error) {
    console.error('Storage quota check error:', error);
    return { allowed: false, details: { error: 'Failed to check storage quota' } };
  }
}

async function updateStorageUsage(userId: string, fileSize: number): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create usage record
    const { data: existing, error: fetchError } = await supabase
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
      await supabase
        .from('usage_tracking')
        .update({
          storage_used: (existing.storage_used || 0) + fileSize,
          file_uploads: (existing.file_uploads || 0) + 1
        })
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabase
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
// MAIN UPLOAD HANDLER
// ========================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required for file uploads' 
        },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No file provided' 
        },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error 
        },
        { status: 400 }
      );
    }

    // Check storage quota
    const quotaCheck = await checkStorageQuota(user.id, file.size);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Storage quota exceeded',
          details: quotaCheck.details 
        },
        { status: 413 }
      );
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
    const { data: fileRecord, error: dbError } = await supabase
      .from('file_attachments')
      .insert({
        user_id: user.id,
        filename: safeFileName,
        original_name: file.name,
        file_path: url,
        blob_url: url,
        mime_type: file.type,
        file_size: file.size,
        file_hash: null, // TODO: Implement file hashing for deduplication
        processing_status: 'completed',
        ai_analysis: {}
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error saving file:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save file metadata',
          details: dbError.message 
        },
        { status: 500 }
      );
    }

    // Update storage usage
    await updateStorageUsage(user.id, file.size);

    // Track usage
    await trackUsage(user.id, 'file_upload');

    // Return success response
    const response: UploadResponse = {
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.original_name,
        url: fileRecord.blob_url ?? '',
        mimeType: fileRecord.mime_type,
        size: fileRecord.file_size,
        base64: base64Data // Include base64 for AI processing
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during file upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ========================================
// GET HANDLER - List user files
// ========================================

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user files
    const { data: files, error } = await supabase
      .from('file_attachments')
      .select('id, filename, original_name, blob_url, mime_type, file_size, processing_status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching files:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch files',
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      files: files || [],
      pagination: {
        limit,
        offset,
        total: files?.length || 0
      }
    });

  } catch (error) {
    console.error('File listing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}