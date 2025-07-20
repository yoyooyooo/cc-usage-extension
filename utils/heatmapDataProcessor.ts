import type { HistoricalDataPoint, HeatmapDataPoint, WeeklyHeatmapData, HeatmapSettings } from '../types';

/**
 * 安全的数值处理函数，避免 NaN 和 Infinity
 */
const safeNumber = (value: any, defaultValue = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

/**
 * 获取星期标签
 */
const getDayLabel = (day: number): string => {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return labels[day] || '未知';
};

/**
 * 获取小时标签
 */
const getHourLabel = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

/**
 * 获取本周的开始和结束日期
 */
const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  const day = start.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
  start.setDate(start.getDate() - day); // 设置为本周周日
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6); // 本周周六
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * 根据时间范围获取日期范围
 */
const getDateRange = (centerDate: Date, timeRange: HeatmapSettings['timeRange']): { start: Date; end: Date } => {
  const end = new Date(centerDate);
  end.setHours(23, 59, 59, 999);

  const start = new Date(centerDate);
  start.setHours(0, 0, 0, 0);

  switch (timeRange) {
    case 'week':
      return getWeekRange(centerDate);
    case '2weeks':
      start.setDate(start.getDate() - 13);
      break;
    case 'month':
      start.setDate(start.getDate() - 29);
      break;
    default:
      return getWeekRange(centerDate);
  }

  return { start, end };
};

/**
 * 初始化空的热力图数据结构
 */
const initializeEmptyHeatmapData = (periodStart: Date, dayCount: number): HeatmapDataPoint[][] => {
  const data: HeatmapDataPoint[][] = [];

  for (let day = 0; day < dayCount; day++) {
    data[day] = [];
    for (let hour = 0; hour < 24; hour++) {
      const currentDate = new Date(periodStart);
      currentDate.setDate(periodStart.getDate() + day);
      currentDate.setHours(hour, 0, 0, 0);

      data[day][hour] = {
        day,
        hour,
        value: 0,
        intensity: 0,
        timestamp: currentDate.getTime(),
        hasData: false,
        dayLabel: getDayLabel(currentDate.getDay()),
        hourLabel: getHourLabel(hour),
      };
    }
  }

  return data;
};

/**
 * 计算消费强度 (0-1 范围)
 */
const calculateIntensity = (value: number, minValue: number, maxValue: number): number => {
  if (maxValue === minValue) return value > 0 ? 0.5 : 0;
  return Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
};

/**
 * 聚合同一小时内的多个数据点
 */
const aggregateHourlyData = (points: HistoricalDataPoint[]): number => {
  if (points.length === 0) return 0;
  
  // 使用最新的数据点（最大 timestamp）
  const latestPoint = points.reduce((latest, current) => 
    current.timestamp > latest.timestamp ? current : latest
  );
  
  return safeNumber(latestPoint.dailySpent);
};

/**
 * 生成日期标签数组
 */
const generateDailyLabels = (periodStart: Date, dayCount: number): string[] => {
  const labels: string[] = [];
  
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(periodStart);
    date.setDate(periodStart.getDate() + i);
    
    if (dayCount <= 7) {
      // 一周内显示星期
      labels.push(getDayLabel(date.getDay()));
    } else {
      // 超过一周显示月日
      labels.push(date.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric' 
      }));
    }
  }
  
  return labels;
};

/**
 * 获取天数根据时间范围
 */
const getDayCountFromTimeRange = (timeRange: HeatmapSettings['timeRange']): number => {
  switch (timeRange) {
    case 'week':
      return 7;
    case '2weeks':
      return 14;
    case 'month':
      return 30;
    default:
      return 7;
  }
};

/**
 * 将历史数据转换为热力图数据
 */
export const convertToHeatmapData = (
  historicalData: HistoricalDataPoint[], 
  settings: Partial<HeatmapSettings> = {},
  centerDate: Date = new Date()
): WeeklyHeatmapData => {
  try {
    const defaultSettings: HeatmapSettings = {
      timeRange: 'week',
      colorScheme: 'green',
      showWeekends: true,
      showEmptyHours: true,
    };

    const mergedSettings = { ...defaultSettings, ...settings };
    const { start: dateStart, end: dateEnd } = getDateRange(centerDate, mergedSettings.timeRange);
    const dayCount = getDayCountFromTimeRange(mergedSettings.timeRange);
    
    // 过滤指定时间范围内的数据
    const filteredData = historicalData.filter(
      point => point.timestamp >= dateStart.getTime() && point.timestamp <= dateEnd.getTime()
    );

    // 按天和小时分组数据 - 支持多天范围
    const hourlyGroups = new Map<string, HistoricalDataPoint[]>();

    filteredData.forEach(point => {
      const date = new Date(point.timestamp);
      // 计算相对于开始日期的天数偏移
      const dayOffset = Math.floor((date.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000));
      const hour = date.getHours();
      
      if (dayOffset >= 0 && dayOffset < dayCount) {
        const key = `${dayOffset}-${hour}`;
        
        if (!hourlyGroups.has(key)) {
          hourlyGroups.set(key, []);
        }
        hourlyGroups.get(key)!.push(point);
      }
    });

    // 计算最大最小值
    const allValues = Array.from(hourlyGroups.values())
      .map(group => aggregateHourlyData(group))
      .filter(value => value > 0);

    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;
    const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;

    // 初始化热力图数据结构
    const heatmapData = initializeEmptyHeatmapData(dateStart, dayCount);

    // 填充实际数据
    let totalPoints = 0;
    let hasAnyData = false;

    hourlyGroups.forEach((points, key) => {
      const [dayStr, hourStr] = key.split('-');
      const day = parseInt(dayStr, 10);
      const hour = parseInt(hourStr, 10);

      if (day >= 0 && day < dayCount && hour >= 0 && hour < 24) {
        const value = aggregateHourlyData(points);
        const intensity = calculateIntensity(value, minValue, maxValue);

        heatmapData[day][hour] = {
          ...heatmapData[day][hour],
          value: safeNumber(value),
          intensity: safeNumber(intensity),
          hasData: value > 0,
        };

        if (value > 0) {
          totalPoints++;
          hasAnyData = true;
        }
      }
    });

    // 如果不显示周末，过滤掉周六和周日（只对一周视图有效）
    if (!mergedSettings.showWeekends && mergedSettings.timeRange === 'week') {
      for (let day = 0; day < 7; day++) {
        if (day === 0 || day === 6) { // 周日和周六
          for (let hour = 0; hour < 24; hour++) {
            heatmapData[day][hour].hasData = false;
            heatmapData[day][hour].value = 0;
            heatmapData[day][hour].intensity = 0;
          }
        }
      }
    }

    return {
      periodStart: dateStart,
      periodEnd: dateEnd,
      data: heatmapData,
      maxValue: safeNumber(maxValue),
      minValue: safeNumber(minValue),
      totalPoints,
      hasAnyData,
      dayCount,
      dailyLabels: generateDailyLabels(dateStart, dayCount),
    };

  } catch (error) {
    console.error('Error converting to heatmap data:', error);
    
    // 返回空的热力图数据作为降级
    const { start: dateStart, end: dateEnd } = getDateRange(centerDate, 'week');
    const dayCount = 7;
    
    return {
      periodStart: dateStart,
      periodEnd: dateEnd,
      data: initializeEmptyHeatmapData(dateStart, dayCount),
      maxValue: 0,
      minValue: 0,
      totalPoints: 0,
      hasAnyData: false,
      dayCount,
      dailyLabels: generateDailyLabels(dateStart, dayCount),
    };
  }
};

/**
 * 根据强度值获取颜色
 */
export const getHeatmapColor = (
  intensity: number, 
  hasData: boolean,
  colorScheme: HeatmapSettings['colorScheme'] = 'blue'
): string => {
  if (!hasData || intensity === 0) {
    return '#1F2937'; // 深灰色，表示无数据
  }

  const safeIntensity = Math.max(0, Math.min(1, intensity));

  switch (colorScheme) {
    case 'blue':
      if (safeIntensity < 0.2) return '#DBEAFE'; // 最浅蓝
      if (safeIntensity < 0.4) return '#93C5FD'; // 更浅蓝
      if (safeIntensity < 0.6) return '#60A5FA'; // 浅蓝
      if (safeIntensity < 0.8) return '#3B82F6'; // 蓝色
      return '#1E3A8A'; // 深蓝

    case 'green':
      if (safeIntensity < 0.2) return '#BBF7D0'; // 最浅绿
      if (safeIntensity < 0.4) return '#4ADE80'; // 更浅绿
      if (safeIntensity < 0.6) return '#22C55E'; // 浅绿
      if (safeIntensity < 0.8) return '#16A34A'; // 绿色
      return '#14532D'; // 深绿

    case 'red':
      if (safeIntensity < 0.2) return '#FECACA'; // 最浅红
      if (safeIntensity < 0.4) return '#F87171'; // 更浅红
      if (safeIntensity < 0.6) return '#EF4444'; // 浅红
      if (safeIntensity < 0.8) return '#DC2626'; // 红色
      return '#7F1D1D'; // 深红

    default:
      return '#374151'; // 默认灰色
  }
};

/**
 * 格式化热力图工具提示内容
 */
export const formatHeatmapTooltip = (dataPoint: HeatmapDataPoint): {
  time: string;
  value: string;
  intensity: string;
  hasData: boolean;
} => {
  const timeStr = `${dataPoint.dayLabel} ${dataPoint.hourLabel}`;
  const valueStr = dataPoint.hasData ? `$${dataPoint.value.toFixed(2)}` : '无数据';
  const intensityStr = dataPoint.hasData ? `${(dataPoint.intensity * 100).toFixed(1)}%` : '0%';

  return {
    time: timeStr,
    value: valueStr,
    intensity: intensityStr,
    hasData: dataPoint.hasData,
  };
};

/**
 * 获取热力图统计信息
 */
export const getHeatmapStats = (heatmapData: WeeklyHeatmapData): {
  totalSpent: number;
  averageIntensity: number;
  peakHour: { day: number; hour: number; value: number } | null;
  activeHours: number;
  dataCompleteness: number; // 数据完整性百分比
} => {
  try {
    let totalSpent = 0;
    let totalIntensity = 0;
    let activeHours = 0;
    let peakValue = 0;
    let peakHour: { day: number; hour: number; value: number } | null = null;

    const totalPossibleHours = heatmapData.dayCount * 24; // 支持可变天数

    for (let day = 0; day < heatmapData.dayCount; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const point = heatmapData.data[day]?.[hour];
        
        if (point?.hasData && point.value > 0) {
          totalSpent += point.value;
          totalIntensity += point.intensity;
          activeHours++;

          if (point.value > peakValue) {
            peakValue = point.value;
            peakHour = { day, hour, value: point.value };
          }
        }
      }
    }

    const averageIntensity = activeHours > 0 ? totalIntensity / activeHours : 0;
    const dataCompleteness = (activeHours / totalPossibleHours) * 100;

    return {
      totalSpent: safeNumber(totalSpent),
      averageIntensity: safeNumber(averageIntensity),
      peakHour,
      activeHours,
      dataCompleteness: safeNumber(dataCompleteness),
    };

  } catch (error) {
    console.error('Error calculating heatmap stats:', error);
    return {
      totalSpent: 0,
      averageIntensity: 0,
      peakHour: null,
      activeHours: 0,
      dataCompleteness: 0,
    };
  }
};