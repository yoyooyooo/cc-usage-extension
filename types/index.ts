export interface PluginSettings {
  apiUrl: string;
  token: string;
  workingHours: {
    start: number; // 小时数，如 9 表示 09:00
    end: number;   // 小时数，如 24 表示 24:00
  };
  mapping: {
    monthlyBudget: string;
    monthlySpent: string;
    dailyBudget: string;
    dailySpent: string;
  };
  notifications: {
    enabled: boolean;
    queryInterval: number; // 分钟，默认5
    thresholds: {
      dailyBudget: number;   // 百分比，默认80
      monthlyBudget: number; // 百分比，默认90
    };
  };
  alertThresholds?: {
    danger: number;      // 危险阈值，默认1.5
    warning: number;     // 警告阈值，默认1.2
    caution: number;     // 谨慎阈值，默认1.0
    normalMin: number;   // 正常范围最小值，默认0.8
  };
}

export interface ApiResponse {
  [key: string]: any;
}

export interface CachedData {
  data: ApiResponse;
  timestamp: number;
}

export interface DataCardItem {
  label: string;
  value: number | string;
  key: keyof PluginSettings['mapping'];
}

export interface ApiTestResult {
  success: boolean;
  data?: ApiResponse;
  error?: string;
  fieldKeys?: string[];
}

// 历史数据相关类型
export interface HistoricalDataPoint {
  timestamp: number;
  dailyBudget: number;
  dailySpent: number;
  monthlyBudget: number;
  monthlySpent: number;
}

export interface HistoricalData {
  data: HistoricalDataPoint[];
  lastUpdated: number;
}