import { CircularProgress } from './CircularProgress';
import { CountdownTimer } from './CountdownTimer';
import { RemainingBudgetAlert } from './RemainingBudgetAlert';
import { DollarSign, Calendar } from 'lucide-react';
import type { DataCardItem, PluginSettings, ApiResponse } from '../types';
import { extractDataValue } from '../utils/api';

interface DataGridProps {
  settings: PluginSettings;
  data: ApiResponse | null;
  loading?: boolean;
}

const FIELD_LABELS = {
  monthlyBudget: '月度预算',
  monthlySpent: '本月已花费',
  dailyBudget: '日度预算',
  dailySpent: '今日已花费',
} as const;

export function DataGrid({ settings, data, loading = false }: DataGridProps) {
  const cardItems: DataCardItem[] = Object.entries(FIELD_LABELS).map(([key, label]) => {
    const mappingKey = key as keyof PluginSettings['mapping'];
    const fieldPath = settings.mapping[mappingKey];
    const value = data && fieldPath ? extractDataValue(data, fieldPath) : 0;

    return {
      label,
      value,
      key: mappingKey,
    };
  });

  // 计算当日开销百分比
  const dailySpent = Number(cardItems.find((item) => item.key === 'dailySpent')?.value) || 0;
  const dailyBudget = Number(cardItems.find((item) => item.key === 'dailyBudget')?.value) || 1;
  const usagePercentage = Math.min((dailySpent / dailyBudget) * 100, 100);

  // 计算月度数据
  const monthlySpent = Number(cardItems.find((item) => item.key === 'monthlySpent')?.value) || 0;
  const monthlyBudget = Number(cardItems.find((item) => item.key === 'monthlyBudget')?.value) || 1;
  const monthlyUsagePercentage = Math.min((monthlySpent / monthlyBudget) * 100, 100);

  return (
    <div className="p-4 space-y-4 bg-gray-900 transition-all duration-300">
      {/* 主要进度指示器 */}
      <div className="flex justify-center">
        <div className="transform transition-transform duration-300 hover:scale-105">
          <CircularProgress percentage={usagePercentage} size={120} strokeWidth={10}>
            <div className="text-center">
              <div className="text-2xl font-bold text-white transition-all duration-500">
                {loading ? '...' : `${Math.round(usagePercentage)}%`}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">当日开销</div>
              <div className="flex items-center justify-center mt-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                <span className="text-xs text-gray-400">safe</span>
              </div>
            </div>
          </CircularProgress>
        </div>
      </div>

      {/* 剩余预算警示 */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm">
          <RemainingBudgetAlert
            dailyBudget={dailyBudget}
            dailySpent={dailySpent}
            workingHours={settings.workingHours}
            loading={loading}
          />
        </div>
      </div>

      {/* 倒计时显示 */}
      <div className="flex justify-center">
        <CountdownTimer />
      </div>

      {/* 底部信息卡片 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 每日用量卡片 */}
        <div className="bg-gray-800 rounded-lg p-3 transition-all duration-300 hover:bg-gray-750 hover:shadow-lg">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2 transition-colors duration-300">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">每日开销</div>
              <div className="text-gray-400 text-xs">Daily Usage</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">已花费</span>
              <span className="text-white font-semibold text-sm transition-all duration-300">
                {loading ? '...' : `$${dailySpent.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span
                className="tex
              t-gray-400 text-xs"
              >
                预算
              </span>
              <span className="text-white font-semibold text-sm">{loading ? '...' : `$${dailyBudget.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">使用率</span>
              <span
                className={`font-semibold text-sm transition-all duration-300 ${
                  usagePercentage > 80 ? 'text-red-400' : usagePercentage > 60 ? 'text-yellow-400' : 'text-green-400'
                }`}
              >
                {loading ? '...' : `${usagePercentage.toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* 每月用量卡片 */}
        <div className="bg-gray-800 rounded-lg p-3 transition-all duration-300 hover:bg-gray-750 hover:shadow-lg">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-2 transition-colors duration-300 flex-shrink-0">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">月度开销</div>
              <div className="text-gray-400 text-xs">Monthly Usage</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">已花费</span>
              <span className="text-white font-semibold text-sm transition-all duration-300">
                {loading ? '...' : `$${monthlySpent.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">预算</span>
              <span className="text-white font-semibold text-sm">
                {loading ? '...' : `$${monthlyBudget.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">使用率</span>
              <span
                className={`font-semibold text-sm transition-all duration-300 ${
                  monthlyUsagePercentage > 80
                    ? 'text-red-400'
                    : monthlyUsagePercentage > 60
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }`}
              >
                {loading ? '...' : `${monthlyUsagePercentage.toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
