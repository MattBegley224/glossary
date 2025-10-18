import { Platform } from 'react-native';

const FONT_SIZE_KEY = '@app:fontSize';

const storage = {
  getItem: (key: string): string | null => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    }
  },
};

export const preferences = {
  getFontSizeMultiplier(): number {
    try {
      const value = storage.getItem(FONT_SIZE_KEY);
      return value ? parseFloat(value) : 1;
    } catch (error) {
      console.error('Error loading font size preference:', error);
      return 1;
    }
  },

  setFontSizeMultiplier(multiplier: number): void {
    try {
      storage.setItem(FONT_SIZE_KEY, multiplier.toString());
    } catch (error) {
      console.error('Error saving font size preference:', error);
    }
  },
};
