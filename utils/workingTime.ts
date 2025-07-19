/**
 * 时间处理工具函数
 */

/**
 * 工作时间状态接口
 */
export interface WorkingTimeStatus {
  isBeforeWork: boolean;
  isDuringWork: boolean;
  isAfterWork: boolean;
  elapsedWorkHours: number;
  remainingWorkHours: number;
  currentHour: number;
  workStart: number;
  workEnd: number;
}

/**
 * 将小时数转换为时间显示格式
 * @param hour 小时数 (0-24)
 * @returns 格式化的时间字符串 (如 "09:00")
 */
export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * 计算当前时间在工作时间内的状态
 * @param workStart 工作开始时间 (小时)
 * @param workEnd 工作结束时间 (小时)
 * @returns 工作时间状态信息
 */
export function getWorkingTimeStatus(workStart: number, workEnd: number): WorkingTimeStatus {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  
  // 今日工作开始和结束时间
  const startOfDay = new Date();
  startOfDay.setHours(workStart, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(workEnd, 0, 0, 0);
  
  // 如果工作结束时间是24点，设置为当天23:59:59
  if (workEnd === 24) {
    endOfDay.setHours(23, 59, 59, 999);
  }
  
  const isBeforeWork = now < startOfDay;
  const isAfterWork = now > endOfDay;
  const isDuringWork = !isBeforeWork && !isAfterWork;
  
  // 计算已工作时间（小时）
  let elapsedWorkHours = 0;
  if (isDuringWork) {
    elapsedWorkHours = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
  } else if (isAfterWork) {
    elapsedWorkHours = workEnd - workStart;
  }
  
  // 计算剩余工作时间（小时）
  let remainingWorkHours = 0;
  if (isDuringWork) {
    remainingWorkHours = (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60);
  }
  
  return {
    isBeforeWork,
    isDuringWork,
    isAfterWork,
    elapsedWorkHours: Math.max(0, elapsedWorkHours),
    remainingWorkHours: Math.max(0, remainingWorkHours),
    currentHour,
    workStart,
    workEnd,
  };
}

/**
 * 获取工作时间描述文本
 * @param workStart 工作开始时间
 * @param workEnd 工作结束时间
 * @returns 工作时间描述
 */
export function getWorkTimeDescription(workStart: number, workEnd: number): string {
  return `${formatHour(workStart)} - ${formatHour(workEnd)}`;
}

/**
 * 验证工作时间配置的合理性
 * @param start 开始时间
 * @param end 结束时间
 * @returns 是否合理
 */
export function validateWorkingHours(start: number, end: number): boolean {
  return start >= 0 && end <= 24 && start < end;
}