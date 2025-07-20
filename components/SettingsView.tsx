import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, TestTube, RefreshCw, Clock, Sparkles, RotateCcw, Bell, BellOff, AlertTriangle, Database, Download, Upload, Trash2 } from 'lucide-react';
import { getWorkTimeDescription } from '../utils/workingTime';
import { getMatchQualityDescription } from '../utils/fieldMatcher';
import { useSettingsStore } from '../stores/settingsStore';
import type { PluginSettings } from '../types';

const FIELD_LABELS = {
  monthlyBudget: '月度预算',
  monthlySpent: '本月已花费',
  dailyBudget: '日度预算',
  dailySpent: '今日已花费',
} as const;

interface SettingsViewProps {
  // 移除了 onSaveComplete 和 onSaveClick，因为现在通过 store 管理
}

export const SettingsView = (_props: SettingsViewProps) => {
  // 使用 Zustand store 替代所有本地状态
  const {
    settings,
    testing,
    fieldOptions,
    hasTestedConnection,
    autoMatchResult,
    initializeStore,
    testConnection,
    updateMapping,
    updateWorkingHours,
    updateNotificationEnabled,
    updateQueryInterval,
    updateDailyThreshold,
    updateMonthlyThreshold,
    updateAlertThreshold,
    rematchFields,
    updateSettings,
    exportData,
    importData,
    clearData
  } = useSettingsStore();

  const [showToken, setShowToken] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 移除本地的 loadSettings 和 handleSave 方法，使用 store 中的方法

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // 数据管理功能处理函数
  const handleExport = async () => {
    await exportData();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await importData(file);
      // 清空 input 以便可以再次选择相同文件
      event.target.value = '';
    }
  };

  const handleClear = async () => {
    if (clearConfirm) {
      await clearData();
      setClearConfirm(false);
    } else {
      setClearConfirm(true);
      // 3秒后自动取消确认状态
      setTimeout(() => setClearConfirm(false), 3000);
    }
  };

  // 移除 useImperativeHandle，不再需要暴露方法给父组件

  // 使用 store 中的 testConnection 方法

  // 移除本地的更新方法，使用 store 中的方法

  // 使用 store 中的 rematchFields 方法

  // 如果 settings 还未加载完成，显示加载状态
  if (!settings) {
    return (
      <div className="p-4 space-y-4 bg-gray-900">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-400">加载配置中...</div>
        </div>
      </div>
    );
  }

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
              onChange={(e) => updateSettings({ apiUrl: e.target.value })}
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
                onChange={(e) => updateSettings({ token: e.target.value })}
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
            onClick={testConnection}
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

      {/* 智能通知配置 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center">
            {settings.notifications.enabled ? (
              <Bell className="mr-2 h-4 w-4 text-blue-400" />
            ) : (
              <BellOff className="mr-2 h-4 w-4 text-gray-500" />
            )}
            智能通知设置
          </CardTitle>
          <CardDescription className="text-sm text-gray-400">
            配置预算警告通知，当使用量达到阈值时自动提醒
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 通知开关 */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm text-gray-300">启用通知</Label>
              <p className="text-xs text-gray-500">开启后将在预算使用达到阈值时发送桌面通知</p>
            </div>
            <Switch
              checked={settings.notifications.enabled}
              onCheckedChange={updateNotificationEnabled}
            />
          </div>

          {/* 通知详细配置 - 仅在开启通知时显示 */}
          {settings.notifications.enabled && (
            <>
              {/* 查询间隔配置 */}
              <div className="space-y-3">
                <Label className="text-sm text-gray-300">
                  查询间隔: {settings.notifications.queryInterval} 分钟
                </Label>
                <div className="px-2">
                  <Slider
                    value={[settings.notifications.queryInterval]}
                    onValueChange={updateQueryInterval}
                    min={1}
                    max={60}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 px-2">
                  <span>1分钟</span>
                  <span>15分钟</span>
                  <span>30分钟</span>
                  <span>60分钟</span>
                </div>
              </div>

              {/* 日度预算阈值 */}
              <div className="space-y-3">
                <Label className="text-sm text-gray-300">
                  日度预算警告阈值: {settings.notifications.thresholds.dailyBudget}%
                </Label>
                <div className="px-2">
                  <Slider
                    value={[settings.notifications.thresholds.dailyBudget]}
                    onValueChange={updateDailyThreshold}
                    min={50}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 px-2">
                  <span>50%</span>
                  <span>70%</span>
                  <span>85%</span>
                  <span>95%</span>
                </div>
              </div>

              {/* 月度预算阈值 */}
              <div className="space-y-3">
                <Label className="text-sm text-gray-300">
                  月度预算警告阈值: {settings.notifications.thresholds.monthlyBudget}%
                </Label>
                <div className="px-2">
                  <Slider
                    value={[settings.notifications.thresholds.monthlyBudget]}
                    onValueChange={updateMonthlyThreshold}
                    min={50}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 px-2">
                  <span>50%</span>
                  <span>70%</span>
                  <span>85%</span>
                  <span>95%</span>
                </div>
              </div>

              {/* 通知说明 */}
              <div className="text-xs text-gray-500 bg-gray-700 p-2 rounded">
                <div className="mb-1">💡 通知说明：</div>
                <div>• 通知将在预算使用率首次达到阈值时发送</div>
                <div>• 每种通知类型30分钟内最多发送一次</div>
                <div>• 每日/月度开始时会重置通知状态</div>
                <div>• 请确保浏览器允许此扩展发送通知</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 警示阈值配置 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center">
            <AlertTriangle className="mr-2 h-4 w-4 text-yellow-400" />
            警示阈值设置
          </CardTitle>
          <CardDescription className="text-sm text-gray-400">
            自定义预算警示级别的触发阈值，控制何时显示不同级别的警告
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 危险阈值 */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-300 flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              危险阈值: {settings.alertThresholds?.danger?.toFixed(1)}x
            </Label>
            <div className="px-2">
              <Slider
                value={[settings.alertThresholds?.danger || 1.5]}
                onValueChange={(value) => updateAlertThreshold('danger', value)}
                min={1.3}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>
            <p className="text-xs text-gray-500">当消费速率超过建议速率的此倍数时，显示红色危险警告</p>
          </div>

          {/* 警告阈值 */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-300 flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              警告阈值: {settings.alertThresholds?.warning?.toFixed(1)}x
            </Label>
            <div className="px-2">
              <Slider
                value={[settings.alertThresholds?.warning || 1.2]}
                onValueChange={(value) => updateAlertThreshold('warning', value)}
                min={1.1}
                max={1.5}
                step={0.1}
                className="w-full"
              />
            </div>
            <p className="text-xs text-gray-500">当消费速率超过建议速率的此倍数时，显示橙色警告</p>
          </div>

          {/* 谨慎阈值 */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-300 flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              谨慎阈值: {settings.alertThresholds?.caution?.toFixed(1)}x
            </Label>
            <div className="px-2">
              <Slider
                value={[settings.alertThresholds?.caution || 1.0]}
                onValueChange={(value) => updateAlertThreshold('caution', value)}
                min={0.9}
                max={1.2}
                step={0.1}
                className="w-full"
              />
            </div>
            <p className="text-xs text-gray-500">当消费速率超过建议速率的此倍数时，显示黄色谨慎提醒</p>
          </div>

          {/* 正常范围下限 */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-300 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              正常范围下限: {settings.alertThresholds?.normalMin?.toFixed(1)}x
            </Label>
            <div className="px-2">
              <Slider
                value={[settings.alertThresholds?.normalMin || 0.8]}
                onValueChange={(value) => updateAlertThreshold('normalMin', value)}
                min={0.5}
                max={0.9}
                step={0.1}
                className="w-full"
              />
            </div>
            <p className="text-xs text-gray-500">当消费速率高于建议速率的此倍数时，显示绿色正常状态</p>
          </div>

          {/* 阈值说明 */}
          <div className="text-xs text-gray-500 bg-gray-700 p-2 rounded">
            <div className="mb-1">💡 阈值说明：</div>
            <div>• 速率比值 = 当前消费速率 ÷ 建议消费速率</div>
            <div>• 比值越高表示消费越快，需要更严格控制</div>
            <div>• 比值低于正常下限时显示蓝色保守状态</div>
            <div>• 调整阈值会实时影响警示级别的判断</div>
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
                onClick={rematchFields}
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

      {/* 数据管理 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center">
            <Database className="mr-2 h-4 w-4 text-blue-400" />
            数据管理
          </CardTitle>
          <CardDescription className="text-sm text-gray-400">
            导出、导入或清空所有设置和历史数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 操作按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleExport} 
              variant="outline" 
              size="sm"
              className="flex-1 min-w-[120px] bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              <Download className="mr-2 h-3 w-3" />
              导出数据
            </Button>
            
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline" 
              size="sm"
              className="flex-1 min-w-[120px] bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              <Upload className="mr-2 h-3 w-3" />
              导入数据
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            
            <Button 
              onClick={handleClear} 
              variant={clearConfirm ? "destructive" : "outline"} 
              size="sm"
              className={`flex-1 min-w-[120px] ${
                clearConfirm 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
              }`}
            >
              <Trash2 className="mr-2 h-3 w-3" />
              {clearConfirm ? '确认清空' : '清空数据'}
            </Button>
          </div>
          
          {/* 操作说明 */}
          <div className="text-xs text-gray-500 bg-gray-700 p-2 rounded">
            <div className="mb-1">💡 说明：</div>
            <div>• 导出包含所有设置和历史数据，保存为 JSON 文件</div>
            <div>• 导入会完全覆盖现有的所有数据</div>
            <div>• 清空数据操作不可恢复，请谨慎使用</div>
            <div>• 建议定期导出数据作为备份</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

SettingsView.displayName = 'SettingsView';
