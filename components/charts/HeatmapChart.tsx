import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart3, Info } from 'lucide-react';
import { ChartErrorBoundary } from '../ChartErrorBoundary';
import { HeatmapStats } from './HeatmapStats';
import type { HistoricalDataPoint, HeatmapSettings } from '../../types';
import { 
  convertToHeatmapData, 
  getHeatmapColor, 
  formatHeatmapTooltip,
  getHeatmapStats 
} from '../../utils/heatmapDataProcessor';

interface HeatmapChartProps {
  data: HistoricalDataPoint[];
  onClose?: () => void;
}

// 热力图单元格组件
const HeatmapCell: React.FC<{
  dataPoint: any;
  colorScheme: HeatmapSettings['colorScheme'];
  onHover?: (data: any, event: React.MouseEvent) => void;
  onLeave?: () => void;
}> = ({ dataPoint, colorScheme, onHover, onLeave }) => {
  const backgroundColor = getHeatmapColor(dataPoint.intensity, dataPoint.hasData, colorScheme);
  
  return (
    <div
      className="w-full h-6 border border-gray-700 cursor-pointer transition-all duration-200 hover:border-gray-500 hover:scale-110"
      style={{ backgroundColor }}
      onMouseEnter={(e) => onHover?.(dataPoint, e)}
      onMouseLeave={onLeave}
      title={`${dataPoint.dayLabel} ${dataPoint.hourLabel}: ${dataPoint.hasData ? `$${dataPoint.value.toFixed(2)}` : '无数据'}`}
    />
  );
};

// 工具提示组件
const HeatmapTooltip: React.FC<{
  data: any;
  position: { x: number; y: number };
  visible: boolean;
}> = ({ data, position, visible }) => {
  if (!visible || !data) return null;

  const tooltipInfo = formatHeatmapTooltip(data);

  return (
    <div
      className="fixed z-50 bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-600 pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 60,
      }}
    >
      <div className="text-sm font-semibold text-gray-200">{tooltipInfo.time}</div>
      <div className="text-xs text-gray-300">消费: {tooltipInfo.value}</div>
      <div className="text-xs text-gray-300">强度: {tooltipInfo.intensity}</div>
    </div>
  );
};

export function HeatmapChart({ data, onClose }: HeatmapChartProps) {
  const [settings, setSettings] = useState<HeatmapSettings>({
    timeRange: 'week',
    colorScheme: 'green',
    showWeekends: true,
    showEmptyHours: true,
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tooltip, setTooltip] = useState<{
    data: any;
    position: { x: number; y: number };
    visible: boolean;
  }>({
    data: null,
    position: { x: 0, y: 0 },
    visible: false,
  });

  // 处理热力图数据
  const heatmapData = useMemo(() => {
    try {
      return convertToHeatmapData(data, settings, selectedDate);
    } catch (error) {
      console.error('Error processing heatmap data:', error);
      const fallbackDate = new Date();
      return {
        periodStart: fallbackDate,
        periodEnd: fallbackDate,
        data: [],
        maxValue: 0,
        minValue: 0,
        totalPoints: 0,
        hasAnyData: false,
        dayCount: 7,
        dailyLabels: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      };
    }
  }, [data, settings, selectedDate]);

  // 计算统计信息
  const stats = useMemo(() => getHeatmapStats(heatmapData), [heatmapData]);

  // 处理鼠标悬停
  const handleCellHover = (dataPoint: any, event: React.MouseEvent) => {
    setTooltip({
      data: dataPoint,
      position: { x: event.clientX, y: event.clientY },
      visible: true,
    });
  };

  const handleCellLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // 处理日期导航
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    const daysToMove = settings.timeRange === 'week' ? 7 : settings.timeRange === '2weeks' ? 14 : 30;
    
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - daysToMove);
    } else {
      newDate.setDate(newDate.getDate() + daysToMove);
    }
    
    setSelectedDate(newDate);
  };

  // 渲染热力图网格
  const renderHeatmapGrid = () => {
    if (!heatmapData.hasAnyData) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无消费数据</p>
          </div>
        </div>
      );
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const { dayCount, dailyLabels } = heatmapData;

    return (
      <div className="w-full overflow-x-auto">
        <div className={`min-w-[600px] ${dayCount > 7 ? 'min-w-[800px]' : ''}`}>
          {/* 小时标题行 */}
          <div className="flex mb-2">
            <div className={`${dayCount > 7 ? 'w-16' : 'w-12'} h-6`}></div>
            <div className="flex-1 grid grid-cols-24 gap-0.5">
              {hours.map(hour => (
                <div key={hour} className="text-xs text-gray-400 flex items-center justify-center h-6">
                  {hour % 4 === 0 ? hour.toString().padStart(2, '0') : ''}
                </div>
              ))}
            </div>
          </div>

          {/* 热力图主体 */}
          {Array.from({ length: dayCount }).map((_, dayIndex) => {
            // 对于一周视图，可以过滤周末
            if (settings.timeRange === 'week' && !settings.showWeekends) {
              const actualDay = new Date(heatmapData.periodStart);
              actualDay.setDate(actualDay.getDate() + dayIndex);
              const dayOfWeek = actualDay.getDay();
              if (dayOfWeek === 0 || dayOfWeek === 6) {
                return null;
              }
            }

            return (
              <div key={dayIndex} className="flex mb-0.5">
                {/* 日期标签 */}
                <div className={`${dayCount > 7 ? 'w-16' : 'w-12'} text-xs text-gray-400 flex items-center justify-center h-6 font-medium`}>
                  <span className="truncate">
                    {dailyLabels[dayIndex] || `日${dayIndex + 1}`}
                  </span>
                </div>
                
                {/* 每小时的单元格 */}
                <div className="flex-1 grid grid-cols-24 gap-0.5">
                  {hours.map(hour => {
                    const dataPoint = heatmapData.data[dayIndex]?.[hour];
                    
                    if (!dataPoint) return (
                      <div key={hour} className="w-full h-6 bg-gray-800 border border-gray-700" />
                    );

                    return (
                      <div key={hour} className="w-full">
                        <HeatmapCell
                          dataPoint={dataPoint}
                          colorScheme={settings.colorScheme}
                          onHover={handleCellHover}
                          onLeave={handleCellLeave}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染颜色图例
  const renderColorLegend = () => {
    const intensityLevels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    
    return (
      <div className="flex items-center justify-center mt-4 space-x-2">
        <span className="text-xs text-gray-400">低</span>
        {intensityLevels.map((intensity, index) => (
          <div
            key={index}
            className="w-4 h-4 border border-gray-600 rounded-sm"
            style={{ backgroundColor: getHeatmapColor(intensity, true, settings.colorScheme) }}
          />
        ))}
        <span className="text-xs text-gray-400">高</span>
      </div>
    );
  };

  return (
    <ChartErrorBoundary>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-white flex items-center">
                <TrendingUp className="mr-2 h-4 w-4" />
                消费热力图
              </CardTitle>
              <CardDescription className="text-sm text-gray-400">
                查看不同时间段的消费密度分布
              </CardDescription>
            </div>
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
        </CardHeader>

        <CardContent>
          {/* 控制面板 */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center space-x-3">
              {/* 时间范围选择 */}
              <Select 
                value={settings.timeRange} 
                onValueChange={(value: HeatmapSettings['timeRange']) => 
                  setSettings(prev => ({ ...prev, timeRange: value }))
                }
              >
                <SelectTrigger className="w-24 bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="week" className="text-white hover:bg-gray-600">一周</SelectItem>
                  <SelectItem value="2weeks" className="text-white hover:bg-gray-600">两周</SelectItem>
                  <SelectItem value="month" className="text-white hover:bg-gray-600">一月</SelectItem>
                </SelectContent>
              </Select>

              {/* 颜色方案选择 */}
              <Select 
                value={settings.colorScheme} 
                onValueChange={(value: HeatmapSettings['colorScheme']) => 
                  setSettings(prev => ({ ...prev, colorScheme: value }))
                }
              >
                <SelectTrigger className="w-20 bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="blue" className="text-white hover:bg-gray-600">蓝色</SelectItem>
                  <SelectItem value="green" className="text-white hover:bg-gray-600">绿色</SelectItem>
                  <SelectItem value="red" className="text-white hover:bg-gray-600">红色</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 日期导航 */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate('prev')}
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                ←
              </Button>
              <span className="text-sm text-gray-300 min-w-[120px] text-center">
                {heatmapData.periodStart.toLocaleDateString('zh-CN', { 
                  month: 'short', 
                  day: 'numeric' 
                })} - {heatmapData.periodEnd.toLocaleDateString('zh-CN', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate('next')}
                disabled={selectedDate >= new Date()}
                className="text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50"
              >
                →
              </Button>
            </div>
          </div>

          {/* 热力图主体 */}
          {renderHeatmapGrid()}

          {/* 颜色图例 */}
          {renderColorLegend()}

          {/* 统计信息 */}
          {heatmapData.hasAnyData && <HeatmapStats stats={stats} />}

          {/* 使用说明 */}
          <div className="mt-3 p-2 bg-gray-700 rounded text-xs text-gray-400">
            <div className="flex items-center">
              <Info className="w-3 h-3 mr-1" />
              <span>悬停查看详情 • 颜色越深消费越高 • 灰色表示无数据</span>
            </div>
          </div>
        </CardContent>

        {/* 工具提示 */}
        <HeatmapTooltip
          data={tooltip.data}
          position={tooltip.position}
          visible={tooltip.visible}
        />
      </Card>
    </ChartErrorBoundary>
  );
}