import { useState, useEffect } from 'react';
import { Settings, RefreshCw, AlertTriangle, ArrowLeft, TrendingUp, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataGrid } from '../../components/DataGrid';
import { SettingsView } from '../../components/SettingsView';
import { UsageChart } from '../../components/UsageChart';
import { toast, Toaster } from 'react-hot-toast';
import type { HistoricalDataPoint } from '../../types';
import { getHistoricalData } from '../../utils/storage';
import { getPopupStyles } from '../../utils/browser';
import { useSettingsStore } from '../../stores/settingsStore';

function App() {
  // 使用 Zustand store 管理所有状态
  const { 
    settings, 
    isLoaded, 
    data, 
    dataLoading, 
    error, 
    saving, 
    canSave, 
    saveSettings, 
    initializeStore,
    refreshData 
  } = useSettingsStore();
  
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'chart'>('main');
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);

  // 应用启动时初始化 store
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const openSettingsView = () => {
    setCurrentView('settings');
  };

  const backToMain = () => {
    setCurrentView('main');
  };

  const handleRefresh = () => {
    refreshData();
  };

  const openChartView = async () => {
    try {
      const historical = await getHistoricalData();
      setHistoricalData(historical.data);
      setCurrentView('chart');
    } catch (error) {
      console.error('Error loading historical data:', error);
      toast.error('加载历史数据失败');
    }
  };

  const backToMainFromChart = () => {
    setCurrentView('main');
  };

  const handleSettingsSave = async () => {
    if (!canSave()) {
      toast.error('请确保所有必填项已填写');
      return;
    }

    try {
      await saveSettings();
      // 保存成功后返回主页面
      setCurrentView('main');
      // 数据加载会由 store 的 saveSettings 方法自动触发
    } catch (error) {
      // 错误已经在 store 中处理了，这里只处理 UI 状态
      console.error('Settings save error:', error);
    }
  };

  const popupStyles = getPopupStyles();

  if (currentView === 'settings') {
    return (
      <div className="w-96 min-h-[300px] max-h-[600px] bg-gray-900 flex flex-col" style={popupStyles}>
        {/* 设置页面头部 - 固定吸顶 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900 sticky top-0 z-10">
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
          <Button
            onClick={handleSettingsSave}
            disabled={saving || !canSave()}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            size="sm"
          >
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                保存中
              </>
            ) : (
              <>
                <Save className="mr-2 h-3 w-3" />
                保存
              </>
            )}
          </Button>
        </div>

        {/* 设置内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto">
          <SettingsView />
        </div>

        <Toaster position="top-center" />
      </div>
    );
  }

  if (currentView === 'chart') {
    return (
      <div className="w-[600px] min-h-[400px] max-h-[600px] bg-gray-900 flex flex-col" style={popupStyles}>
        {/* 图表页面头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={backToMainFromChart}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-lg font-semibold text-white">历史趋势</h1>
          <div className="w-16"></div>
        </div>

        {/* 图表内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <UsageChart data={historicalData} />
        </div>

        <Toaster position="top-center" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-96 min-h-[200px] p-6 flex flex-col items-center justify-center text-center bg-gray-900 text-white" style={popupStyles}>
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
    <div className="w-96 min-h-[200px] bg-gray-900 text-white flex flex-col" style={popupStyles}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h1 className="text-lg font-semibold text-white">使用统计</h1>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRefresh}
            disabled={dataLoading}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={openChartView}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
            title="查看历史"
          >
            <TrendingUp className="w-4 h-4" />
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
            loading={dataLoading}
          />
        )}
      </div>

      <Toaster position="top-center" />
    </div>
  );
}

export default App;
