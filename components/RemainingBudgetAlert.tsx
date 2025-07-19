import React from 'react';
import { DollarSign, AlertCircle, Flame, TrendingDown, CheckCircle, Clock, Coffee } from 'lucide-react';
import { getWorkingTimeStatus, type WorkingTimeStatus } from '../utils/workingTime';
import type { PluginSettings } from '../types';

interface RemainingBudgetAlertProps {
  dailyBudget: number;
  dailySpent: number;
  workingHours: PluginSettings['workingHours'];
  alertThresholds?: PluginSettings['alertThresholds'];
  loading?: boolean;
}

type AlertLevel = 'before-work' | 'after-work' | 'exceeded' | 'danger' | 'warning' | 'caution' | 'normal' | 'conservative';

interface AlertConfig {
  level: AlertLevel;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  fontSize: string;
  fontWeight: string;
  animation: string;
  message: string;
}

function getCurrentBurnRate(dailySpent: number, elapsedWorkHours: number): number {
  return elapsedWorkHours > 0 ? dailySpent / elapsedWorkHours : 0;
}

function getRequiredBurnRate(remainingBudget: number, remainingWorkHours: number): number {
  return remainingWorkHours > 0 ? remainingBudget / remainingWorkHours : 0;
}

function getAlertConfig(
  currentRate: number, 
  requiredRate: number, 
  remainingBudget: number,
  workStatus: WorkingTimeStatus,
  thresholds?: PluginSettings['alertThresholds']
): AlertConfig {
  // 使用自定义阈值或默认值
  const dangerThreshold = thresholds?.danger || 1.5;
  const warningThreshold = thresholds?.warning || 1.2;
  const cautionThreshold = thresholds?.caution || 1.0;
  const normalMinThreshold = thresholds?.normalMin || 0.8;
  // 工作时间外的状态
  if (workStatus.isBeforeWork) {
    return {
      level: 'before-work',
      color: 'text-blue-400',
      icon: Coffee,
      fontSize: 'text-sm',
      fontWeight: 'font-medium',
      animation: '',
      message: '工作未开始',
    };
  }
  
  if (workStatus.isAfterWork) {
    return {
      level: 'after-work',
      color: 'text-gray-400',
      icon: Coffee,
      fontSize: 'text-sm',
      fontWeight: 'font-medium',
      animation: '',
      message: '工作已结束',
    };
  }
  
  // 超支状态
  if (remainingBudget <= 0) {
    return {
      level: 'exceeded',
      color: 'text-purple-400',
      icon: TrendingDown,
      fontSize: 'text-lg',
      fontWeight: 'font-bold',
      animation: 'animate-bounce',
      message: '已经超支',
    };
  }
  
  // 工作时间内的速率比较
  const ratio = requiredRate > 0 ? currentRate / requiredRate : 0;
  
  if (ratio > dangerThreshold) {
    return {
      level: 'danger',
      color: 'text-red-400',
      icon: Flame,
      fontSize: 'text-base',
      fontWeight: 'font-bold',
      animation: 'animate-pulse',
      message: '消费过快，需要严格控制',
    };
  }
  
  if (ratio > warningThreshold) {
    return {
      level: 'warning',
      color: 'text-orange-400',
      icon: AlertCircle,
      fontSize: 'text-base',
      fontWeight: 'font-semibold',
      animation: 'animate-pulse',
      message: '消费略快，建议适度节制',
    };
  }
  
  if (ratio > cautionThreshold) {
    return {
      level: 'caution',
      color: 'text-yellow-400',
      icon: Clock,
      fontSize: 'text-sm',
      fontWeight: 'font-medium',
      animation: 'hover:scale-105',
      message: '消费偏快，注意控制节奏',
    };
  }
  
  if (ratio >= normalMinThreshold) {
    return {
      level: 'normal',
      color: 'text-green-400',
      icon: CheckCircle,
      fontSize: 'text-sm',
      fontWeight: 'font-medium',
      animation: '',
      message: '消费节奏良好',
    };
  }
  
  return {
    level: 'conservative',
    color: 'text-blue-400',
    icon: DollarSign,
    fontSize: 'text-sm',
    fontWeight: 'font-normal',
    animation: '',
    message: '消费偏慢，可以适度增加',
  };
}

export function RemainingBudgetAlert({ 
  dailyBudget, 
  dailySpent, 
  workingHours, 
  alertThresholds,
  loading = false 
}: RemainingBudgetAlertProps) {
  const remainingBudget = dailyBudget - dailySpent;
  const workStatus = getWorkingTimeStatus(workingHours.start, workingHours.end);
  const currentRate = getCurrentBurnRate(dailySpent, workStatus.elapsedWorkHours);
  const requiredRate = getRequiredBurnRate(remainingBudget, workStatus.remainingWorkHours);
  
  const config = getAlertConfig(currentRate, requiredRate, remainingBudget, workStatus, alertThresholds);
  const IconComponent = config.icon;

  return (
    <div className={`bg-gray-800 rounded-lg p-3 transition-all duration-300 ${config.animation}`}>
      {/* 警示标题 */}
      <div className="flex items-center justify-center mb-2">
        <IconComponent className={`w-4 h-4 ${config.color} mr-2`} />
        <span className={`${config.color} ${config.fontSize} ${config.fontWeight}`}>
          {config.message}
        </span>
      </div>
      
      {/* 详细数据 */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">剩余预算</span>
          <span className={`${config.fontWeight} ${config.color}`}>
            ${remainingBudget.toFixed(2)}
          </span>
        </div>
        
        {workStatus.isDuringWork && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">当前速率</span>
              <span className="text-white font-medium">
                ${currentRate.toFixed(2)}/时
              </span>
            </div>
            
            {remainingBudget > 0 && workStatus.remainingWorkHours > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">建议速率</span>
                <span className={`font-medium ${config.color}`}>
                  ${requiredRate.toFixed(2)}/时
                </span>
              </div>
            )}
          </>
        )}
        
        {!workStatus.isDuringWork && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">工作时间</span>
            <span className="text-gray-300 text-xs">
              {String(workingHours.start).padStart(2, '0')}:00 - {String(workingHours.end).padStart(2, '0')}:00
            </span>
          </div>
        )}
      </div>
      
      {remainingBudget < 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-center">
            <span className="text-purple-400 text-xs">
              超支: ${Math.abs(remainingBudget).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}