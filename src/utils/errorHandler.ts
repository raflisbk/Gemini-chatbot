// src/utils/errorHandler.ts

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  component?: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export class ErrorHandler {
  private static errors: AppError[] = [];
  private static maxErrors = 100;

  public static handleError(
    error: Error | string,
    component?: string,
    severity: ErrorSeverity = 'medium',
    additionalData?: Record<string, any>
  ): AppError {
    const appError: AppError = {
      code: this.generateErrorCode(component, severity),
      message: typeof error === 'string' ? error : error.message,
      details: {
        severity,
        stack: typeof error === 'object' ? error.stack : undefined,
        ...additionalData
      },
      timestamp: new Date(),
      component
    };

    // Store error
    this.errors.unshift(appError);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log based on severity
    this.logError(appError);

    return appError;
  }

  public static handleVoiceError(error: string): string {
    const errorMessages: Record<string, string> = {
      'no-speech': 'Tidak ada suara yang terdeteksi. Coba bicara lebih jelas.',
      'audio-capture': 'Gagal menangkap audio. Periksa mikrofon Anda.',
      'not-allowed': 'Akses mikrofon ditolak. Silakan berikan izin di pengaturan browser.',
      'network': 'Kesalahan jaringan. Periksa koneksi internet Anda.',
      'service-not-allowed': 'Layanan pengenalan suara tidak diizinkan.',
      'aborted': 'Pengenalan suara dibatalkan.',
      'language-not-supported': 'Bahasa yang dipilih tidak didukung.',
    };

    const userFriendlyMessage = errorMessages[error] || `Kesalahan pengenalan suara: ${error}`;

    this.handleError(
      new Error(userFriendlyMessage),
      'VoiceInput',
      'medium',
      { originalError: error }
    );

    return userFriendlyMessage;
  }

  public static handleFileError(
    fileName: string,
    fileSize: number,
    errorType: string,
    originalError?: Error
  ): string {
    const errorMessages: Record<string, string> = {
      'size': `File ${fileName} terlalu besar. Maksimal 50MB.`,
      'type': `Tipe file ${fileName} tidak didukung.`,
      'network': `Gagal mengupload ${fileName}. Periksa koneksi internet.`,
      'processing': `Gagal memproses ${fileName}. File mungkin rusak.`,
      'permission': `Tidak memiliki izin untuk mengakses ${fileName}.`,
    };

    const userFriendlyMessage = errorMessages[errorType] || `Gagal memproses file ${fileName}`;

    this.handleError(
      originalError || new Error(userFriendlyMessage),
      'FileUpload',
      'medium',
      { fileName, fileSize, errorType }
    );

    return userFriendlyMessage;
  }

  public static handleApiError(
    endpoint: string,
    status: number,
    message: string,
    responseData?: any
  ): string {
    const userFriendlyMessages: Record<number, string> = {
      400: 'Permintaan tidak valid. Periksa input Anda.',
      401: 'Sesi telah berakhir. Silakan login kembali.',
      403: 'Akses ditolak. Anda tidak memiliki izin.',
      404: 'Layanan tidak ditemukan.',
      429: 'Terlalu banyak permintaan. Coba lagi nanti.',
      500: 'Terjadi kesalahan server. Coba lagi nanti.',
      502: 'Layanan sedang tidak tersedia.',
      503: 'Layanan sedang dalam pemeliharaan.',
    };

    const userFriendlyMessage = userFriendlyMessages[status] || 'Terjadi kesalahan tidak terduga.';

    this.handleError(
      new Error(`API Error: ${message}`),
      'API',
      status >= 500 ? 'high' : 'medium',
      { endpoint, status, responseData }
    );

    return userFriendlyMessage;
  }

  public static getErrors(component?: string): AppError[] {
    if (component) {
      return this.errors.filter(error => error.component === component);
    }
    return [...this.errors];
  }

  public static clearErrors(component?: string): void {
    if (component) {
      this.errors = this.errors.filter(error => error.component !== component);
    } else {
      this.errors = [];
    }
  }

  public static getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byComponent: Record<string, number>;
  } {
    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const byComponent: Record<string, number> = {};

    this.errors.forEach(error => {
      const severity = (error.details?.severity as ErrorSeverity) || 'medium';
      bySeverity[severity]++;

      if (error.component) {
        byComponent[error.component] = (byComponent[error.component] || 0) + 1;
      }
    });

    return {
      total: this.errors.length,
      bySeverity,
      byComponent
    };
  }

  private static generateErrorCode(component?: string, severity?: ErrorSeverity): string {
    const timestamp = Date.now().toString(36);
    const componentCode = component ? component.substring(0, 3).toUpperCase() : 'GEN';
    const severityCode = severity ? severity.substring(0, 1).toUpperCase() : 'M';
    return `${componentCode}-${severityCode}-${timestamp}`;
  }

  private static logError(error: AppError): void {
    const severity = error.details?.severity as ErrorSeverity || 'medium';

    switch (severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', error);
        break;
      case 'high':
        console.error('🔴 HIGH ERROR:', error);
        break;
      case 'medium':
        console.warn('🟡 MEDIUM ERROR:', error);
        break;
      case 'low':
        console.info('🟢 LOW ERROR:', error);
        break;
    }
  }
}

// React Hook for error handling
export const useErrorHandler = () => {
  const handleError = (
    error: Error | string,
    component?: string,
    severity: ErrorSeverity = 'medium'
  ) => {
    return ErrorHandler.handleError(error, component, severity);
  };

  const handleVoiceError = (error: string) => {
    return ErrorHandler.handleVoiceError(error);
  };

  const handleFileError = (
    fileName: string,
    fileSize: number,
    errorType: string,
    originalError?: Error
  ) => {
    return ErrorHandler.handleFileError(fileName, fileSize, errorType, originalError);
  };

  const handleApiError = (
    endpoint: string,
    status: number,
    message: string,
    responseData?: any
  ) => {
    return ErrorHandler.handleApiError(endpoint, status, message, responseData);
  };

  const getErrors = (component?: string) => {
    return ErrorHandler.getErrors(component);
  };

  const clearErrors = (component?: string) => {
    ErrorHandler.clearErrors(component);
  };

  return {
    handleError,
    handleVoiceError,
    handleFileError,
    handleApiError,
    getErrors,
    clearErrors
  };
};