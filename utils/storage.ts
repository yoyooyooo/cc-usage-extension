import type { PluginSettings, CachedData } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'plugin_settings',
  CACHE: 'api_cache',
} as const;

export const defaultSettings: PluginSettings = {
  apiUrl: '',
  token: '',
  workingHours: {
    start: 9,
    end: 24,
  },
  mapping: {
    monthlyBudget: '',
    monthlySpent: '',
    dailyBudget: '',
    dailySpent: '',
  },
};

export async function getSettings(): Promise<PluginSettings> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
    const saved = result[STORAGE_KEYS.SETTINGS];
    
    if (!saved) {
      return defaultSettings;
    }
    
    // 确保向后兼容：如果现有设置没有 workingHours，则添加默认值
    const settings: PluginSettings = {
      ...defaultSettings,
      ...saved,
      workingHours: saved.workingHours || defaultSettings.workingHours,
    };
    
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
}

export async function saveSettings(settings: PluginSettings): Promise<void> {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export async function getCachedData(): Promise<CachedData | null> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.CACHE);
    const cached = result[STORAGE_KEYS.CACHE];
    
    if (!cached) return null;
    
    // 检查缓存是否过期（60秒）
    const now = Date.now();
    const cacheAge = now - cached.timestamp;
    const CACHE_DURATION = 60 * 1000; // 60秒
    
    if (cacheAge > CACHE_DURATION) {
      // 清除过期缓存
      await chrome.storage.sync.remove(STORAGE_KEYS.CACHE);
      return null;
    }
    
    return cached;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

export async function setCachedData(data: any): Promise<void> {
  try {
    const cachedData: CachedData = {
      data,
      timestamp: Date.now(),
    };
    await chrome.storage.sync.set({ [STORAGE_KEYS.CACHE]: cachedData });
  } catch (error) {
    console.error('Error setting cached data:', error);
    throw error;
  }
}

export async function clearCache(): Promise<void> {
  try {
    await chrome.storage.sync.remove(STORAGE_KEYS.CACHE);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}