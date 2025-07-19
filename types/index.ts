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