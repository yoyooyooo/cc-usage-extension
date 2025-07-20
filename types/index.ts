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

// 数据导出相关类型
export interface ExportData {
  exportVersion: string;
  exportDate: string;
  settings: PluginSettings;
  historicalData: HistoricalDataPoint[];
  metadata: {
    totalDataPoints: number;
    dateRange: {
      start: string;
      end: string;
    };
    exportedAt: number;
  };
}

// 热力图相关类型
export interface HeatmapDataPoint {
  day: number;          // 0-6 (周日到周六)
  hour: number;         // 0-23 (24小时制)
  value: number;        // 消费金额
  intensity: number;    // 热力强度 0-1 (用于颜色映射)
  timestamp: number;    // 具体时间戳
  hasData: boolean;     // 是否有实际数据
  dayLabel: string;     // 星期标签，如 "周一"
  hourLabel: string;    // 小时标签，如 "09:00"
}

export interface WeeklyHeatmapData {
  periodStart: Date;    // 时间段开始日期
  periodEnd: Date;      // 时间段结束日期
  data: HeatmapDataPoint[][]; // [day][hour] 二维数组结构
  maxValue: number;     // 最大消费值
  minValue: number;     // 最小消费值
  totalPoints: number;  // 总数据点数
  hasAnyData: boolean;  // 是否有任何数据
  dayCount: number;     // 实际天数（7天/14天/30天）
  dailyLabels: string[]; // 每日标签数组
}

export interface HeatmapSettings {
  timeRange: 'week' | '2weeks' | 'month'; // 时间范围
  colorScheme: 'blue' | 'green' | 'red';  // 颜色方案
  showWeekends: boolean;  // 是否显示周末
  showEmptyHours: boolean; // 是否显示无数据的小时
}