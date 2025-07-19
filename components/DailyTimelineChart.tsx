import React from 'react';
import {
  BarChart,
  Bar,
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
}

export function DailyTimelineChart({ data, selectedDate = new Date() }: DailyTimelineChartProps) {
  // 处理数据，按小时分组
  const hourlyData = React.useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 过滤选定日期的数据
    const dayData = data.filter(
      point => point.timestamp >= startOfDay.getTime() && point.timestamp <= endOfDay.getTime()
    );

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
      });
    }

    // 填充实际数据
    dayData.forEach(point => {
      const hour = new Date(point.timestamp).getHours();
      const existing = hourlyMap.get(hour);
      if (existing) {
        // 如果同一小时有多个数据点，取最新的
        if (point.timestamp > existing.timestamp) {
          existing.spent = point.dailySpent;
          existing.budget = point.dailyBudget;
          existing.usage = (point.dailySpent / point.dailyBudget) * 100;
          existing.timestamp = point.timestamp;
        }
      }
    });

    return Array.from(hourlyMap.values());
  }, [data, selectedDate]);

  // 获取当前小时
  const currentHour = new Date().getHours();
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // 计算统计信息
  const stats = React.useMemo(() => {
    const activeHours = hourlyData.filter(h => h.spent > 0);
    const totalSpent = activeHours.reduce((sum, h) => sum + h.spent, 0);
    const peakHour = hourlyData.reduce((max, h) => (h.spent > max.spent ? h : max), hourlyData[0]);
    const avgSpentPerActiveHour = activeHours.length > 0 ? totalSpent / activeHours.length : 0;

    return {
      totalSpent,
      activeHours: activeHours.length,
      peakHour: peakHour.hour,
      peakSpent: peakHour.spent,
      avgSpentPerActiveHour,
    };
  }, [hourlyData]);

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 p-3 rounded shadow-lg border border-gray-700">
          <p className="text-white font-semibold">{label}</p>
          <p className="text-gray-400 text-sm">花费: ${data.spent.toFixed(2)}</p>
          <p className="text-gray-400 text-sm">预算: ${data.budget.toFixed(2)}</p>
          <p className="text-gray-400 text-sm">使用率: {data.usage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  // 根据使用率返回颜色
  const getBarColor = (usage: number) => {
    if (usage > 100) return '#EF4444'; // red-500
    if (usage > 80) return '#F59E0B'; // amber-500
    if (usage > 60) return '#FCD34D'; // yellow-300
    return '#10B981'; // green-500
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          24小时用量时间线
        </CardTitle>
        <CardDescription className="text-sm text-gray-400">
          {selectedDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          {isToday && ' (今天)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 图表 */}
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="hourLabel" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                interval={2}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                label={{ value: '花费 ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
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
              
              <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                {hourlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.usage)} />
                ))}
              </Bar>
            </BarChart>
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
                <div className="text-xs text-gray-400">平均每小时</div>
                <div className="text-sm font-medium text-blue-400">
                  ${stats.avgSpentPerActiveHour.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700 rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">高峰时段</div>
                <div className="text-lg font-semibold text-white">
                  {stats.peakHour.toString().padStart(2, '0')}:00
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">高峰花费</div>
                <div className="text-sm font-medium text-orange-400">
                  ${stats.peakSpent.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 图例 */}
        <div className="mt-3 flex items-center justify-center space-x-4 text-xs">
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
            <span className="text-gray-400">超支 (&gt;100%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}