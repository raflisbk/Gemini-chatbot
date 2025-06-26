// src/lib/utils.ts - Complete utility functions for the chatbot

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// ====================================
// CORE UTILITIES
// ====================================

// Core utility function for className merging
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Generate UUID v4
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ====================================
// FILE HANDLING UTILITIES
// ====================================

// Enhanced file validation with multimodal support
export function isValidFileType(file: File, acceptedTypes: string[]): boolean {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  return acceptedTypes.some(acceptedType => {
    const type = acceptedType.toLowerCase();
    
    // Handle MIME type wildcards (e.g., "image/*", "audio/*")
    if (type.includes('/*')) {
      const baseType = type.split('/')[0];
      return mimeType.startsWith(baseType + '/');
    }
    
    // Handle file extensions (e.g., ".pdf", ".docx")
    if (type.startsWith('.')) {
      return fileName.endsWith(type);
    }
    
    // Handle exact MIME type matches
    if (type.includes('/')) {
      return mimeType === type;
    }
    
    // Handle general type categories
    if (type === 'image') return mimeType.startsWith('image/');
    if (type === 'audio') return mimeType.startsWith('audio/');
    if (type === 'video') return mimeType.startsWith('video/');
    if (type === 'text') return mimeType.startsWith('text/');
    
    return false;
  });
}

// Enhanced file size formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${sizes[i]}`;
}

// Get file type category for processing
export function getFileCategory(file: File): 'image' | 'document' | 'audio' | 'video' | 'code' | 'archive' | 'other' {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Images
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  
  // Audio
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  
  // Video
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  
  // Code files
  const codeExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
    '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.html', '.css', '.scss',
    '.sass', '.less', '.vue', '.svelte', '.dart', '.scala', '.clj', '.hs',
    '.elm', '.ml', '.fs', '.ex', '.exs', '.cr', '.nim', '.zig', '.v'
  ];
  
  if (codeExtensions.some(ext => fileName.endsWith(ext)) || 
      mimeType.includes('javascript') || 
      mimeType.includes('json') ||
      mimeType === 'text/x-python' ||
      mimeType === 'text/x-java-source') {
    return 'code';
  }
  
  // Archive files
  const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
  if (archiveExtensions.some(ext => fileName.endsWith(ext)) ||
      mimeType.includes('zip') || 
      mimeType.includes('rar') ||
      mimeType.includes('compress')) {
    return 'archive';
  }
  
  // Documents
  const documentTypes = [
    'application/pdf', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 
    'text/csv', 
    'text/markdown', 
    'text/html', 
    'text/xml', 
    'application/rtf',
    'application/epub+zip',
    'application/x-latex'
  ];
  
  const documentExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.md', '.rtf', '.odt', '.ods', '.odp', '.epub',
    '.tex', '.csv'
  ];
  
  if (documentTypes.includes(mimeType) || 
      documentExtensions.some(ext => fileName.endsWith(ext)) ||
      mimeType.startsWith('text/')) {
    return 'document';
  }
  
  return 'other';
}

// Check if file can be processed by AI
export function canProcessFile(file: File): boolean {
  const category = getFileCategory(file);
  const supportedCategories = ['image', 'document', 'audio', 'video', 'code'];
  return supportedCategories.includes(category);
}

// Get processing instructions for file type
export function getFileProcessingHint(file: File): string {
  const category = getFileCategory(file);
  
  switch (category) {
    case 'image':
      return 'AI can describe scenes, read text (OCR), identify objects, analyze composition, and answer questions about this image.';
    case 'document':
      return 'AI can read content, summarize text, extract key information, analyze data, and answer questions about this document.';
    case 'audio':
      return 'AI can transcribe speech, identify sounds and music, analyze audio quality, and provide insights about audio content.';
    case 'video':
      return 'AI can describe scenes, transcribe speech, analyze visual content, identify actions, and provide comprehensive video analysis.';
    case 'code':
      return 'AI can analyze code structure, explain functionality, suggest improvements, find bugs, and help with optimization.';
    case 'archive':
      return 'Archive files cannot be directly processed. Please extract and upload individual files for analysis.';
    default:
      return 'AI will attempt to process this file based on its content and format.';
  }
}

// Validate file for security
export function isSecureFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  // Block potentially dangerous file types
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.ps1',
    '.msi', '.deb', '.rpm', '.dmg', '.app', '.jar'
  ];
  
  const dangerousMimeTypes = [
    'application/x-executable', 
    'application/x-msdownload',
    'application/x-ms-dos-executable',
    'application/x-msdos-program',
    'application/x-winexe'
  ];
  
  const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));
  const hasDangerousMimeType = dangerousMimeTypes.some(type => mimeType.includes(type));
  
  return !hasDangerousExtension && !hasDangerousMimeType;
}

// Get recommended file size limit based on type
export function getRecommendedSizeLimit(file: File): number {
  const category = getFileCategory(file);
  
  switch (category) {
    case 'image':
      return 10 * 1024 * 1024; // 10MB
    case 'audio':
      return 25 * 1024 * 1024; // 25MB
    case 'video':
      return 50 * 1024 * 1024; // 50MB
    case 'document':
    case 'code':
      return 5 * 1024 * 1024;  // 5MB
    case 'archive':
      return 20 * 1024 * 1024; // 20MB
    default:
      return 10 * 1024 * 1024; // 10MB
  }
}

// Extract file extension
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot !== -1 ? fileName.substring(lastDot + 1).toLowerCase() : '';
}

// Check if file is likely to be text-based
export function isTextFile(file: File): boolean {
  const textTypes = [
    'text/plain', 'text/csv', 'application/json', 'text/markdown', 
    'text/html', 'text/xml', 'text/css', 'text/javascript',
    'application/javascript', 'application/xml'
  ];
  
  const textExtensions = [
    '.txt', '.md', '.json', '.csv', '.html', '.xml', '.css', 
    '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
    '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala'
  ];
  
  return textTypes.includes(file.type.toLowerCase()) || 
         textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

// Get MIME type from file extension (fallback)
export function getMimeTypeFromExtension(fileName: string): string {
  const ext = getFileExtension(fileName);
  
  const mimeMap: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    
    // Video
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'py': 'text/x-python',
    'java': 'text/x-java-source',
    'cpp': 'text/x-c++src',
    'c': 'text/x-csrc',
    'h': 'text/x-chdr',
    'php': 'application/x-httpd-php',
    'rb': 'application/x-ruby',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'swift': 'text/x-swift',
    'kt': 'text/x-kotlin',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip'
  };
  
  return mimeMap[ext] || 'application/octet-stream';
}

// ====================================
// STRING UTILITIES
// ====================================

// Slugify text for URLs
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

// Capitalize first letter
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Convert to title case
export function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// Remove special characters
export function sanitizeText(text: string): string {
  return text.replace(/[^\w\s-]/g, '').trim();
}

// Sanitize message content
export function sanitizeMessage(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s\-.,!?()[\]{}:"';@#$%^&*+=<>/\\|`~]/g, '') // Remove problematic chars
    .slice(0, 4000); // Limit length
}

// Extract mentions from message
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

// Extract hashtags from message
export function extractHashtags(content: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;
  
  while ((match = hashtagRegex.exec(content)) !== null) {
    hashtags.push(match[1]);
  }
  
  return [...new Set(hashtags)]; // Remove duplicates
}

// ====================================
// TIME AND DATE UTILITIES
// ====================================

// Format timestamp for chat messages
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than a minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
  
  // More than a week
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format date for display
export function formatDate(date: Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const formatOptions: Record<
    'short' | 'medium' | 'long',
    Intl.DateTimeFormatOptions
  > = {
    short: { day: 'numeric', month: 'short' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  };
  const options = formatOptions[format];
  return date.toLocaleDateString('id-ID', options);
}

// Get relative time
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;
  
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)} minutes ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hours ago`;
  if (diff < week) return `${Math.floor(diff / day)} days ago`;
  if (diff < month) return `${Math.floor(diff / week)} weeks ago`;
  if (diff < year) return `${Math.floor(diff / month)} months ago`;
  return `${Math.floor(diff / year)} years ago`;
}

// Format chat timestamp
export function formatChatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Same day
  if (diff < 86400000 && now.toDateString() === date.toDateString()) {
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // This week
  if (diff < 604800000) {
    return date.toLocaleDateString('id-ID', { weekday: 'short' });
  }
  
  // Older
  return date.toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short' 
  });
}

// Format duration in human readable format
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ====================================
// PERFORMANCE UTILITIES
// ====================================

// Debounce utility for search and other operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

// Memoization utility
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Performance measurement
export function measurePerformance<T>(
  name: string, 
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.debug(`Performance: ${name} took ${(end - start).toFixed(2)}ms`);
  }
  return result;
}

// Async performance measurement
export async function measureAsyncPerformance<T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.debug(`Performance: ${name} took ${(end - start).toFixed(2)}ms`);
  }
  return result;
}

// ====================================
// BROWSER UTILITIES
// ====================================

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

// Download file from blob
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download text as file
export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  downloadFile(blob, filename);
}

// Download JSON as file
export function downloadJSON(data: any, filename: string): void {
  const content = JSON.stringify(data, null, 2);
  downloadTextFile(content, filename, 'application/json');
}

// Check if device is mobile
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if device is iOS
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Check if browser supports feature
export function supportsFeature(feature: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const features: Record<string, () => boolean> = {
    clipboard: () => !!navigator.clipboard,
    serviceWorker: () => 'serviceWorker' in navigator,
    webRTC: () => !!(window as any).RTCPeerConnection,
    webGL: () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch {
        return false;
      }
    },
    webAssembly: () => typeof WebAssembly === 'object',
    intersectionObserver: () => 'IntersectionObserver' in window,
    resizeObserver: () => 'ResizeObserver' in window,
    mutationObserver: () => 'MutationObserver' in window,
    fileReader: () => 'FileReader' in window,
    dragDrop: () => 'draggable' in document.createElement('div'),
    localStorage: () => {
      try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    }
  };
  
  return features[feature]?.() ?? false;
}

// ====================================
// VALIDATION UTILITIES
// ====================================

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// URL validation
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Phone number validation (basic)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Password strength checker
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Include numbers');
  
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Include special characters');
  
  const strengths = ['weak', 'weak', 'fair', 'good', 'strong'] as const;
  
  return {
    score,
    feedback,
    strength: strengths[score]
  };
}

// ====================================
// ARRAY UTILITIES
// ====================================

// Remove duplicates from array
export function uniqueArray<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const keyValue = item[key];
    if (seen.has(keyValue)) {
      return false;
    }
    seen.add(keyValue);
    return true;
  });
}

// Chunk array into smaller arrays
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Shuffle array
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Group array by key
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// Sort array by multiple keys
export function sortBy<T>(array: T[], ...keys: (keyof T)[]): T[] {
  return [...array].sort((a, b) => {
    for (const key of keys) {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

// ====================================
// OBJECT UTILITIES
// ====================================

// Deep clone object
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}

// Deep merge objects
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key] ?? {});
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

// Check if value is object
export function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Pick specific keys from object
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

// Omit specific keys from object
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

// ====================================
// NUMBER UTILITIES
// ====================================

// Clamp number between min and max
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

// Round to specific decimal places
export function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

// Generate random number between min and max
export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Generate random integer between min and max (inclusive)
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Format number with thousands separator
export function formatNumber(num: number, locale: string = 'id-ID'): string {
  return new Intl.NumberFormat(locale).format(num);
}

// Format currency
export function formatCurrency(
  amount: number, 
  currency: string = 'IDR', 
  locale: string = 'id-ID'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Format bytes per second
export function formatBandwidth(bytesPerSecond: number): string {
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let value = bytesPerSecond;
  let unitIndex = 0;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// Format percentage
export function formatPercentage(value: number, total: number, decimals: number = 1): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

// ====================================
// COLOR UTILITIES
// ====================================

// Convert hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Convert RGB to hex
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

// Get contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string) => {
    const rgb = hexToRgb(color);
    if (!rgb) return 0;
    
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (lightest + 0.05) / (darkest + 0.05);
}

// Generate random color
export function randomColor(): string {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

// Lighten or darken a color
export function adjustColorBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const { r, g, b } = rgb;
  const adjust = (color: number) => {
    const adjusted = color + (color * percent / 100);
    return Math.min(255, Math.max(0, Math.round(adjusted)));
  };
  
  return rgbToHex(adjust(r), adjust(g), adjust(b));
}

// ====================================
// ERROR HANDLING UTILITIES
// ====================================

// Safe JSON parse
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Try-catch wrapper with optional error handler
export function tryCatch<T>(
  fn: () => T,
  errorHandler?: (error: Error) => T,
  fallback?: T
): T | undefined {
  try {
    return fn();
  } catch (error) {
    if (errorHandler) {
      return errorHandler(error as Error);
    }
    if (fallback !== undefined) {
      return fallback;
    }
    console.error('tryCatch error:', error);
    return undefined;
  }
}

// Async try-catch wrapper
export async function asyncTryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => T | Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      return await errorHandler(error as Error);
    }
    if (fallback !== undefined) {
      return fallback;
    }
    console.error('asyncTryCatch error:', error);
    return undefined;
  }
}

// Retry utility with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = () => true
  } = options;
  
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts || !shouldRetry(error as Error)) {
        throw error;
      }
      
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Retry attempt ${attempt} failed, retrying in ${delay}ms`, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
  
  throw new Error('Retry attempts exhausted');
}

// ====================================
// STORAGE UTILITIES
// ====================================

// Safe localStorage operations
export const storage = {
  get: <T>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  
  set: (key: string, value: any): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  
  clear: (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
  
  keys: (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  }
};

// Session storage operations
export const sessionStorage = {
  get: <T>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  
  set: (key: string, value: any): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  
  clear: (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.sessionStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

// ====================================
// SEARCH AND FILTERING UTILITIES
// ====================================

// Fuzzy search function
export function fuzzySearch<T>(
  items: T[], 
  query: string, 
  getSearchText: (item: T) => string
): T[] {
  if (!query.trim()) return items;
  
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
  
  return items.filter(item => {
    const text = getSearchText(item).toLowerCase();
    return searchTerms.every(term => text.includes(term));
  });
}

// Highlight search terms in text
export function highlightSearchTerms(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const terms = query.split(' ').filter(term => term.length > 0);
  let highlighted = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  
  return highlighted;
}

// ====================================
// URL AND ROUTING UTILITIES
// ====================================

// Extract domain from URL
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// Build query string from object
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
}

// Parse query string to object
export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

// ====================================
// AI ANALYSIS UTILITIES
// ====================================

// Generate file analysis prompt
export function generateFileAnalysisPrompt(files: File[]): string {
  const fileDescriptions = files.map(file => {
    const category = getFileCategory(file);
    const size = formatFileSize(file.size);
    return `- ${file.name} (${category}, ${size})`;
  }).join('\n');
  
  return `I have uploaded ${files.length} file(s) for analysis:\n${fileDescriptions}\n\nPlease analyze these files and provide insights about their content.`;
}

// Get optimal file processing order
export function getOptimalProcessingOrder(files: File[]): File[] {
  const priority = { 
    image: 1, 
    document: 2, 
    code: 3, 
    audio: 4, 
    video: 5, 
    archive: 6, 
    other: 7 
  };
  
  return [...files].sort((a, b) => {
    const aPriority = priority[getFileCategory(a)];
    const bPriority = priority[getFileCategory(b)];
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Secondary sort by file size (smaller first for faster processing)
    return a.size - b.size;
  });
}

// Check if files can be processed together
export function canProcessTogether(files: File[]): boolean {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = 100 * 1024 * 1024; // 100MB total limit
  
  return files.length <= 10 && totalSize <= maxTotalSize;
}

// Get file processing recommendations
export function getFileProcessingRecommendations(files: File[]): {
  canProcess: boolean;
  recommendations: string[];
  warnings: string[];
} {
  const recommendations: string[] = [];
  const warnings: string[] = [];
  let canProcess = true;
  
  // Check total file count
  if (files.length > 10) {
    canProcess = false;
    warnings.push('Too many files. Maximum 10 files allowed.');
  }
  
  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > 100 * 1024 * 1024) {
    canProcess = false;
    warnings.push('Total file size too large. Maximum 100MB allowed.');
  }
  
  // Check individual file sizes
  files.forEach(file => {
    const category = getFileCategory(file);
    const limit = getRecommendedSizeLimit(file);
    
    if (file.size > limit) {
      canProcess = false;
      warnings.push(`${file.name} is too large for ${category} files.`);
    }
  });
  
  // Provide processing recommendations
  const categories = [...new Set(files.map(getFileCategory))];
  
  if (categories.includes('image')) {
    recommendations.push('Images will be analyzed for objects, text (OCR), and content.');
  }
  if (categories.includes('document')) {
    recommendations.push('Documents will be read and summarized.');
  }
  if (categories.includes('code')) {
    recommendations.push('Code will be reviewed for structure and functionality.');
  }
  if (categories.includes('audio')) {
    recommendations.push('Audio will be transcribed and analyzed.');
  }
  if (categories.includes('video')) {
    recommendations.push('Videos will be analyzed for content and speech.');
  }
  
  // Optimal processing order
  if (files.length > 1) {
    const ordered = getOptimalProcessingOrder(files);
    if (ordered[0] !== files[0]) {
      recommendations.push('Files will be processed in optimal order for better performance.');
    }
  }
  
  return { canProcess, recommendations, warnings };
}

// Extract text content from various file types
export async function extractTextFromFile(file: File): Promise<string> {
  const category = getFileCategory(file);
  
  switch (category) {
    case 'document':
      if (isTextFile(file)) {
        return await file.text();
      }
      // For PDFs and other docs, return basic info
      return `Document: ${file.name} (${formatFileSize(file.size)})`;
      
    case 'code':
      return await file.text();
      
    default:
      return `File: ${file.name} (${category}, ${formatFileSize(file.size)})`;
  }
}

// Generate file summary for AI processing
export async function generateFileSummary(file: File): Promise<{
  name: string;
  category: string;
  size: string;
  type: string;
  content?: string;
  metadata: Record<string, any>;
}> {
  const category = getFileCategory(file);
  const metadata: Record<string, any> = {
    lastModified: file.lastModified,
    canProcess: canProcessFile(file),
    securityCheck: isSecureFile(file)
  };
  
  let content: string | undefined;
  
  // Extract content preview for text-based files
  if (category === 'code' || (category === 'document' && isTextFile(file))) {
    try {
      const fullText = await file.text();
      content = fullText.length > 500 ? fullText.slice(0, 500) + '...' : fullText;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Failed to extract text from ${file.name}:`, error);
      }
    }
  }
  
  return {
    name: file.name,
    category,
    size: formatFileSize(file.size),
    type: file.type || 'unknown',
    content,
    metadata
  };
}

// ====================================
// ADVANCED UTILITIES
// ====================================

// Rate limiting utility
export class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  isAllowed(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }
  
  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }
  
  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0;
    const oldest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldest));
  }
}

// Event emitter utility
export class EventEmitter<T extends Record<string, any>> {
  private events: Map<keyof T, Function[]> = new Map();
  
  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    this.events.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  emit<K extends keyof T>(event: K, data: T[K]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${String(event)}:`, error);
        }
      });
    }
  }
  
  off<K extends keyof T>(event: K, callback?: Function): void {
    if (!callback) {
      this.events.delete(event);
      return;
    }
    
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  once<K extends keyof T>(event: K, callback: (data: T[K]) => void): () => void {
    const unsubscribe = this.on(event, (data) => {
      callback(data);
      unsubscribe();
    });
    
    return unsubscribe;
  }
}

// Cache utility with TTL support
export class Cache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  
  constructor(private defaultTTL: number = 300000) {} // 5 minutes default
  
  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expires });
  }
  
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) return undefined;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    // Clean expired items first
    this.cleanup();
    return this.cache.size;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Queue utility for rate-limited operations
export class Queue {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  
  constructor(
    private concurrency: number = 1,
    private rateLimiter?: RateLimiter
  ) {}
  
  async add<R>(fn: () => Promise<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          // Check rate limit if provided
          if (this.rateLimiter && !this.rateLimiter.isAllowed()) {
            const waitTime = this.rateLimiter.getTimeUntilReset();
            if (waitTime > 0) {
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
          
          const result = await fn();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });
      
      this.process();
    });
  }
  
  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const task = this.queue.shift()!;
    
    try {
      await task();
    } catch (error) {
      // Error handling is done in the task itself
    } finally {
      this.running--;
      this.process(); // Process next task
    }
  }
  
  get size(): number {
    return this.queue.length;
  }
  
  get pending(): number {
    return this.running;
  }
  
  clear(): void {
    this.queue.length = 0;
  }
}

// ====================================
// DEVELOPMENT AND DEBUGGING UTILITIES
// ====================================

// Debug logger with levels
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🐛 ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`ℹ️ ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`⚠️ ${message}`, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`❌ ${message}`, ...args);
  },
  
  success: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${message}`, ...args);
    }
  }
};

// ====================================
// COMPREHENSIVE DEFAULT EXPORT
// ====================================

// Export comprehensive utility object
export default {
  // Core utilities
  cn,
  generateId,
  generateUUID,
  
  // File utilities
  isValidFileType,
  formatFileSize,
  getFileCategory,
  canProcessFile,
  getFileProcessingHint,
  isSecureFile,
  getRecommendedSizeLimit,
  getFileExtension,
  isTextFile,
  getMimeTypeFromExtension,
  getOptimalProcessingOrder,
  canProcessTogether,
  getFileProcessingRecommendations,
  extractTextFromFile,
  generateFileSummary,
  
  // String utilities
  slugify,
  truncate,
  capitalize,
  toTitleCase,
  sanitizeText,
  sanitizeMessage,
  extractMentions,
  extractHashtags,
  
  // Time and formatting utilities
  formatTimestamp,
  formatDate,
  getRelativeTime,
  formatChatTime,
  formatDuration,
  formatBandwidth,
  
  // Performance utilities
  debounce,
  throttle,
  memoize,
  measurePerformance,
  measureAsyncPerformance,
  
  // Browser utilities
  copyToClipboard,
  downloadFile,
  downloadTextFile,
  downloadJSON,
  isMobile,
  isIOS,
  supportsFeature,
  
  // Validation utilities
  isValidEmail,
  isValidURL,
  isValidPhone,
  getPasswordStrength,
  
  // Array utilities
  uniqueArray,
  chunkArray,
  shuffleArray,
  groupBy,
  sortBy,
  
  // Object utilities
  deepClone,
  deepMerge,
  isObject,
  pick,
  omit,
  
  // Number utilities
  clamp,
  roundTo,
  randomBetween,
  randomInt,
  formatNumber,
  formatCurrency,
  formatPercentage,
  
  // Color utilities
  hexToRgb,
  rgbToHex,
  getContrastRatio,
  randomColor,
  adjustColorBrightness,
  
  // Error handling
  safeJsonParse,
  tryCatch,
  asyncTryCatch,
  retry,
  
  // Storage utilities
  storage,
  sessionStorage,
  
  // Search utilities
  fuzzySearch,
  highlightSearchTerms,
  
  // URL utilities
  extractDomain,
  buildQueryString,
  parseQueryString,
  
  // AI utilities
  generateFileAnalysisPrompt,
  
  // Advanced utilities
  RateLimiter,
  EventEmitter,
  Cache,
  Queue,
  
  // Development utilities
  logger
};