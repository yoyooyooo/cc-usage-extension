import { useEffect } from 'react';
import { SettingsView } from '../../components/SettingsView';
import { useSettingsStore } from '../../stores/settingsStore';
import { Toaster } from 'react-hot-toast';

export default function Options() {
  const { initializeStore } = useSettingsStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">API 配置</h1>
          <p className="text-gray-600 mt-2">配置您的 API 连接和字段映射</p>
        </div>

        <SettingsView />
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}