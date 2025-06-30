import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { uploadFile, uploadFiles, checkStorageQuota } from '@/lib/storage';
import { trackUsage } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const messageId = formData.get('messageId') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Check storage quota
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const quotaCheck = await checkStorageQuota(user.id, totalSize);
    
    if (quotaCheck.isOverQuota) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Storage quota exceeded',
          quotaInfo: quotaCheck
        },
        { status: 413 }
      );
    }

    // Upload files
    if (files.length === 1) {
      const result = await uploadFile(files[0], user.id, messageId || undefined);
      
      if (result.success) {
        await trackUsage(user.id, 'file_upload');
      }
      
      return NextResponse.json(result);
    } else {
      const results = await uploadFiles(files, user.id, messageId || undefined);
      
      if (results.successes.length > 0) {
        for (let i = 0; i < results.successes.length; i++) {
          await trackUsage(user.id, 'file_upload');
        }
      }
      
      return NextResponse.json({
        success: results.successes.length > 0,
        successes: results.successes,
        failures: results.failures,
        totalUploaded: results.successes.length,
        totalFailed: results.failures.length
      });
    }
  } catch (error) {
    console.error('File upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}