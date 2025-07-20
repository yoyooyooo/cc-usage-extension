import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import type { PluginSettings, ApiResponse } from '../types';
import { testApiConnection, fetchApiData, extractDataValue } from '../utils/api';
import { autoMatchFields, type AutoMatchResult } from '../utils/fieldMatcher';
import { addHistoricalDataPoint } from '../utils/storage';
import { exportAllData, importAllData, clearAllData } from '../utils/dataManagement';

interface SettingsState {
  // 核心数据状态
  settings: PluginSettings | null;  // null 表示未初始化
  isLoaded: boolean;                // 是否已从存储加载
  
  // API 数据状态
  data: ApiResponse | null;         // API 响应数据
  dataLoading: boolean;             // API 数据加载状态
  error: string | null;             // 错误信息
  
  // UI 状态
  loading: boolean;                 // Store 初始化状态
  saving: boolean;
  testing: boolean;
  
  // API 连接相关
  fieldOptions: string[];
  hasTestedConnection: boolean;
  autoMatchResult: AutoMatchResult;
  
  // Actions - 统一所有数据操作
  initializeStore: () => Promise<void>;     // 从 Chrome storage 初始化
  loadApiData: () => Promise<void>;         // 加载 API 数据
  refreshData: () => Promise<void>;         // 强制刷新数据
  updateSettings: (updates: Partial<PluginSettings>) => void;
  saveSettings: () => Promise<void>;         // 保存到 Chrome storage
  testConnection: () => Promise<void>;
  updateMapping: (field: keyof PluginSettings['mapping'], value: string) => void;
  updateWorkingHours: (hours: number[]) => void;
  updateNotificationEnabled: (enabled: boolean) => void;
  updateQueryInterval: (interval: number[]) => void;
  updateDailyThreshold: (threshold: number[]) => void;
  updateMonthlyThreshold: (threshold: number[]) => void;
  updateAlertThreshold: (field: keyof NonNullable<PluginSettings['alertThresholds']>, value: number[]) => void;
  rematchFields: () => void;
  canSave: () => boolean;
  resetState: () => void;
  
  // 数据管理功能
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
  clearData: () => Promise<void>;
}

// Chrome Storage 操作的内部实现
async function loadSettingsFromStorage(): Promise<PluginSettings> {
  const result = await chrome.storage.sync.get('plugin_settings');
  
  if (result.plugin_settings) {
    return {
      ...defaultSettings,
      ...result.plugin_settings,
      // 确保新字段有默认值
      alertThresholds: {
        ...defaultSettings.alertThresholds,
        ...result.plugin_settings.alertThresholds,
      },
    };
  }
  
  return defaultSettings;
}

async function saveSettingsToStorage(settings: PluginSettings): Promise<void> {
  await chrome.storage.sync.set({ plugin_settings: settings });
}

const defaultSettings: PluginSettings = {
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
  notifications: {
    enabled: false,
    queryInterval: 5,
    thresholds: {
      dailyBudget: 80,
      monthlyBudget: 90,
    },
  },
  alertThresholds: {
    danger: 1.5,
    warning: 1.2,
    caution: 1.0,
    normalMin: 0.8,
  },
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // 初始状态
  settings: null,  // 未初始化
  isLoaded: false,
  
  // API 数据状态
  data: null,
  dataLoading: false,
  error: null,
  
  // UI 状态
  loading: false,
  saving: false,
  testing: false,
  fieldOptions: [],
  hasTestedConnection: false,
  autoMatchResult: {},

  // 从 Chrome storage 初始化 store
  initializeStore: async () => {
    set({ loading: true });
    try {
      const savedSettings = await loadSettingsFromStorage();
      set({ 
        settings: savedSettings, 
        isLoaded: true,
        // 如果已有配置，检查是否需要显示字段选项
        hasTestedConnection: !!(savedSettings.apiUrl && savedSettings.token && 
          Object.values(savedSettings.mapping).some((v) => v))
      });
      
      // 检查配置完整性并设置相应的错误状态或加载数据
      if (!savedSettings.apiUrl || !savedSettings.token) {
        set({ error: '请先在设置页面配置 API' });
      } else {
        // 改进的验证逻辑：至少需要有日度或月度的花费字段之一被映射
        const hasValidMapping = (
          savedSettings.mapping.dailySpent?.trim() || 
          savedSettings.mapping.monthlySpent?.trim()
        ) && (
          savedSettings.mapping.dailyBudget?.trim() || 
          savedSettings.mapping.monthlyBudget?.trim()
        );
        
        if (!hasValidMapping) {
          set({ error: '请先在设置页面配置字段映射' });
        } else {
          // 配置完整，异步加载数据
          setTimeout(() => {
            get().loadApiData();
          }, 0);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('加载配置失败');
      // 即使失败也要设置为已加载，使用默认设置
      set({ 
        settings: defaultSettings, 
        isLoaded: true,
        error: '请先在设置页面配置 API'
      });
    } finally {
      set({ loading: false });
    }
  },

  // 加载 API 数据（带缓存）
  loadApiData: async () => {
    const { settings, isLoaded } = get();
    
    if (!isLoaded || !settings) {
      return;
    }
    
    // 检查配置是否完整
    if (!settings.apiUrl || !settings.token) {
      set({ error: '请先在设置页面配置 API' });
      return;
    }
    
    const hasValidMapping = Object.values(settings.mapping).some(v => v.trim());
    if (!hasValidMapping) {
      set({ error: '请先在设置页面配置字段映射' });
      return;
    }
    
    set({ dataLoading: true, error: null });
    
    try {
      // 获取 API 数据
      const apiData = await fetchApiData(settings);
      set({ data: apiData });
      
      // 保存历史数据点
      try {
        const dailyBudget = extractDataValue(apiData, settings.mapping.dailyBudget) || 0;
        const dailySpent = extractDataValue(apiData, settings.mapping.dailySpent) || 0;
        const monthlyBudget = extractDataValue(apiData, settings.mapping.monthlyBudget) || 0;
        const monthlySpent = extractDataValue(apiData, settings.mapping.monthlySpent) || 0;
        
        await addHistoricalDataPoint({
          dailyBudget: Number(dailyBudget),
          dailySpent: Number(dailySpent),
          monthlyBudget: Number(monthlyBudget),
          monthlySpent: Number(monthlySpent),
        });
      } catch (error) {
        // 静默处理历史数据保存错误
        console.error('Error saving historical data:', error);
      }
      
    } catch (error) {
      console.error('Error loading API data:', error);
      set({ error: error instanceof Error ? error.message : '加载数据失败' });
    } finally {
      set({ dataLoading: false });
    }
  },

  // 强制刷新数据（忽略缓存）
  refreshData: async () => {
    const { settings } = get();
    
    if (!settings) {
      return;
    }
    
    set({ dataLoading: true, error: null });
    
    try {
      // 清除缓存后重新获取数据
      const { clearCache } = await import('../utils/storage');
      await clearCache();
      
      // 重新加载数据
      await get().loadApiData();
    } catch (error) {
      console.error('Error refreshing data:', error);
      set({ error: error instanceof Error ? error.message : '刷新数据失败' });
    }
  },

  // 更新设置（仅内存，不持久化）
  updateSettings: (updates) => {
    const { settings } = get();
    if (!settings) return;
    
    set({
      settings: { ...settings, ...updates }
    });
  },

  // 保存设置到 Chrome storage
  saveSettings: async () => {
    const { settings } = get();
    
    if (!settings || !settings.apiUrl || !settings.token) {
      toast.error('请填写 API URL 和 Token');
      return;
    }

    set({ saving: true });
    try {
      await saveSettingsToStorage(settings);
      
      // 保存成功后，检查配置是否完整，如果完整则自动加载数据
      // 改进的验证逻辑：至少需要有日度或月度的花费字段之一被映射
      const hasSpentMapping = !!(settings.mapping.dailySpent?.trim() || settings.mapping.monthlySpent?.trim());
      const hasBudgetMapping = !!(settings.mapping.dailyBudget?.trim() || settings.mapping.monthlyBudget?.trim());
      const hasValidMapping = hasSpentMapping && hasBudgetMapping;
      
      // 调试信息：记录映射状态
      console.log('字段映射状态检查:', {
        dailySpent: settings.mapping.dailySpent || '未映射',
        dailyBudget: settings.mapping.dailyBudget || '未映射',
        monthlySpent: settings.mapping.monthlySpent || '未映射',
        monthlyBudget: settings.mapping.monthlyBudget || '未映射',
        hasSpentMapping,
        hasBudgetMapping,
        hasValidMapping
      });
      
      if (hasValidMapping) {
        // 异步加载数据，不等待结果
        setTimeout(() => {
          get().loadApiData();
        }, 0);
        toast.success('配置保存成功！正在加载数据...');
      } else {
        if (!hasSpentMapping) {
          toast('配置保存成功！但缺少花费字段映射，请检查日度或月度花费字段。', {
            icon: '⚠️',
            duration: 4000,
          });
        } else if (!hasBudgetMapping) {
          toast('配置保存成功！但缺少预算字段映射，请检查日度或月度预算字段。', {
            icon: '⚠️',
            duration: 4000,
          });
        } else {
          toast.success('配置保存成功！请确保已正确映射预算和花费字段。');
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('保存配置失败');
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  // 测试连接
  testConnection: async () => {
    const { settings } = get();
    
    if (!settings || !settings.apiUrl || !settings.token) {
      toast.error('请填写 API URL 和 Token');
      return;
    }

    set({ testing: true });
    try {
      const result = await testApiConnection(settings.apiUrl, settings.token);

      if (result.success && result.fieldKeys) {
        set({ 
          fieldOptions: result.fieldKeys,
          hasTestedConnection: true 
        });
        
        // 执行自动匹配
        const matchResult = autoMatchFields(result.fieldKeys);
        set({ autoMatchResult: matchResult });
        
        // 自动应用高置信度匹配（70%以上，降低阈值提高匹配成功率）
        const autoAppliedMatches: string[] = [];
        const newMapping = { ...settings.mapping };
        
        Object.entries(matchResult).forEach(([targetField, match]) => {
          if (match && match.confidence >= 70) {
            newMapping[targetField as keyof PluginSettings['mapping']] = match.field;
            autoAppliedMatches.push(`${targetField} → ${match.field}`);
          }
        });
        
        if (autoAppliedMatches.length > 0) {
          set({
            settings: { ...settings, mapping: newMapping }
          });
        }
        
        const matchCount = Object.keys(matchResult).length;
        const autoAppliedCount = autoAppliedMatches.length;
        
        if (matchCount > 0) {
          toast.success(
            `连接成功！发现 ${result.fieldKeys.length} 个字段，智能匹配了 ${matchCount} 个字段` +
            (autoAppliedCount > 0 ? `，自动应用了 ${autoAppliedCount} 个高置信度匹配` : '')
          );
        } else {
          toast.success(`连接成功！发现 ${result.fieldKeys.length} 个可用字段`);
        }
      } else {
        toast.error(result.error || '连接失败');
        set({ 
          hasTestedConnection: false,
          fieldOptions: [],
          autoMatchResult: {}
        });
      }
    } catch (error) {
      toast.error('测试连接时发生错误');
      set({ 
        hasTestedConnection: false,
        fieldOptions: [],
        autoMatchResult: {}
      });
    } finally {
      set({ testing: false });
    }
  },

  // 更新字段映射
  updateMapping: (field, value) => {
    const { settings } = get();
    if (!settings) return;
    
    set({
      settings: {
        ...settings,
        mapping: {
          ...settings.mapping,
          [field]: value,
        },
      },
    });
  },

  // 更新工作时间
  updateWorkingHours: (hours) => {
    const { settings } = get();
    if (!settings || hours.length !== 2) return;
    
    const [start, end] = hours;
    set({
      settings: {
        ...settings,
        workingHours: { start, end },
      },
    });
  },

  // 更新通知开关
  updateNotificationEnabled: (enabled) => {
    const { settings } = get();
    if (!settings) return;
    
    set({
      settings: {
        ...settings,
        notifications: {
          ...settings.notifications,
          enabled,
        },
      },
    });
  },

  // 更新查询间隔
  updateQueryInterval: (interval) => {
    const { settings } = get();
    if (!settings || interval.length !== 1) return;
    
    set({
      settings: {
        ...settings,
        notifications: {
          ...settings.notifications,
          queryInterval: interval[0],
        },
      },
    });
  },

  // 更新日度阈值
  updateDailyThreshold: (threshold) => {
    const { settings } = get();
    if (!settings || threshold.length !== 1) return;
    
    set({
      settings: {
        ...settings,
        notifications: {
          ...settings.notifications,
          thresholds: {
            ...settings.notifications.thresholds,
            dailyBudget: threshold[0],
          },
        },
      },
    });
  },

  // 更新月度阈值
  updateMonthlyThreshold: (threshold) => {
    const { settings } = get();
    if (!settings || threshold.length !== 1) return;
    
    set({
      settings: {
        ...settings,
        notifications: {
          ...settings.notifications,
          thresholds: {
            ...settings.notifications.thresholds,
            monthlyBudget: threshold[0],
          },
        },
      },
    });
  },

  // 更新警示阈值
  updateAlertThreshold: (field, value) => {
    const { settings } = get();
    if (!settings || value.length !== 1) return;
    
    set({
      settings: {
        ...settings,
        alertThresholds: {
          ...settings.alertThresholds!,
          [field]: value[0],
        },
      },
    });
  },

  // 重新匹配字段
  rematchFields: () => {
    const { fieldOptions, settings } = get();
    
    if (fieldOptions.length === 0) {
      toast.error('请先测试 API 连接');
      return;
    }
    
    if (!settings) return;

    const matchResult = autoMatchFields(fieldOptions);
    set({ autoMatchResult: matchResult });

    // 应用所有匹配结果（不管置信度）
    const newMapping = { ...settings.mapping };
    Object.entries(matchResult).forEach(([targetField, match]) => {
      if (match) {
        newMapping[targetField as keyof PluginSettings['mapping']] = match.field;
      }
    });

    set({
      settings: { ...settings, mapping: newMapping }
    });

    const matchCount = Object.keys(matchResult).length;
    if (matchCount > 0) {
      toast.success(`重新匹配完成！匹配了 ${matchCount} 个字段`);
    } else {
      toast('未找到合适的字段匹配');
    }
  },

  // 检查是否可以保存
  canSave: () => {
    const { settings } = get();
    return !!(settings?.apiUrl && settings?.token);
  },

  // 重置状态
  resetState: () => {
    set({
      settings: null,
      isLoaded: false,
      data: null,
      dataLoading: false,
      error: null,
      loading: false,
      saving: false,
      testing: false,
      fieldOptions: [],
      hasTestedConnection: false,
      autoMatchResult: {},
    });
  },

  // 导出数据
  exportData: async () => {
    try {
      await exportAllData();
      toast.success('数据导出成功！');
    } catch (error) {
      console.error('导出数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '导出数据失败';
      toast.error(errorMessage);
    }
  },

  // 导入数据
  importData: async (file: File) => {
    try {
      await importAllData(file);
      // 重新初始化 store 以加载新数据
      await get().initializeStore();
      toast.success('数据导入成功！');
    } catch (error) {
      console.error('导入数据失败:', error);
      toast.error(error instanceof Error ? error.message : '导入数据失败');
    }
  },

  // 清空数据
  clearData: async () => {
    try {
      await clearAllData();
      get().resetState();
      await get().initializeStore();
      toast.success('数据已清空！');
    } catch (error) {
      console.error('清空数据失败:', error);
      toast.error(error instanceof Error ? error.message : '清空数据失败');
    }
  },
}));