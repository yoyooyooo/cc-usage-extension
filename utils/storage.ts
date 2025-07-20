import type { CachedData, HistoricalData, HistoricalDataPoint } from '../types';
import { browser } from 'wxt/browser';

const STORAGE_KEYS = {
  CACHE: 'api_cache',
  NOTIFICATION_STATUS: 'notification_status',
  HISTORICAL_DATA: 'historical_data',
} as const;

// 注意：设置相关的函数已移至 stores/settingsStore.ts 中统一管理

export async function getCachedData(): Promise<CachedData | null> {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEYS.CACHE);
    const cached = result[STORAGE_KEYS.CACHE];
    
    if (!cached) return null;
    
    // 延长缓存时间到 5 分钟，减少不必要的 API 请求
    const now = Date.now();
    const cacheAge = now - cached.timestamp;
    const CACHE_DURATION = 5 * 60 * 1000; // 5分钟
    
    if (cacheAge > CACHE_DURATION) {
      // 清除过期缓存
      await browser.storage.sync.remove(STORAGE_KEYS.CACHE);
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
    await browser.storage.sync.set({ [STORAGE_KEYS.CACHE]: cachedData });
  } catch (error) {
    console.error('Error setting cached data:', error);
    throw error;
  }
}

export async function clearCache(): Promise<void> {
  try {
    await browser.storage.sync.remove(STORAGE_KEYS.CACHE);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

// 通知状态管理
export interface NotificationStatus {
  dailyBudget: boolean;
  monthlyBudget: boolean;
  lastNotificationTime: number;
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEYS.NOTIFICATION_STATUS);
    const status = result[STORAGE_KEYS.NOTIFICATION_STATUS];
    
    if (!status) {
      return {
        dailyBudget: false,
        monthlyBudget: false,
        lastNotificationTime: 0,
      };
    }
    
    return status;
  } catch (error) {
    console.error('Error getting notification status:', error);
    return {
      dailyBudget: false,
      monthlyBudget: false,
      lastNotificationTime: 0,
    };
  }
}

export async function setNotificationStatus(status: NotificationStatus): Promise<void> {
  try {
    await browser.storage.sync.set({ [STORAGE_KEYS.NOTIFICATION_STATUS]: status });
  } catch (error) {
    console.error('Error setting notification status:', error);
    throw error;
  }
}

export async function resetNotificationStatus(): Promise<void> {
  try {
    await browser.storage.sync.remove(STORAGE_KEYS.NOTIFICATION_STATUS);
  } catch (error) {
    console.error('Error resetting notification status:', error);
  }
}

// 历史数据管理
const MAX_HISTORICAL_DAYS = 30; // 保留最近30天的数据
const MAX_DATA_POINTS_PER_DAY = 288; // 每天最多保留288个数据点（5分钟一个）
const DATA_DEDUP_INTERVAL = 5 * 60 * 1000; // 数据去重间隔：5分钟（用于计算真实消费速率）

export async function getHistoricalData(): Promise<HistoricalData> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.HISTORICAL_DATA);
    const data = result[STORAGE_KEYS.HISTORICAL_DATA];
    
    if (!data) {
      return {
        data: [],
        lastUpdated: 0,
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error getting historical data:', error);
    return {
      data: [],
      lastUpdated: 0,
    };
  }
}

export async function addHistoricalDataPoint(point: Omit<HistoricalDataPoint, 'timestamp'>): Promise<void> {
  try {
    const historical = await getHistoricalData();
    const now = Date.now();
    
    // 检查是否在5分钟内已经有数据点（从1小时改为5分钟）
    const fiveMinutesAgo = now - DATA_DEDUP_INTERVAL;
    const recentPoint = historical.data.find(p => p.timestamp > fiveMinutesAgo);
    
    if (recentPoint) {
      // 更新现有数据点而不是添加新的
      recentPoint.dailyBudget = point.dailyBudget;
      recentPoint.dailySpent = point.dailySpent;
      recentPoint.monthlyBudget = point.monthlyBudget;
      recentPoint.monthlySpent = point.monthlySpent;
    } else {
      // 添加新数据点
      historical.data.push({
        ...point,
        timestamp: now,
      });
    }
    
    // 清理旧数据
    const cutoffTime = now - (MAX_HISTORICAL_DAYS * 24 * 60 * 60 * 1000);
    historical.data = historical.data.filter(p => p.timestamp > cutoffTime);
    
    // 限制每天的数据点数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    const todayData = historical.data.filter(p => p.timestamp >= todayTimestamp);
    
    if (todayData.length > MAX_DATA_POINTS_PER_DAY) {
      // 保留最新的 MAX_DATA_POINTS_PER_DAY 个数据点
      const otherData = historical.data.filter(p => p.timestamp < todayTimestamp);
      const keepData = todayData.slice(-MAX_DATA_POINTS_PER_DAY);
      historical.data = [...otherData, ...keepData];
    }
    
    // 按时间戳排序
    historical.data.sort((a, b) => a.timestamp - b.timestamp);
    
    // 更新最后更新时间
    historical.lastUpdated = now;
    
    // 保存到 storage.local（容量更大）
    await browser.storage.local.set({ [STORAGE_KEYS.HISTORICAL_DATA]: historical });
  } catch (error) {
    console.error('Error adding historical data point:', error);
    throw error;
  }
}

export async function clearHistoricalData(): Promise<void> {
  try {
    await browser.storage.local.remove(STORAGE_KEYS.HISTORICAL_DATA);
  } catch (error) {
    console.error('Error clearing historical data:', error);
  }
}

export async function getHistoricalDataForPeriod(days: number): Promise<HistoricalDataPoint[]> {
  try {
    const historical = await getHistoricalData();
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    return historical.data.filter(p => p.timestamp > cutoffTime);
  } catch (error) {
    console.error('Error getting historical data for period:', error);
    return [];
  }
}