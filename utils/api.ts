import type { PluginSettings, ApiResponse, ApiTestResult } from '../types';
import { getCachedData, setCachedData } from './storage';

// 请求管理器，防止重复请求和实现请求去重
class ApiRequestManager {
  private pendingRequests = new Map<string, Promise<ApiResponse>>();
  private abortControllers = new Map<string, AbortController>();

  private generateRequestKey(settings: PluginSettings): string {
    return `${settings.apiUrl}_${settings.token}`;
  }

  async fetchApiData(settings: PluginSettings): Promise<ApiResponse> {
    const requestKey = this.generateRequestKey(settings);

    // 如果有相同的请求正在进行，直接返回该 Promise
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    // 取消之前的同类请求
    if (this.abortControllers.has(requestKey)) {
      this.abortControllers.get(requestKey)!.abort();
    }

    // 创建新的 AbortController
    const abortController = new AbortController();
    this.abortControllers.set(requestKey, abortController);

    // 首先尝试从缓存获取数据
    const cached = await getCachedData();
    if (cached) {
      this.cleanup(requestKey);
      return cached.data;
    }

    // 创建新的请求 Promise
    const requestPromise = this.performApiRequest(settings, abortController.signal);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // 请求完成后清理
      this.cleanup(requestKey);
    }
  }

  private async performApiRequest(settings: PluginSettings, signal: AbortSignal): Promise<ApiResponse> {
    if (!settings.apiUrl || !settings.token) {
      throw new Error('API URL 或 Token 未配置');
    }

    const response = await fetch(settings.apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.token}`,
        'Content-Type': 'application/json',
      },
      signal, // 传入 AbortSignal
    });

    if (signal.aborted) {
      throw new Error('请求已取消');
    }

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 缓存数据
    await setCachedData(data);
    
    return data;
  }

  private cleanup(requestKey: string): void {
    this.pendingRequests.delete(requestKey);
    this.abortControllers.delete(requestKey);
  }

  // 清理所有pending请求
  abortAllRequests(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.pendingRequests.clear();
    this.abortControllers.clear();
  }
}

// 创建全局实例
const apiRequestManager = new ApiRequestManager();

export async function testApiConnection(apiUrl: string, token: string): Promise<ApiTestResult> {
  try {
    if (!apiUrl || !token) {
      return {
        success: false,
        error: 'API URL 和 Token 不能为空',
      };
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `API 请求失败: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    // 提取所有可用的字段键
    const fieldKeys = extractFieldKeys(data);
    
    return {
      success: true,
      data,
      fieldKeys,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

export async function fetchApiData(settings: PluginSettings): Promise<ApiResponse> {
  return apiRequestManager.fetchApiData(settings);
}

export function extractDataValue(data: ApiResponse, fieldPath: string): number | string {
  if (!fieldPath || !data) return 0;
  
  // 支持嵌套字段路径，如 "user.budget.monthly"
  const keys = fieldPath.split('.');
  let value: any = data;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return 0;
    }
  }
  
  // 尝试转换为数字，如果失败则返回原始值
  if (typeof value === 'string') {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? value : numValue;
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  return value || 0;
}

export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return String(value);
  }
  
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

function extractFieldKeys(data: any, prefix = '', keys: Set<string> = new Set()): string[] {
  if (!data || typeof data !== 'object') {
    return Array.from(keys);
  }
  
  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.add(fullKey);
    
    // 递归处理嵌套对象，但限制深度避免过深
    if (value && typeof value === 'object' && !Array.isArray(value) && prefix.split('.').length < 3) {
      extractFieldKeys(value, fullKey, keys);
    }
  }
  
  return Array.from(keys).sort();
}