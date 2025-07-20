// 旧版本数据转换脚本
// 在老版本扩展的控制台中运行此脚本

(async function convertLegacyData() {
  console.log('🔄 开始转换旧版本数据...');
  
  try {
    // 1. 获取设置数据
    const settingsResult = await chrome.storage.sync.get('plugin_settings');
    const settings = settingsResult.plugin_settings;
    
    if (!settings) {
      throw new Error('未找到设置数据');
    }
    
    // 2. 获取历史数据
    const historicalResult = await chrome.storage.local.get('historical_data');
    const historicalData = historicalResult.historical_data || { data: [], lastUpdated: 0 };
    
    // 3. 构建完整的设置数据（填充缺失的默认值）
    const completeSettings = {
      apiUrl: settings.apiUrl || '',
      token: settings.token || '',
      workingHours: {
        start: settings.workingHours?.start ?? 9,
        end: settings.workingHours?.end ?? 24,
      },
      mapping: {
        monthlyBudget: settings.mapping?.monthlyBudget || '',
        monthlySpent: settings.mapping?.monthlySpent || '',
        dailyBudget: settings.mapping?.dailyBudget || '',
        dailySpent: settings.mapping?.dailySpent || '',
      },
      notifications: {
        enabled: settings.notifications?.enabled ?? false,
        queryInterval: settings.notifications?.queryInterval ?? 5,
        thresholds: {
          dailyBudget: settings.notifications?.thresholds?.dailyBudget ?? 80,
          monthlyBudget: settings.notifications?.thresholds?.monthlyBudget ?? 90,
        },
      },
      alertThresholds: {
        danger: settings.alertThresholds?.danger ?? 1.5,
        warning: settings.alertThresholds?.warning ?? 1.2,
        caution: settings.alertThresholds?.caution ?? 1.0,
        normalMin: settings.alertThresholds?.normalMin ?? 0.8,
      },
    };
    
    // 4. 处理历史数据
    const dataPoints = historicalData.data || [];
    
    // 5. 计算数据范围
    const dateRange = dataPoints.length > 0 ? {
      start: new Date(Math.min(...dataPoints.map(p => p.timestamp))).toISOString(),
      end: new Date(Math.max(...dataPoints.map(p => p.timestamp))).toISOString(),
    } : {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    };
    
    // 6. 构建导出数据
    const exportData = {
      exportVersion: '1.0.0',
      exportDate: new Date().toISOString().split('T')[0],
      settings: completeSettings,
      historicalData: dataPoints,
      metadata: {
        totalDataPoints: dataPoints.length,
        dateRange,
        exportedAt: Date.now(),
      },
    };
    
    // 7. 下载 JSON 文件
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `cc-usage-legacy-backup-${timestamp}.json`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log('✅ 转换成功！文件已下载:', filename);
    console.log('📊 数据统计:');
    console.log('- 设置数据:', completeSettings);
    console.log('- 历史数据点数量:', dataPoints.length);
    console.log('- 数据时间范围:', dateRange);
    
    return exportData;
    
  } catch (error) {
    console.error('❌ 转换失败:', error);
    throw error;
  }
})();