import type { PluginSettings, HistoricalData, ExportData } from '../types';
import { getHistoricalData, clearHistoricalData } from './storage';

const EXPORT_VERSION = '1.0.0';

/**
 * 导出所有数据为 JSON 文件
 */
export async function exportAllData(): Promise<void> {
  try {
    // 获取设置数据
    const settingsResult = await chrome.storage.sync.get('plugin_settings');
    const settings: PluginSettings = settingsResult.plugin_settings;
    
    if (!settings) {
      throw new Error('未找到设置数据');
    }

    // 获取历史数据
    const historicalData: HistoricalData = await getHistoricalData();
    
    // 计算数据范围
    const dataPoints = historicalData.data;
    const dateRange = dataPoints.length > 0 ? {
      start: new Date(Math.min(...dataPoints.map(p => p.timestamp))).toISOString(),
      end: new Date(Math.max(...dataPoints.map(p => p.timestamp))).toISOString(),
    } : {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    };

    // 构建导出数据
    const exportData: ExportData = {
      exportVersion: EXPORT_VERSION,
      exportDate: new Date().toISOString().split('T')[0],
      settings,
      historicalData: dataPoints,
      metadata: {
        totalDataPoints: dataPoints.length,
        dateRange,
        exportedAt: Date.now(),
      },
    };

    // 转换为 JSON 字符串
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // 创建 Blob 和下载链接
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `cc-usage-backup-${timestamp}.json`;
    
    // 触发下载
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理 URL
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('导出数据失败:', error);
    throw new Error(`导出数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 从 JSON 文件导入数据
 */
export async function importAllData(file: File): Promise<void> {
  try {
    // 读取文件内容
    const fileContent = await readFileAsText(file);
    
    // 解析 JSON
    let importData: ExportData;
    try {
      importData = JSON.parse(fileContent);
    } catch (error) {
      throw new Error('文件格式错误，请选择有效的 JSON 文件');
    }
    
    // 验证数据格式
    if (!validateImportData(importData)) {
      throw new Error('数据格式不符合要求，请确保是从本应用导出的数据文件');
    }
    
    // 保存设置数据到 chrome.storage.sync
    await chrome.storage.sync.set({ plugin_settings: importData.settings });
    
    // 保存历史数据到 chrome.storage.local
    const historicalData: HistoricalData = {
      data: importData.historicalData,
      lastUpdated: Date.now(),
    };
    await chrome.storage.local.set({ historical_data: historicalData });
    
    // 清除缓存
    await chrome.storage.sync.remove('api_cache');
    
  } catch (error) {
    console.error('导入数据失败:', error);
    throw new Error(`导入数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 清空所有数据
 */
export async function clearAllData(): Promise<void> {
  try {
    // 清空设置数据
    await chrome.storage.sync.remove('plugin_settings');
    
    // 清空历史数据
    await clearHistoricalData();
    
    // 清空缓存
    await chrome.storage.sync.remove('api_cache');
    
    // 清空通知状态
    await chrome.storage.sync.remove('notification_status');
    
  } catch (error) {
    console.error('清空数据失败:', error);
    throw new Error(`清空数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证导入数据的格式
 */
function validateImportData(data: any): data is ExportData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // 检查必要的顶级字段
  if (!data.exportVersion || !data.exportDate || !data.settings || !data.metadata) {
    return false;
  }
  
  // 验证设置数据结构
  const settings = data.settings;
  if (!settings.apiUrl || 
      !settings.hasOwnProperty('token') || 
      !settings.workingHours || 
      !settings.mapping || 
      !settings.notifications) {
    return false;
  }
  
  // 验证映射字段
  const mapping = settings.mapping;
  if (!mapping.hasOwnProperty('monthlyBudget') ||
      !mapping.hasOwnProperty('monthlySpent') ||
      !mapping.hasOwnProperty('dailyBudget') ||
      !mapping.hasOwnProperty('dailySpent')) {
    return false;
  }
  
  // 验证工作时间
  if (typeof settings.workingHours.start !== 'number' ||
      typeof settings.workingHours.end !== 'number') {
    return false;
  }
  
  // 验证通知配置
  const notifications = settings.notifications;
  if (typeof notifications.enabled !== 'boolean' ||
      typeof notifications.queryInterval !== 'number' ||
      !notifications.thresholds) {
    return false;
  }
  
  // 验证历史数据（如果存在）
  if (data.historicalData && Array.isArray(data.historicalData)) {
    for (const point of data.historicalData) {
      if (typeof point.timestamp !== 'number' ||
          typeof point.dailyBudget !== 'number' ||
          typeof point.dailySpent !== 'number' ||
          typeof point.monthlyBudget !== 'number' ||
          typeof point.monthlySpent !== 'number') {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * 读取文件内容为文本
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('文件读取失败'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取出错'));
    };
    
    reader.readAsText(file, 'utf-8');
  });
}