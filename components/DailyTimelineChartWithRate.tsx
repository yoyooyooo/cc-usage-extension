import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp } from 'lucide-react';
import type { HistoricalDataPoint } from '../types';

interface DailyTimelineChartProps {
  data: HistoricalDataPoint[];
  selectedDate?: Date;
}

interface HourlyData {
  hour: number;
  hourLabel: string;
  spent: number;
  budget: number;
  usage: number;
  timestamp: number;
  spentIncrease: number;
  increasePercent: number;
}

// 安全的数值处理函数
const safeNumber = (value: any, defaultValue = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

// 安全的 toFixed 函数
const safeToFixed = (value: any, digits = 2): string => {
  const num = safeNumber(value, 0);
  return num.toFixed(digits);
};

export function DailyTimelineChartWithRate({ data, selectedDate = new Date() }: DailyTimelineChartProps) {
  // 处理数据，按小时分组
  const hourlyData = React.useMemo(() => {
    try {
      // 确保 data 存在
      if (!data || !Array.isArray(data)) {
        return Array.from({ length: 24 }, (_, hour) => ({
          hour,
          hourLabel: `${hour.toString().padStart(2, '0')}:00`,
          spent: 0,
          budget: 0,
          usage: 0,
          timestamp: 0,
          spentIncrease: 0,
          increasePercent: 0,
        }));
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 过滤选定日期的数据并按时间排序
      const dayData = data
        .filter((point) => point.timestamp >= startOfDay.getTime() && point.timestamp <= endOfDay.getTime())
        .sort((a, b) => a.timestamp - b.timestamp);

      // 初始化24小时数据
      const hourlyMap = new Map<number, HourlyData>();
      for (let hour = 0; hour < 24; hour++) {
        hourlyMap.set(hour, {
          hour,
          hourLabel: `${hour.toString().padStart(2, '0')}:00`,
          spent: 0,
          budget: 0,
          usage: 0,
          timestamp: 0,
          spentIncrease: 0,
          increasePercent: 0,
        });
      }

      // 填充实际数据（每小时取最新的数据点）
      dayData.forEach((point) => {
        const hour = new Date(point.timestamp).getHours();
        const existing = hourlyMap.get(hour);
        if (existing && point.timestamp > existing.timestamp) {
          existing.spent = safeNumber(point.dailySpent);
          existing.budget = safeNumber(point.dailyBudget);
          existing.usage = existing.budget > 0 ? safeNumber((existing.spent / existing.budget) * 100) : 0;
          existing.timestamp = point.timestamp;
        }
      });

      // 转换为数组并排序
      const hourlyArray = Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour);

      // 🎯 正确计算消费速率：使用原始数据点计算实际增量
      // 注意：需要足够的数据点密度（5分钟间隔）才能计算真实速率
      for (let i = 0; i < hourlyArray.length; i++) {
        const current = hourlyArray[i];
        
        if (current.spent > 0 && current.timestamp > 0) {
          // 找到当前小时内的所有数据点
          const hourStart = new Date(selectedDate);
          hourStart.setHours(current.hour, 0, 0, 0);
          const hourEnd = new Date(selectedDate);
          hourEnd.setHours(current.hour, 59, 59, 999);
          
          // 获取这个小时内的所有数据点
          const hourPoints = dayData.filter(
            p => p.timestamp >= hourStart.getTime() && p.timestamp <= hourEnd.getTime()
          );
          
          if (hourPoints.length >= 2) {
            // 如果有多个数据点，计算这小时内的实际增量
            const firstPoint = hourPoints[0];
            const lastPoint = hourPoints[hourPoints.length - 1];
            current.spentIncrease = Math.max(0, lastPoint.dailySpent - firstPoint.dailySpent);
          } else if (hourPoints.length === 1) {
            // 只有一个数据点，尝试与前一个有效数据点比较
            let prevSpent = 0;
            for (let j = i - 1; j >= 0; j--) {
              if (hourlyArray[j].spent > 0) {
                prevSpent = hourlyArray[j].spent;
                break;
              }
            }
            current.spentIncrease = Math.max(0, current.spent - prevSpent);
          }
          
          // 计算相对前一小时的增长百分比
          let prevSpent = 0;
          for (let j = i - 1; j >= 0; j--) {
            if (hourlyArray[j].spent > 0) {
              prevSpent = hourlyArray[j].spent;
              break;
            }
          }
          
          if (prevSpent > 0) {
            const percentChange = ((current.spent - prevSpent) / prevSpent) * 100;
            current.increasePercent = safeNumber(percentChange);
          }
        }
      }

      return hourlyArray;
    } catch (error) {
      console.error('Error processing hourly data:', error);
      // 返回空数据
      return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        hourLabel: `${hour.toString().padStart(2, '0')}:00`,
        spent: 0,
        budget: 0,
        usage: 0,
        timestamp: 0,
        spentIncrease: 0,
        increasePercent: 0,
      }));
    }
  }, [data, selectedDate]);

  // 获取当前小时
  const currentHour = new Date().getHours();
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // 计算统计信息（带错误处理）
  const stats = React.useMemo(() => {
    try {
      const activeHours = hourlyData.filter((h) => h.spent > 0);
      const latestSpent = activeHours.length > 0 ? activeHours[activeHours.length - 1].spent : 0;

      const peakHour =
        hourlyData.length > 0
          ? hourlyData.reduce((max, h) => (h.spent > max.spent ? h : max), hourlyData[0])
          : { hour: 0, spent: 0 };

      const avgUsage =
        activeHours.length > 0 ? activeHours.reduce((sum, h) => sum + h.usage, 0) / activeHours.length : 0;

      // 增量统计
      const hoursWithIncrease = hourlyData.filter((h) => h.spentIncrease > 0);
      const maxIncrease = hoursWithIncrease.length > 0 ? Math.max(...hoursWithIncrease.map((h) => h.spentIncrease)) : 0;
      const avgConsumptionRate = hoursWithIncrease.length > 0 ? 
        hoursWithIncrease.reduce((sum, h) => sum + h.spentIncrease, 0) / hoursWithIncrease.length : 0;

      const peakIncreaseHour =
        hoursWithIncrease.length > 0
          ? hoursWithIncrease.reduce((max, h) => (h.spentIncrease > max.spentIncrease ? h : max), hoursWithIncrease[0])
          : { hour: 0, spentIncrease: 0 };

      return {
        latestSpent: safeNumber(latestSpent),
        activeHours: activeHours.length,
        peakHour: peakHour.hour,
        peakSpent: safeNumber(peakHour.spent),
        avgUsage: safeNumber(avgUsage),
        maxIncrease: safeNumber(maxIncrease),
        avgConsumptionRate: safeNumber(avgConsumptionRate),
        peakIncreaseHour: peakIncreaseHour.hour,
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        latestSpent: 0,
        activeHours: 0,
        peakHour: 0,
        peakSpent: 0,
        avgUsage: 0,
        maxIncrease: 0,
        avgConsumptionRate: 0,
        peakIncreaseHour: 0,
      };
    }
  }, [hourlyData]);

  // 自定义 Tooltip（带错误处理）
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      try {
        const data = payload[0].payload;
        return (
          <div className="bg-gray-800 p-3 rounded shadow-lg border border-gray-700">
            <p className="text-white font-semibold">{label}</p>
            <p className="text-gray-400 text-sm">累计花费: ${safeToFixed(data.spent)}</p>
            <p className="text-gray-400 text-sm">预算: ${safeToFixed(data.budget)}</p>
            <p className="text-gray-400 text-sm">使用率: {safeToFixed(data.usage, 1)}%</p>
            {safeNumber(data.spentIncrease) > 0 && (
              <div className="border-t border-gray-600 mt-2 pt-2">
                <p className="text-blue-400 text-sm">消费速率: ${safeToFixed(data.spentIncrease)}/时</p>
                {safeNumber(data.increasePercent) > 0 && (
                  <p className="text-blue-300 text-sm">相比上时段: +{safeToFixed(data.increasePercent, 1)}%</p>
                )}
              </div>
            )}
          </div>
        );
      } catch (error) {
        console.error('Tooltip error:', error);
        return null;
      }
    }
    return null;
  };

  // 根据使用率返回颜色
  const getBarColor = (usage: number) => {
    const safeUsage = safeNumber(usage);
    if (safeUsage > 100) return '#EF4444'; // red-500
    if (safeUsage > 80) return '#F59E0B'; // amber-500
    if (safeUsage > 60) return '#FCD34D'; // yellow-300
    return '#10B981'; // green-500
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          24小时消费时间线
        </CardTitle>
        <CardDescription className="text-sm text-gray-400">
          {selectedDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          {isToday && ' (今天)'} • 蓝色线条显示消费速率（每小时增量）
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 图表 */}
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourlyData} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hourLabel" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} interval={2} />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                label={{ value: '累计花费 ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
              />
              <YAxis
                yAxisId="increase"
                orientation="right"
                stroke="#60A5FA"
                tick={{ fill: '#60A5FA', fontSize: 12 }}
                label={{ value: '消费速率 ($/时)', angle: 90, position: 'insideRight', fill: '#60A5FA' }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 当前时间标记（仅今天显示） */}
              {isToday && (
                <ReferenceLine
                  x={`${currentHour.toString().padStart(2, '0')}:00`}
                  stroke="#60A5FA"
                  strokeDasharray="5 5"
                  label={{ value: '当前', fill: '#60A5FA', fontSize: 12 }}
                />
              )}

              <Bar dataKey="spent" radius={[4, 4, 0, 0]} name="累计花费">
                {hourlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.usage)} />
                ))}
              </Bar>

              {/* 消费速率线 */}
              <Line
                yAxisId="increase"
                type="monotone"
                dataKey="spentIncrease"
                stroke="#60A5FA"
                strokeWidth={2}
                dot={{ fill: '#60A5FA', r: 3 }}
                activeDot={{ r: 5 }}
                name="消费速率"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-700 rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">活跃小时数</div>
                <div className="text-lg font-semibold text-white">{stats.activeHours}小时</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">当前花费</div>
                <div className="text-sm font-medium text-blue-400">${safeToFixed(stats.latestSpent)}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">高峰时段</div>
                <div className="text-lg font-semibold text-white">{stats.peakHour.toString().padStart(2, '0')}:00</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">平均使用率</div>
                <div className="text-sm font-medium text-green-400">{safeToFixed(stats.avgUsage, 1)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* 消费速率统计 */}
        {stats.maxIncrease > 0 && (
          <div className="mt-3 p-3 bg-gray-700 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-blue-400 mr-2" />
                <span className="text-sm text-gray-300">消费速率统计</span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-400">平均速率</div>
                <div className="text-sm font-semibold text-blue-400">${safeToFixed(stats.avgConsumptionRate)}/时</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">最高速率</div>
                <div className="text-sm font-semibold text-white">${safeToFixed(stats.maxIncrease)}/时</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              💡 如果消费均匀，速率应该保持在平均值附近（水平线）
              <br />
              📊 每5分钟刷新可获得更精确的速率数据
            </div>
          </div>
        )}

        {/* 图例 */}
        <div className="mt-3">
          <div className="flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
              <span className="text-gray-400">正常 (≤60%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-300 rounded mr-1"></div>
              <span className="text-gray-400">偏高 (60-80%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-amber-500 rounded mr-1"></div>
              <span className="text-gray-400">警告 (80-100%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
              <span className="text-gray-400">{`超支 (>100%)`}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
