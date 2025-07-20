import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, Calendar, Download, Clock } from 'lucide-react';
import { DailyTimelineChart } from './DailyTimelineChart';
import { DailyTimelineChartWithRate } from './DailyTimelineChartWithRate';
import { HeatmapChart } from './charts/HeatmapChart';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { RateFeatureToggle } from './RateFeatureToggle';
import type { HistoricalDataPoint } from '../types';

interface UsageChartProps {
  data: HistoricalDataPoint[];
  onClose?: () => void;
}

type ViewMode = '24hours' | 'heatmap' | '7days' | '30days' | 'all';
type ChartType = 'daily' | 'monthly' | 'both';

export function UsageChart({ data, onClose }: UsageChartProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('24hours'); // 改为默认24小时
  const [chartType, setChartType] = React.useState<ChartType>('both');
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [showRate, setShowRate] = React.useState<boolean>(false); // 速率功能开关

  // 过滤数据
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    if (viewMode === '24hours' || viewMode === 'heatmap') return []; // 24小时和热力图视图不使用此数据

    const now = Date.now();
    let cutoffTime = 0;

    switch (viewMode) {
      case '7days':
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30days':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        cutoffTime = 0;
    }

    return data
      .filter(point => point.timestamp > cutoffTime)
      .map(point => ({
        ...point,
        date: new Date(point.timestamp).toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
        }),
        dailyUsage: ((point.dailySpent / point.dailyBudget) * 100).toFixed(1),
        monthlyUsage: ((point.monthlySpent / point.monthlyBudget) * 100).toFixed(1),
      }));
  }, [data, viewMode]);

  // 导出数据为CSV
  const handleExport = () => {
    if (!data || data.length === 0) {
      return;
    }
    
    const csvContent = [
      ['时间', '日度预算', '日度花费', '日度使用率', '月度预算', '月度花费', '月度使用率'],
      ...filteredData.map(point => [
        point.date,
        point.dailyBudget,
        point.dailySpent,
        point.dailyUsage + '%',
        point.monthlyBudget,
        point.monthlySpent,
        point.monthlyUsage + '%',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usage-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!data || data.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-400">暂无历史数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-white flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              使用趋势图表
            </CardTitle>
            <CardDescription className="text-sm text-gray-400">
              查看您的预算使用历史趋势
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              <Download className="mr-1 h-3 w-3" />
              导出CSV
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                关闭
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 控制选项 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="24hours" className="text-white hover:bg-gray-600">
                24小时
              </SelectItem>
              <SelectItem value="heatmap" className="text-white hover:bg-gray-600">
                热力图
              </SelectItem>
              <SelectItem value="7days" className="text-white hover:bg-gray-600">
                最近7天
              </SelectItem>
              <SelectItem value="30days" className="text-white hover:bg-gray-600">
                最近30天
              </SelectItem>
              <SelectItem value="all" className="text-white hover:bg-gray-600">
                全部数据
              </SelectItem>
            </SelectContent>
          </Select>

          {viewMode !== '24hours' && viewMode !== 'heatmap' && (
            <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
              <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="daily" className="text-white hover:bg-gray-600">
                  日度预算
                </SelectItem>
                <SelectItem value="monthly" className="text-white hover:bg-gray-600">
                  月度预算
                </SelectItem>
                <SelectItem value="both" className="text-white hover:bg-gray-600">
                  全部显示
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {viewMode === '24hours' && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 1);
                  setSelectedDate(newDate);
                }}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                ←
              </Button>
              <span className="text-sm text-gray-300">
                {selectedDate.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit' 
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 1);
                  const today = new Date();
                  if (newDate <= today) {
                    setSelectedDate(newDate);
                  }
                }}
                disabled={selectedDate.toDateString() === new Date().toDateString()}
                className="text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50"
              >
                →
              </Button>
            </div>
          )}
          </div>
          
          {/* 速率功能开关 - 仅在24小时视图显示 */}
          {viewMode === '24hours' && (
            <RateFeatureToggle 
              enabled={showRate}
              onToggle={setShowRate}
            />
          )}
        </div>

        {/* 图表 */}
        {viewMode === '24hours' ? (
          <ChartErrorBoundary>
            {showRate ? (
              <DailyTimelineChartWithRate data={data} selectedDate={selectedDate} />
            ) : (
              <DailyTimelineChart data={data} selectedDate={selectedDate} />
            )}
          </ChartErrorBoundary>
        ) : viewMode === 'heatmap' ? (
          <ChartErrorBoundary>
            <HeatmapChart data={data} />
          </ChartErrorBoundary>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData}>
                  <defs>
                    <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    label={{ value: '使用率 (%)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#E5E7EB' }}
                    iconType="line"
                  />
                  {(chartType === 'daily' || chartType === 'both') && (
                    <Area
                      type="monotone"
                      dataKey="dailyUsage"
                      stroke="#3B82F6"
                      fillOpacity={1}
                      fill="url(#colorDaily)"
                      name="日度使用率"
                      strokeWidth={2}
                    />
                  )}
                  {(chartType === 'monthly' || chartType === 'both') && (
                    <Area
                      type="monotone"
                      dataKey="monthlyUsage"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#colorMonthly)"
                      name="月度使用率"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 统计信息 */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-gray-700 rounded p-3">
                <div className="text-xs text-gray-400">平均日度使用率</div>
                <div className="text-lg font-semibold text-white">
                  {filteredData.length > 0
                    ? (
                        filteredData.reduce((sum, point) => sum + parseFloat(point.dailyUsage), 0) /
                        filteredData.length
                      ).toFixed(1)
                    : 0}
                  %
                </div>
              </div>
              <div className="bg-gray-700 rounded p-3">
                <div className="text-xs text-gray-400">最高日度使用率</div>
                <div className="text-lg font-semibold text-white">
                  {filteredData.length > 0
                    ? Math.max(...filteredData.map(point => parseFloat(point.dailyUsage))).toFixed(1)
                    : 0}
                  %
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}