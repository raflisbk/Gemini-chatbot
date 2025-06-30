import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getFileMetadata, deleteFile } from '@/lib/storage';
import { z } from 'zod';

// Validation schema for file operations
const fileParamsSchema = z.object({
  fileId: z.string().uuid('Invalid file ID format')
});

// Interface for file response
interface FileResponse {
  success: boolean;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    url: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
    metadata?: Record<string, any>;
  };
  error?: string;
  errorType?: string;
}

// Interface for delete response
interface DeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorType?: string;
}

/**
 * GET /api/files/[fileId]
 * Get file metadata and information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
): Promise<NextResponse<FileResponse>> {
  try {
    // Validate file ID parameter
    const paramValidation = fileParamsSchema.safeParse(params);
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file ID format',
          errorType: 'validation_error'
        },
        { status: 400 }
      );
    }

    const { fileId } = paramValidation.data;

    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          errorType: 'auth_required'
        },
        { status: 401 }
      );
    }

    // Get file metadata from database
    const fileMetadata = await getFileMetadata(fileId, user.id);
    
    if (!fileMetadata) {
      return NextResponse.json(
        {
          success: false,
          error: 'File not found or access denied',
          errorType: 'not_found'
        },
        { status: 404 }
      );
    }

    // Return file information
    return NextResponse.json({
      success: true,
      file: {
        id: fileMetadata.id,
        filename: fileMetadata.filename,
        originalName: fileMetadata.original_name,
        url: fileMetadata.blob_url,
        size: fileMetadata.file_size,
        mimeType: fileMetadata.mime_type,
        uploadedAt: fileMetadata.uploaded_at,
        metadata: fileMetadata.metadata as Record<string, any>
      }
    });

  } catch (error) {
    console.error('Get file API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            errorType: 'permission_denied'
          },
          { status: 403 }
        );
      }
      
      if (error.message.includes('network') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database connection error',
            errorType: 'network_error'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        errorType: 'server_error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[fileId]
 * Delete file from storage and database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
): Promise<NextResponse<DeleteResponse>> {
  try {
    // Validate file ID parameter
    const paramValidation = fileParamsSchema.safeParse(params);
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file ID format',
          errorType: 'validation_error'
        },
        { status: 400 }
      );
    }

    const { fileId } = paramValidation.data;

    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          errorType: 'auth_required'
        },
        { status: 401 }
      );
    }

    // Check if file exists and user has permission
    const fileMetadata = await getFileMetadata(fileId, user.id);
    if (!fileMetadata) {
      return NextResponse.json(
        {
          success: false,
          error: 'File not found or access denied',
          errorType: 'not_found'
        },
        { status: 404 }
      );
    }

    // Attempt to delete file
    const deleteSuccess = await deleteFile(fileId, user.id);
    
    if (!deleteSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete file. File may be in use or already deleted.',
          errorType: 'delete_failed'
        },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: `File "${fileMetadata.original_name}" deleted successfully`
    });

  } catch (error) {
    console.error('Delete file API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied. You can only delete your own files.',
            errorType: 'permission_denied'
          },
          { status: 403 }
        );
      }
      
      if (error.message.includes('in use') || error.message.includes('referenced')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot delete file. It may be referenced by messages or other resources.',
            errorType: 'file_in_use'
          },
          { status: 409 }
        );
      }
      
      if (error.message.includes('storage') || error.message.includes('blob')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Storage service error. Please try again later.',
            errorType: 'storage_error'
          },
          { status: 503 }
        );
      }
      
      if (error.message.includes('network') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database connection error',
            errorType: 'network_error'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        errorType: 'server_error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/files/[fileId]
 * Update file metadata (optional feature)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { fileId: string } }
): Promise<NextResponse<FileResponse>> {
  try {
    // Validate file ID parameter
    const paramValidation = fileParamsSchema.safeParse(params);
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file ID format',
          errorType: 'validation_error'
        },
        { status: 400 }
      );
    }

    const { fileId } = paramValidation.data;

    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          errorType: 'auth_required'
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate update data
    const updateSchema = z.object({
      originalName: z.string().min(1).max(255).optional(),
      metadata: z.record(z.any()).optional(),
      isProcessed: z.boolean().optional()
    });

    const updateValidation = updateSchema.safeParse(body);
    if (!updateValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid update data',
          errorType: 'validation_error'
        },
        { status: 400 }
      );
    }

    // Check if file exists and user has permission
    const fileMetadata = await getFileMetadata(fileId, user.id);
    if (!fileMetadata) {
      return NextResponse.json(
        {
          success: false,
          error: 'File not found or access denied',
          errorType: 'not_found'
        },
        { status: 404 }
      );
    }

    // Update file metadata in database
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data: updatedFile, error } = await supabaseAdmin
      .from('file_attachments')
      .update({
        ...(updateValidation.data.originalName && { original_name: updateValidation.data.originalName }),
        ...(updateValidation.data.metadata && { metadata: updateValidation.data.metadata }),
        ...(updateValidation.data.isProcessed !== undefined && { is_processed: updateValidation.data.isProcessed })
      })
      .eq('id', fileId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !updatedFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update file metadata',
          errorType: 'update_failed'
        },
        { status: 400 }
      );
    }

    // Return updated file information
    return NextResponse.json({
      success: true,
      file: {
        id: updatedFile.id,
        filename: updatedFile.filename,
        originalName: updatedFile.original_name,
        url: updatedFile.blob_url,
        size: updatedFile.file_size,
        mimeType: updatedFile.mime_type,
        uploadedAt: updatedFile.uploaded_at,
        metadata: updatedFile.metadata as Record<string, any>
      }
    });

  } catch (error) {
    console.error('Update file API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        errorType: 'server_error'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/files/[fileId]
 * Handle CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}