import React from 'react';

interface HeatmapStatsProps {
  stats: {
    totalSpent: number;
    activeHours: number;
    dataCompleteness: number;
    peakHour: { day: number; hour: number; value: number } | null;
  };
}

export function HeatmapStats({ stats }: HeatmapStatsProps) {
  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-gray-700 rounded p-3">
        <div className="text-xs text-gray-400">总消费</div>
        <div className="text-sm font-semibold text-white">${stats.totalSpent.toFixed(2)}</div>
      </div>
      <div className="bg-gray-700 rounded p-3">
        <div className="text-xs text-gray-400">活跃小时</div>
        <div className="text-sm font-semibold text-white">{stats.activeHours}小时</div>
      </div>
      <div className="bg-gray-700 rounded p-3">
        <div className="text-xs text-gray-400">数据完整性</div>
        <div className="text-sm font-semibold text-white">{stats.dataCompleteness.toFixed(1)}%</div>
      </div>
      <div className="bg-gray-700 rounded p-3">
        <div className="text-xs text-gray-400">高峰时段</div>
        <div className="text-sm font-semibold text-white">
          {stats.peakHour ? 
            `${['周日','周一','周二','周三','周四','周五','周六'][stats.peakHour.day]} ${stats.peakHour.hour}:00` 
            : '无'
          }
        </div>
      </div>
    </div>
  );
}