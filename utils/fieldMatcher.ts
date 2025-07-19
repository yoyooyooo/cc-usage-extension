import type { PluginSettings } from '../types';

/**
 * 字段匹配规则接口
 */
interface MatchRule {
  timeKeywords: string[];     // 时间相关关键词 (month, daily 等)
  typeKeywords: string[];     // 类型相关关键词 (budget, spent 等)
  timeWeight: number;         // 时间关键词权重
  typeWeight: number;         // 类型关键词权重
  aliases: string[];          // 别名
}

/**
 * 匹配结果接口
 */
export interface MatchResult {
  field: string;
  confidence: number;
  matchedKeywords: string[];
  reason: string;
}

/**
 * 自动匹配结果接口
 */
export interface AutoMatchResult {
  monthlyBudget?: MatchResult;
  monthlySpent?: MatchResult;
  dailyBudget?: MatchResult;
  dailySpent?: MatchResult;
}

/**
 * 字段匹配规则配置
 */
const MATCH_RULES: Record<keyof PluginSettings['mapping'], MatchRule> = {
  monthlyBudget: {
    timeKeywords: ['month', 'monthly', 'mon'],
    typeKeywords: ['budget', 'limit', 'allowance', 'quota', 'allocation'],
    timeWeight: 10,
    typeWeight: 10,
    aliases: ['month_budget', 'monthly_budget', 'monthlybudget']
  },
  monthlySpent: {
    timeKeywords: ['month', 'monthly', 'mon'],
    typeKeywords: ['spent', 'spend', 'used', 'cost', 'consumed', 'usage', 'expense'],
    timeWeight: 10,
    typeWeight: 10,
    aliases: ['month_spent', 'monthly_spent', 'monthlyspent', 'month_used', 'monthly_used']
  },
  dailyBudget: {
    timeKeywords: ['day', 'daily', 'today', 'per_day'],
    typeKeywords: ['budget', 'limit', 'allowance', 'quota', 'allocation'],
    timeWeight: 10,
    typeWeight: 10,
    aliases: ['day_budget', 'daily_budget', 'dailybudget', 'today_budget']
  },
  dailySpent: {
    timeKeywords: ['day', 'daily', 'today', 'per_day'],
    typeKeywords: ['spent', 'spend', 'used', 'cost', 'consumed', 'usage', 'expense'],
    timeWeight: 10,
    typeWeight: 10,
    aliases: ['day_spent', 'daily_spent', 'dailyspent', 'today_spent', 'day_used', 'daily_used']
  }
};

/**
 * 规范化字段名：转小写，处理分隔符
 */
function normalizeFieldName(fieldName: string): string[] {
  return fieldName
    .toLowerCase()
    .replace(/[-_]/g, ' ')  // 将 - 和 _ 替换为空格
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // 处理驼峰命名
    .split(/\s+/)  // 按空格分割
    .filter(word => word.length > 0);
}

/**
 * 计算字段匹配分数
 */
function calculateMatchScore(fieldName: string, rule: MatchRule): {
  score: number;
  matchedKeywords: string[];
  reason: string;
} {
  const normalizedWords = normalizeFieldName(fieldName);
  const fieldLower = fieldName.toLowerCase();
  
  let score = 0;
  const matchedKeywords: string[] = [];
  const reasons: string[] = [];
  
  // 检查别名完全匹配（最高优先级）
  for (const alias of rule.aliases) {
    if (fieldLower === alias || fieldLower.replace(/[-_]/g, '') === alias.replace(/[-_]/g, '')) {
      return {
        score: 100,
        matchedKeywords: [alias],
        reason: `完全匹配别名 "${alias}"`
      };
    }
  }
  
  // 检查时间关键词匹配
  let timeMatched = false;
  for (const timeKeyword of rule.timeKeywords) {
    if (normalizedWords.includes(timeKeyword) || fieldLower.includes(timeKeyword)) {
      score += rule.timeWeight;
      matchedKeywords.push(timeKeyword);
      timeMatched = true;
      reasons.push(`时间关键词 "${timeKeyword}"`);
      break; // 只匹配一个时间关键词
    }
  }
  
  // 检查类型关键词匹配
  let typeMatched = false;
  for (const typeKeyword of rule.typeKeywords) {
    if (normalizedWords.includes(typeKeyword) || fieldLower.includes(typeKeyword)) {
      score += rule.typeWeight;
      matchedKeywords.push(typeKeyword);
      typeMatched = true;
      reasons.push(`类型关键词 "${typeKeyword}"`);
      break; // 只匹配一个类型关键词
    }
  }
  
  // 组合匹配奖励
  if (timeMatched && typeMatched) {
    score += 5; // 组合匹配奖励
    reasons.push('时间+类型组合匹配');
  }
  
  // 字段名长度惩罚（避免匹配过于宽泛的字段）
  if (normalizedWords.length > 4) {
    score -= 2;
  }
  
  return {
    score: Math.max(0, score),
    matchedKeywords,
    reason: reasons.join(', ')
  };
}

/**
 * 自动匹配字段
 */
export function autoMatchFields(fieldKeys: string[]): AutoMatchResult {
  const result: AutoMatchResult = {};
  const usedFields = new Set<string>();
  
  // 为每个目标字段找到最佳匹配
  for (const [targetField, rule] of Object.entries(MATCH_RULES)) {
    let bestMatch: {
      field: string;
      score: number;
      matchedKeywords: string[];
      reason: string;
    } | null = null;
    
    for (const fieldKey of fieldKeys) {
      // 跳过已被使用的字段
      if (usedFields.has(fieldKey)) continue;
      
      const matchResult = calculateMatchScore(fieldKey, rule);
      
      // 只考虑置信度足够高的匹配（阈值：15分）
      if (matchResult.score >= 15) {
        if (!bestMatch || matchResult.score > bestMatch.score) {
          bestMatch = {
            field: fieldKey,
            score: matchResult.score,
            matchedKeywords: matchResult.matchedKeywords,
            reason: matchResult.reason
          };
        }
      }
    }
    
    // 如果找到了好的匹配，记录结果
    if (bestMatch) {
      usedFields.add(bestMatch.field);
      
      // 转换分数为置信度百分比
      const confidence = Math.min(100, Math.round((bestMatch.score / 25) * 100));
      
      result[targetField as keyof AutoMatchResult] = {
        field: bestMatch.field,
        confidence,
        matchedKeywords: bestMatch.matchedKeywords,
        reason: bestMatch.reason
      };
    }
  }
  
  return result;
}

/**
 * 获取匹配质量描述
 */
export function getMatchQualityDescription(confidence: number): {
  text: string;
  color: string;
} {
  if (confidence >= 90) {
    return { text: '高置信度匹配', color: 'text-green-500' };
  } else if (confidence >= 70) {
    return { text: '中等置信度匹配', color: 'text-yellow-500' };
  } else if (confidence >= 50) {
    return { text: '低置信度匹配', color: 'text-orange-500' };
  } else {
    return { text: '匹配度较低', color: 'text-red-500' };
  }
}