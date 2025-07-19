import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, TestTube, Save, RefreshCw } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import type { PluginSettings } from '../../types';
import { getSettings, saveSettings } from '../../utils/storage';
import { testApiConnection } from '../../utils/api';

const FIELD_LABELS = {
  monthlyBudget: '月度预算',
  monthlySpent: '本月已花费',
  dailyBudget: '日度预算',
  dailySpent: '今日已花费',
} as const;

export default function Options() {
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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await getSettings();
      setSettings(saved);
      
      // 如果已有配置，检查是否需要显示字段选项
      if (saved.apiUrl && saved.token && Object.values(saved.mapping).some(v => v)) {
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
        toast.success(`连接成功！发现 ${result.fieldKeys.length} 个可用字段`);
      } else {
        toast.error(result.error || '连接失败');
        setHasTestedConnection(false);
        setFieldOptions([]);
      }
    } catch (error) {
      toast.error('测试连接时发生错误');
      setHasTestedConnection(false);
      setFieldOptions([]);
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
    if (requiredMappings.some(v => !v)) {
      toast.error('请为所有字段选择映射');
      return;
    }

    setSaving(true);
    try {
      await saveSettings(settings);
      toast.success('配置保存成功！');
    } catch (error) {
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const updateMapping = (field: keyof PluginSettings['mapping'], value: string) => {
    setSettings(prev => ({
      ...prev,
      mapping: {
        ...prev.mapping,
        [field]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">API 配置</h1>
          <p className="text-gray-600 mt-2">配置您的 API 连接和字段映射</p>
        </div>

        {/* API 基本配置 */}
        <Card>
          <CardHeader>
            <CardTitle>API 连接配置</CardTitle>
            <CardDescription>配置您的 API URL 和认证信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL *</Label>
              <Input
                id="apiUrl"
                placeholder="https://api.example.com/v1/usage"
                value={settings.apiUrl}
                onChange={(e) => setSettings(prev => ({ ...prev, apiUrl: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token">API Token *</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="请输入您的 API Token"
                  value={settings.token}
                  onChange={(e) => setSettings(prev => ({ ...prev, token: e.target.value }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button 
              onClick={handleTestConnection} 
              disabled={testing || !settings.apiUrl || !settings.token}
              className="w-full"
            >
              {testing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  测试连接中...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  测试连接
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 字段映射配置 */}
        {hasTestedConnection && fieldOptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>字段映射配置</CardTitle>
              <CardDescription>
                为每个显示槽位选择对应的 API 响应字段
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label} *</Label>
                  <Select
                    value={settings.mapping[key as keyof PluginSettings['mapping']]}
                    onValueChange={(value) => updateMapping(key as keyof PluginSettings['mapping'], value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`选择 ${label} 对应的字段`} />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 保存按钮 */}
        {hasTestedConnection && (
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full"
                size="lg"
              >
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存配置
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}