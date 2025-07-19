import type { NotificationStatus } from './storage';
import { getNotificationStatus, setNotificationStatus } from './storage';

// 通知类型枚举
export enum NotificationType {
  DAILY_BUDGET = 'dailyBudget',
  MONTHLY_BUDGET = 'monthlyBudget',
}

// 通知配置接口
export interface NotificationConfig {
  type: NotificationType;
  title: string;
  message: string;
  iconUrl?: string;
}

// 检查通知权限
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    if (!chrome.notifications) {
      console.warn('Notifications API not available');
      return false;
    }
    
    // 在 Manifest V3 中，权限在 manifest.json 中声明后即可使用
    return true;
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
}

// 发送通知
export async function sendNotification(config: NotificationConfig): Promise<boolean> {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      console.warn('No notification permission');
      return false;
    }

    // 检查是否最近已经发送过同类型的通知
    const canSend = await canSendNotification(config.type);
    if (!canSend) {
      console.log(`Notification of type ${config.type} was recently sent, skipping`);
      return false;
    }

    const notificationId = `cc-usage-${config.type}-${Date.now()}`;
    
    const notificationOptions = {
      type: 'basic' as const,
      iconUrl: config.iconUrl || chrome.runtime.getURL('icon/128.png'),
      title: config.title,
      message: config.message,
      requireInteraction: false, // 通知会自动消失
    };

    chrome.notifications.create(notificationId, notificationOptions, () => {
      // 创建通知后的回调
      if (chrome.runtime.lastError) {
        console.error('Error creating notification:', chrome.runtime.lastError);
      }
    });
    
    // 记录通知状态
    await recordNotificationSent(config.type);
    
    console.log(`Notification sent: ${config.type}`);
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

// 检查是否可以发送通知（避免重复）
async function canSendNotification(type: NotificationType): Promise<boolean> {
  try {
    const status = await getNotificationStatus();
    const now = Date.now();
    
    // 如果距离上次通知时间不足30分钟，不重复发送
    const timeSinceLastNotification = now - status.lastNotificationTime;
    const minInterval = 30 * 60 * 1000; // 30分钟
    
    if (timeSinceLastNotification < minInterval) {
      return false;
    }
    
    // 检查特定类型的通知是否已发送
    switch (type) {
      case NotificationType.DAILY_BUDGET:
        return !status.dailyBudget;
      case NotificationType.MONTHLY_BUDGET:
        return !status.monthlyBudget;
      default:
        return true;
    }
  } catch (error) {
    console.error('Error checking notification eligibility:', error);
    return true; // 出错时允许发送
  }
}

// 记录通知已发送
async function recordNotificationSent(type: NotificationType): Promise<void> {
  try {
    const status = await getNotificationStatus();
    const updatedStatus: NotificationStatus = {
      ...status,
      lastNotificationTime: Date.now(),
    };
    
    switch (type) {
      case NotificationType.DAILY_BUDGET:
        updatedStatus.dailyBudget = true;
        break;
      case NotificationType.MONTHLY_BUDGET:
        updatedStatus.monthlyBudget = true;
        break;
    }
    
    await setNotificationStatus(updatedStatus);
  } catch (error) {
    console.error('Error recording notification status:', error);
  }
}

// 创建预算警告通知
export function createBudgetWarningNotification(
  type: NotificationType,
  usagePercentage: number,
  threshold: number,
  budgetType: '日度' | '月度'
): NotificationConfig {
  const title = `💰 ${budgetType}预算警告`;
  
  let message: string;
  if (usagePercentage >= 100) {
    message = `您的${budgetType}预算已超支！当前使用率：${usagePercentage.toFixed(1)}%`;
  } else {
    message = `您的${budgetType}预算使用率已达到 ${usagePercentage.toFixed(1)}%，超过设定阈值 ${threshold}%`;
  }
  
  return {
    type,
    title,
    message,
  };
}

// 重置每日通知状态（在新的一天开始时调用）
export async function resetDailyNotificationStatus(): Promise<void> {
  try {
    const status = await getNotificationStatus();
    const updatedStatus: NotificationStatus = {
      ...status,
      dailyBudget: false,
    };
    
    await setNotificationStatus(updatedStatus);
    console.log('Daily notification status reset');
  } catch (error) {
    console.error('Error resetting daily notification status:', error);
  }
}

// 重置月度通知状态（在新的月份开始时调用）
export async function resetMonthlyNotificationStatus(): Promise<void> {
  try {
    const status = await getNotificationStatus();
    const updatedStatus: NotificationStatus = {
      ...status,
      monthlyBudget: false,
    };
    
    await setNotificationStatus(updatedStatus);
    console.log('Monthly notification status reset');
  } catch (error) {
    console.error('Error resetting monthly notification status:', error);
  }
}