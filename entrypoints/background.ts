// Background script 现在需要直接访问 Chrome storage，因为不能使用 Zustand store
import { fetchApiData } from '../utils/api';
import type { PluginSettings } from '../types';
import { 
  sendNotification, 
  createBudgetWarningNotification, 
  NotificationType,
  resetDailyNotificationStatus,
  resetMonthlyNotificationStatus 
} from '../utils/notification';

// Background script 专用的设置获取函数
async function getSettings(): Promise<PluginSettings> {
  const defaultSettings: PluginSettings = {
    apiUrl: '',
    token: '',
    workingHours: { start: 9, end: 24 },
    mapping: { monthlyBudget: '', monthlySpent: '', dailyBudget: '', dailySpent: '' },
    notifications: { enabled: false, queryInterval: 5, thresholds: { dailyBudget: 80, monthlyBudget: 90 } },
    alertThresholds: { danger: 1.5, warning: 1.2, caution: 1.0, normalMin: 0.8 },
  };

  try {
    const result = await chrome.storage.sync.get('plugin_settings');
    if (result.plugin_settings) {
      return { ...defaultSettings, ...result.plugin_settings };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error loading settings in background:', error);
    return defaultSettings;
  }
}

const ALARM_NAME = 'budget-check';

export default defineBackground(() => {
  console.log('CC Usage Monitor background script started', { id: browser.runtime.id });

  // 扩展安装或启动时的初始化
  browser.runtime.onStartup.addListener(handleStartup);
  browser.runtime.onInstalled.addListener(handleInstalled);

  // 监听定时器事件
  if (chrome.alarms) {
    chrome.alarms.onAlarm.addListener(handleAlarmTrigger);
  }

  // 监听设置变更，更新定时器
  if (chrome.storage) {
    chrome.storage.onChanged.addListener(handleStorageChange);
  }
});

// 处理扩展启动
async function handleStartup(): Promise<void> {
  console.log('Extension startup');
  await setupBudgetMonitoring();
  await checkForNewDay();
}

// 处理扩展安装
async function handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    console.log('First install - setting up default monitoring');
  }
  
  await setupBudgetMonitoring();
}

// 设置预算监控
async function setupBudgetMonitoring(): Promise<void> {
  try {
    const settings = await getSettings();
    
    if (!settings.notifications.enabled) {
      console.log('Notifications disabled, clearing existing alarms');
      await clearBudgetAlarm();
      return;
    }

    if (!settings.apiUrl || !settings.token) {
      console.log('API not configured, skipping alarm setup');
      return;
    }

    const hasValidMapping = Object.values(settings.mapping).some(v => v.trim());
    if (!hasValidMapping) {
      console.log('Field mapping not configured, skipping alarm setup');
      return;
    }

    await createBudgetAlarm(settings.notifications.queryInterval);
    console.log(`Budget monitoring alarm set for ${settings.notifications.queryInterval} minutes`);
  } catch (error) {
    console.error('Error setting up budget monitoring:', error);
  }
}

// 创建定时器
async function createBudgetAlarm(intervalMinutes: number): Promise<void> {
  try {
    // 清除现有的定时器
    await clearBudgetAlarm();
    
    // 创建新的定时器
    if (chrome.alarms) {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: intervalMinutes,
        periodInMinutes: intervalMinutes,
      });
      console.log(`Created alarm with ${intervalMinutes} minute interval`);
    }
  } catch (error) {
    console.error('Error creating budget alarm:', error);
  }
}

// 清除定时器
async function clearBudgetAlarm(): Promise<void> {
  try {
    if (chrome.alarms) {
      chrome.alarms.clear(ALARM_NAME);
      console.log('Budget alarm cleared');
    }
  } catch (error) {
    console.error('Error clearing budget alarm:', error);
  }
}

// 处理定时器触发
async function handleAlarmTrigger(alarm: chrome.alarms.Alarm): Promise<void> {
  if (alarm.name === ALARM_NAME) {
    console.log('Budget check alarm triggered');
    await performBudgetCheck();
  }
}

// 执行预算检查
async function performBudgetCheck(): Promise<void> {
  try {
    const settings = await getSettings();
    
    if (!settings.notifications.enabled) {
      console.log('Notifications disabled, skipping check');
      return;
    }

    // 获取最新数据
    const apiData = await fetchApiData(settings);
    if (!apiData) {
      console.log('Failed to fetch API data');
      return;
    }

    // 提取预算和使用数据
    const monthlyBudget = getFieldValue(apiData, settings.mapping.monthlyBudget);
    const monthlySpent = getFieldValue(apiData, settings.mapping.monthlySpent);
    const dailyBudget = getFieldValue(apiData, settings.mapping.dailyBudget);
    const dailySpent = getFieldValue(apiData, settings.mapping.dailySpent);

    // 检查日度预算
    if (dailyBudget > 0 && dailySpent >= 0) {
      const dailyUsagePercentage = (dailySpent / dailyBudget) * 100;
      
      if (dailyUsagePercentage >= settings.notifications.thresholds.dailyBudget) {
        const notification = createBudgetWarningNotification(
          NotificationType.DAILY_BUDGET,
          dailyUsagePercentage,
          settings.notifications.thresholds.dailyBudget,
          '日度'
        );
        
        await sendNotification(notification);
      }
    }

    // 检查月度预算
    if (monthlyBudget > 0 && monthlySpent >= 0) {
      const monthlyUsagePercentage = (monthlySpent / monthlyBudget) * 100;
      
      if (monthlyUsagePercentage >= settings.notifications.thresholds.monthlyBudget) {
        const notification = createBudgetWarningNotification(
          NotificationType.MONTHLY_BUDGET,
          monthlyUsagePercentage,
          settings.notifications.thresholds.monthlyBudget,
          '月度'
        );
        
        await sendNotification(notification);
      }
    }

  } catch (error) {
    console.error('Error performing budget check:', error);
  }
}

// 从 API 响应中提取字段值
function getFieldValue(data: any, fieldPath: string): number {
  try {
    if (!fieldPath || !data) return 0;
    
    // 支持嵌套字段，如 "budget.monthly"
    const keys = fieldPath.split('.');
    let value = data;
    
    for (const key of keys) {
      value = value[key];
      if (value === undefined || value === null) {
        return 0;
      }
    }
    
    const numValue = Number(value);
    return isNaN(numValue) ? 0 : numValue;
  } catch (error) {
    console.error('Error extracting field value:', error);
    return 0;
  }
}

// 处理存储变更事件
async function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
): Promise<void> {
  if (areaName !== 'sync') return;
  
  const settingsKey = 'plugin_settings';
  if (changes[settingsKey]) {
    console.log('Settings changed, updating alarm');
    await setupBudgetMonitoring();
  }
}

// 检查是否为新的一天/月，重置通知状态
async function checkForNewDay(): Promise<void> {
  try {
    const now = new Date();
    const today = now.toDateString();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    
    // 检查是否存储了上次检查的日期
    const result = await chrome.storage.local.get(['lastCheckDate', 'lastCheckMonth']);
    const lastCheckDate = result.lastCheckDate;
    const lastCheckMonth = result.lastCheckMonth;
    
    // 如果是新的一天，重置日度通知状态
    if (lastCheckDate !== today) {
      await resetDailyNotificationStatus();
      await chrome.storage.local.set({ lastCheckDate: today });
      console.log('New day detected, daily notification status reset');
    }
    
    // 如果是新的月份，重置月度通知状态
    if (lastCheckMonth !== currentMonth) {
      await resetMonthlyNotificationStatus();
      await chrome.storage.local.set({ lastCheckMonth: currentMonth });
      console.log('New month detected, monthly notification status reset');
    }
  } catch (error) {
    console.error('Error checking for new day/month:', error);
  }
}
