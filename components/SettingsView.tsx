import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Eye, EyeOff, TestTube, Save, RefreshCw, Clock, Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { PluginSettings } from '../types';
import { getSettings, saveSettings } from '../utils/storage';
import { testApiConnection } from '../utils/api';
import { validateWorkingHours, getWorkTimeDescription } from '../utils/workingTime';
import { autoMatchFields, getMatchQualityDescription, type AutoMatchResult } from '../utils/fieldMatcher';

const FIELD_LABELS = {
  monthlyBudget: '月度预算',
  monthlySpent: '本月已花费',
  dailyBudget: '日度预算',
  dailySpent: '今日已花费',
} as const;

interface SettingsViewProps {
  onSaveComplete?: () => void;
}

export function SettingsView({ onSaveComplete }: SettingsViewProps) {
  const [settings, setSettings] = useState<PluginSettings>({
    apiUrl: '',
    token: '',
    workingHours: {
      start: 9,
      end: 24,
    },
    mapping: {
      monthlyBudget: '',
      monthlySpent: '',
      dailyBudget: '',
      dailySpent: '',
    },
  });

  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [hasTestedConnection, setHasTestedConnection] = useState(false);
  const [autoMatchResult, setAutoMatchResult] = useState<AutoMatchResult>({});
  const [showAutoMatchInfo, setShowAutoMatchInfo] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await getSettings();
      setSettings(saved);

      // 如果已有配置，检查是否需要显示字段选项
      if (saved.apiUrl && saved.token && Object.values(saved.mapping).some((v) => v)) {
        setHasTestedConnection(true);
      }
    } catch (error) {
      toast.error('加载配置失败');
    }
  };

  const handleTestConnection = async () => {
    if (!settings.apiUrl || !settings.token) {
      toast.error('请填写 API URL 和 Token');
      return;
    }

    setTesting(true);
    try {
      const result = await testApiConnection(settings.apiUrl, settings.token);

      if (result.success && result.fieldKeys) {
        setFieldOptions(result.fieldKeys);
        setHasTestedConnection(true);
        
        // 执行自动匹配
        const matchResult = autoMatchFields(result.fieldKeys);
        setAutoMatchResult(matchResult);
        
        // 自动应用高置信度匹配（85%以上）
        const autoAppliedMatches: string[] = [];
        Object.entries(matchResult).forEach(([targetField, match]) => {
          if (match && match.confidence >= 85) {
            setSettings(prev => ({
              ...prev,
              mapping: {
                ...prev.mapping,
                [targetField]: match.field
              }
            }));
            autoAppliedMatches.push(`${FIELD_LABELS[targetField as keyof typeof FIELD_LABELS]} → ${match.field}`);
          }
        });
        
        const matchCount = Object.keys(matchResult).length;
        const autoAppliedCount = autoAppliedMatches.length;
        
        if (matchCount > 0) {
          toast.success(
            `连接成功！发现 ${result.fieldKeys.length} 个字段，智能匹配了 ${matchCount} 个字段` +
            (autoAppliedCount > 0 ? `，自动应用了 ${autoAppliedCount} 个高置信度匹配` : '')
          );
        } else {
          toast.success(`连接成功！发现 ${result.fieldKeys.length} 个可用字段`);
        }
      } else {
        toast.error(result.error || '连接失败');
        setHasTestedConnection(false);
        setFieldOptions([]);
        setAutoMatchResult({});
      }
    } catch (error) {
      toast.error('测试连接时发生错误');
      setHasTestedConnection(false);
      setFieldOptions([]);
      setAutoMatchResult({});
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!settings.apiUrl || !settings.token) {
      toast.error('请填写 API URL 和 Token');
      return;
    }

    if (!hasTestedConnection) {
      toast.error('请先测试连接');
      return;
    }

    const requiredMappings = Object.values(settings.mapping);
    if (requiredMappings.some((v) => !v)) {
      toast.error('请为所有字段选择映射');
      return;
    }

    setSaving(true);
    try {
      await saveSettings(settings);
      toast.success('配置保存成功！');
      // 延迟调用回调，让用户能看到成功提示
      setTimeout(() => {
        onSaveComplete?.();
      }, 1000);
    } catch (error) {
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const updateMapping = (field: keyof PluginSettings['mapping'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      mapping: {
        ...prev.mapping,
        [field]: value,
      },
    }));
  };

  const updateWorkingHours = (hours: number[]) => {
    if (hours.length === 2) {
      const [start, end] = hours;
      if (validateWorkingHours(start, end)) {
        setSettings((prev) => ({
          ...prev,
          workingHours: { start, end },
        }));
      }
    }
  };

  const handleRematch = () => {
    if (fieldOptions.length === 0) {
      toast.error('请先测试 API 连接');
      return;
    }

    const matchResult = autoMatchFields(fieldOptions);
    setAutoMatchResult(matchResult);

    // 应用所有匹配结果（不管置信度）
    Object.entries(matchResult).forEach(([targetField, match]) => {
      if (match) {
        setSettings(prev => ({
          ...prev,
          mapping: {
            ...prev.mapping,
            [targetField]: match.field
          }
        }));
      }
    });

    const matchCount = Object.keys(matchResult).length;
    if (matchCount > 0) {
      toast.success(`重新匹配完成！匹配了 ${matchCount} 个字段`);
    } else {
      toast('未找到合适的字段匹配');
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-900">
      {/* API 基本配置 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">API 连接配置</CardTitle>
          <CardDescription className="text-sm text-gray-400">配置您的 API URL 和认证信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="apiUrl" className="text-sm text-gray-300">
              API URL *
            </Label>
            <Input
              id="apiUrl"
              placeholder="https://api.example.com/v1/usage"
              value={settings.apiUrl}
              onChange={(e) => setSettings((prev) => ({ ...prev, apiUrl: e.target.value }))}
              className="text-sm bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="token" className="text-sm text-gray-300">
              API Token *
            </Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? 'text' : 'password'}
                placeholder="请输入您的 API Token"
                value={settings.token}
                onChange={(e) => setSettings((prev) => ({ ...prev, token: e.target.value }))}
                className="pr-10 text-sm bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-gray-600 text-gray-400"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleTestConnection}
            disabled={testing || !settings.apiUrl || !settings.token}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            {testing ? (
              <>
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                测试连接中...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-3 w-3" />
                测试连接
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 工作时间配置 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            工作时间设置
          </CardTitle>
          <CardDescription className="text-sm text-gray-400">
            设置您的工作时间区间，消费速率将基于工作时间计算
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm text-gray-300">
              工作时间区间: {getWorkTimeDescription(settings.workingHours.start, settings.workingHours.end)}
            </Label>
            <div className="px-2">
              <Slider
                value={[settings.workingHours.start, settings.workingHours.end]}
                onValueChange={updateWorkingHours}
                min={0}
                max={24}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-2">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-gray-700 p-2 rounded">
            <div className="mb-1">💡 提示：</div>
            <div>• 消费速率将基于设定的工作时间计算</div>
            <div>• 当前时间在工作时间外时会显示相应状态</div>
            <div>• 建议设置为您的实际工作/消费时间段</div>
          </div>
        </CardContent>
      </Card>

      {/* 字段映射配置 */}
      {hasTestedConnection && fieldOptions.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-white">字段映射配置</CardTitle>
                <CardDescription className="text-sm text-gray-400">为每个显示槽位选择对应的 API 响应字段</CardDescription>
              </div>
              <Button
                onClick={handleRematch}
                variant="outline"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                重新匹配
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(FIELD_LABELS).map(([key, label]) => {
              const matchInfo = autoMatchResult[key as keyof AutoMatchResult];
              const isAutoMatched = matchInfo && settings.mapping[key as keyof PluginSettings['mapping']] === matchInfo.field;
              const qualityInfo = matchInfo ? getMatchQualityDescription(matchInfo.confidence) : null;
              
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-300">{label} *</Label>
                    {isAutoMatched && qualityInfo && (
                      <div className="flex items-center space-x-1">
                        <Sparkles className="h-3 w-3 text-blue-400" />
                        <span className={`text-xs ${qualityInfo.color}`}>
                          {qualityInfo.text} ({matchInfo.confidence}%)
                        </span>
                      </div>
                    )}
                  </div>
                  <Select
                    value={settings.mapping[key as keyof PluginSettings['mapping']]}
                    onValueChange={(value) => updateMapping(key as keyof PluginSettings['mapping'], value)}
                  >
                    <SelectTrigger className={`text-sm w-full bg-gray-700 border-gray-600 text-white ${
                      isAutoMatched ? 'border-blue-500 ring-1 ring-blue-500/20' : ''
                    }`}>
                      <SelectValue placeholder={`选择 ${label} 对应的字段`} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {fieldOptions.map((field) => (
                        <SelectItem key={field} value={field} className="text-white hover:bg-gray-600">
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {isAutoMatched && matchInfo && (
                    <div className="text-xs text-gray-500 bg-gray-700 p-2 rounded">
                      <div className="flex items-center space-x-1">
                        <span>匹配原因:</span>
                        <span className="text-blue-400">{matchInfo.reason}</span>
                      </div>
                      <div>匹配关键词: {matchInfo.matchedKeywords.join(', ')}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 保存按钮 */}
      {hasTestedConnection && (
        <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700" size="sm">
          {saving ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-3 w-3" />
              保存配置
            </>
          )}
        </Button>
      )}
    </div>
  );
}
