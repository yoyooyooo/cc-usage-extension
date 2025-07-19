import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  className?: string;
  onRemainingHoursChange?: (hours: number) => void;
  onElapsedHoursChange?: (hours: number) => void;
}

export function CountdownTimer({ className = "", onRemainingHoursChange, onElapsedHoursChange }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const totalDiff = endOfDay.getTime() - now.getTime();
      const elapsedDiff = now.getTime() - startOfDay.getTime();
      
      if (totalDiff > 0) {
        const hours = Math.floor(totalDiff / (1000 * 60 * 60));
        const minutes = Math.floor((totalDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((totalDiff % (1000 * 60)) / 1000);
        
        setTimeLeft({ hours, minutes, seconds });
        
        // 计算剩余小时数（包含分钟的小数部分）
        const remainingHours = hours + minutes / 60 + seconds / 3600;
        onRemainingHoursChange?.(remainingHours);
        
        // 计算已过去小时数
        const elapsedHours = elapsedDiff / (1000 * 60 * 60);
        onElapsedHoursChange?.(elapsedHours);
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        onRemainingHoursChange?.(0);
        
        // 如果已过了当天，已过去时间为24小时
        const elapsedHours = 24;
        onElapsedHoursChange?.(elapsedHours);
      }
    };

    // 立即更新一次
    updateTime();
    
    // 每秒更新
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center justify-center space-x-2 text-gray-300 ${className}`}>
      <Clock className="w-4 h-4 text-blue-400" />
      <div className="text-sm font-medium">
        今日剩余：
        <span className="text-white ml-1">
          {timeLeft.hours.toString().padStart(2, '0')}:
          {timeLeft.minutes.toString().padStart(2, '0')}:
          {timeLeft.seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}