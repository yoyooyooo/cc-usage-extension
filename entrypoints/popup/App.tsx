import { useState, useEffect } from 'react';
import { Settings, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataGrid } from '../../components/DataGrid';
import { SettingsView } from '../../components/SettingsView';
import { toast, Toaster } from 'react-hot-toast';
import type { PluginSettings, ApiResponse } from '../../types';
import { getSettings } from '../../utils/storage';
import { fetchApiData } from '../../utils/api';

function App() {
  const [settings, setSettings] = useState<PluginSettings | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');

  useEffect(() => {
    loadDataAndSettings();
  }, []);

  const loadDataAndSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 加载设置
      const savedSettings = await getSettings();
      setSettings(savedSettings);
      
      // 检查配置是否完整
      if (!savedSettings.apiUrl || !savedSettings.token) {
        setError('请先在设置页面配置 API');
        return;
      }
      
      const hasValidMapping = Object.values(savedSettings.mapping).some(v => v.trim());
      if (!hasValidMapping) {
        setError('请先在设置页面配置字段映射');
        return;
      }
      
      // 获取 API 数据
      const apiData = await fetchApiData(savedSettings);
      setData(apiData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const openSettingsView = () => {
    setCurrentView('settings');
  };

  const backToMain = () => {
    setCurrentView('main');
    // 重新加载数据以反映可能的配置更改
    loadDataAndSettings();
  };

  const handleRefresh = () => {
    loadDataAndSettings();
  };

  if (currentView === 'settings') {
    return (
      <div className="w-96 h-96 bg-gray-900">
        {/* 设置页面头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={backToMain}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-lg font-semibold text-white">设置</h1>
          <div className="w-16"></div> {/* 占位元素保持标题居中 */}
        </div>

        {/* 设置内容区域 */}
        <div className="flex-1 overflow-y-auto">
          <SettingsView onSaveComplete={backToMain} />
        </div>

        <Toaster position="top-center" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-96 h-96 p-6 flex flex-col items-center justify-center text-center bg-gray-900 text-white">
        <AlertTriangle className="w-16 h-16 text-orange-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2 text-white">配置需要完善</h2>
        <p className="text-gray-400 mb-4 text-sm">{error}</p>
        <Button onClick={openSettingsView} className="w-full bg-blue-600 hover:bg-blue-700">
          <Settings className="w-4 h-4 mr-2" />
          打开设置
        </Button>
      </div>
    );
  }

  return (
    <div className="w-96 h-96 bg-gray-900 text-white">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h1 className="text-lg font-semibold text-white">使用统计</h1>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={openSettingsView}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 数据展示区域 */}
      <div className="flex-1">
        {settings && (
          <DataGrid 
            settings={settings} 
            data={data} 
            loading={loading}
          />
        )}
      </div>

      <Toaster position="top-center" />
    </div>
  );
}

export default App;
