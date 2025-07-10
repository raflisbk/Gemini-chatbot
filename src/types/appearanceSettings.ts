// src/types/appearanceSettings.ts - Consistent Type Definition

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'sm' | 'md' | 'lg';           // Always string type
  sidebarPosition: 'left' | 'right';
  accentColor: string;
  fontFamily?: string;
  sidebarCollapsed?: boolean;
  animations?: boolean;
}

// Default settings with consistent types
export const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'system',
  fontSize: 'md',                         // String default
  sidebarPosition: 'left',
  accentColor: '#10b981',
  fontFamily: 'Inter',
  sidebarCollapsed: false,
  animations: true
};

// Type guards for validation
export const isValidFontSize = (value: any): value is 'sm' | 'md' | 'lg' => {
  return typeof value === 'string' && ['sm', 'md', 'lg'].includes(value);
};

export const isValidTheme = (value: any): value is 'light' | 'dark' | 'system' => {
  return typeof value === 'string' && ['light', 'dark', 'system'].includes(value);
};

export const isValidSidebarPosition = (value: any): value is 'left' | 'right' => {
  return typeof value === 'string' && ['left', 'right'].includes(value);
};

// Conversion utility if needed for backward compatibility
export const normalizeFontSize = (value: any): 'sm' | 'md' | 'lg' => {
  if (typeof value === 'number') {
    if (value <= 14) return 'sm';
    if (value >= 18) return 'lg';
    return 'md';
  }
  
  if (typeof value === 'string' && isValidFontSize(value)) {
    return value;
  }
  
  return 'md'; // Default fallback
};

// Settings validator
export const validateAppearanceSettings = (settings: Partial<AppearanceSettings>): string[] => {
  const errors: string[] = [];
  
  if (settings.fontSize !== undefined && !isValidFontSize(settings.fontSize)) {
    errors.push('Invalid font size. Must be "sm", "md", or "lg"');
  }
  
  if (settings.theme !== undefined && !isValidTheme(settings.theme)) {
    errors.push('Invalid theme. Must be "light", "dark", or "system"');
  }
  
  if (settings.sidebarPosition !== undefined && !isValidSidebarPosition(settings.sidebarPosition)) {
    errors.push('Invalid sidebar position. Must be "left" or "right"');
  }
  
  if (settings.accentColor !== undefined) {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(settings.accentColor)) {
      errors.push('Invalid accent color. Must be a valid hex color');
    }
  }
  
  return errors;
};