# 消费趋势分析功能设计方案

## 概述

本设计方案基于现有的 cc-usage 浏览器插件架构，在保持向后兼容的前提下，添加消费趋势分析功能。设计将遵循现有的 WXT + React + TypeScript + Zustand 架构模式，并扩展当前的图表和数据分析能力。

## 系统架构

### 架构原则

1. **渐进增强**：新功能作为现有系统的增强模块，不影响核心功能
2. **模块化设计**：每个分析功能作为独立组件，便于维护和扩展
3. **数据驱动**：基于历史数据驱动分析，支持实时和离线分析
4. **性能优先**：大数据集处理采用分页、虚拟化和 Web Workers
5. **用户体验**：提供直观的可视化界面和智能化的洞察

### 技术栈

**前端框架**：
- React 19 + TypeScript
- Zustand (状态管理)
- Recharts (数据可视化)
- shadcn/ui (UI组件库)
- Tailwind CSS (样式)

**数据处理**：
- 客户端数据分析算法
- 统计计算库
- 预测模型算法

**存储方案**：
- chrome.storage.local (历史数据)
- chrome.storage.sync (用户配置)
- IndexedDB (大数据集缓存，可选)

## 组件架构

### 核心组件结构

```
components/
├── analysis/                    # 趋势分析组件目录
│   ├── TrendAnalysisContainer.tsx    # 主容器组件
│   ├── PatternRecognition.tsx        # 消费模式识别
│   ├── PredictionEngine.tsx          # 预测分析引擎
│   ├── ComparisonAnalysis.tsx        # 对比分析
│   ├── HeatmapVisualization.tsx      # 热力图可视化
│   ├── InsightGenerator.tsx          # 智能洞察生成
│   ├── UserProfileAnalysis.tsx       # 用户画像分析
│   ├── GoalTracker.tsx               # 目标跟踪
│   └── ExportManager.tsx             # 数据导出管理
├── charts/                     # 图表组件扩展
│   ├── HeatmapChart.tsx              # 热力图组件
│   ├── WaterfallChart.tsx            # 瀑布图组件
│   ├── ScatterChart.tsx              # 散点图组件
│   ├── BoxPlotChart.tsx              # 箱线图组件
│   └── PredictionChart.tsx           # 预测图表组件
└── insights/                   # 洞察组件
    ├── InsightCard.tsx               # 洞察卡片
    ├── TrendSummary.tsx              # 趋势摘要
    ├── AnomalyAlert.tsx              # 异常警告
    └── RecommendationPanel.tsx       # 建议面板
```

### 数据流架构

```
用户交互 → TrendAnalysisContainer → Zustand Store → 分析引擎 → 可视化组件
    ↓                                      ↓
Chrome Storage ← 数据持久化 ← 分析结果 ← 历史数据分析
```

## 数据模型设计

### 扩展的数据类型

```typescript
// 扩展现有的 HistoricalDataPoint
interface EnhancedHistoricalDataPoint extends HistoricalDataPoint {
  dayOfWeek: number;           // 星期几 (0-6)
  isWorkday: boolean;          // 是否工作日
  hourlySpentIncrease?: number; // 小时消费增量
  cumulativeSpent: number;     // 累计消费
  efficiency?: number;         // 消费效率指标
}

// 消费模式分析结果
interface ConsumptionPattern {
  id: string;
  type: 'peak' | 'valley' | 'steady' | 'burst';
  label: string;               // 如 "晚间型"、"冲刺型"
  confidence: number;          // 置信度 0-1
  description: string;         // 模式描述
  timeRange: {
    start: number;             // 开始小时
    end: number;               // 结束小时
  };
  frequency: number;           // 出现频率
  strength: number;            // 模式强度
}

// 预测结果
interface PredictionResult {
  timestamp: number;
  predictedValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  uncertainty: number;         // 不确定性 0-1
  factors: string[];           // 影响因素
}

// 异常检测结果
interface AnomalyDetection {
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'pattern_break';
  description: string;
  suggestedAction?: string;
  isConfirmed: boolean;        // 用户是否确认为真实异常
}

// 用户行为画像
interface UserProfile {
  userId: string;
  consumptionPersonality: {
    primary: string;           // 主要类型
    secondary?: string;        // 次要类型
    traits: string[];          // 行为特征
  };
  preferences: {
    peakHours: number[];       // 偏好时段
    workdayPattern: ConsumptionPattern;
    weekendPattern: ConsumptionPattern;
  };
  adaptiveThresholds: {
    danger: number;
    warning: number;
    caution: number;
    normalMin: number;
  };
  lastUpdated: number;
}

// 智能洞察
interface InsightResult {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'achievement';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems?: string[];
  confidence: number;
  timestamp: number;
  isRead: boolean;
}

// 目标跟踪
interface Goal {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number;              // 目标值
  current: number;             // 当前值
  deadline: number;            // 截止时间
  isActive: boolean;
  createdAt: number;
  achievedAt?: number;
}
```

### 存储策略

```typescript
// Chrome Storage 结构扩展
interface ExtendedStorageSchema {
  // 现有配置保持不变
  settings: PluginSettings;
  
  // 新增分析相关配置
  analysisSettings: {
    enabledFeatures: string[];   // 启用的分析功能
    predictionHorizon: number;   // 预测时间范围（天）
    anomalyThreshold: number;    // 异常检测阈值
    autoGenerateInsights: boolean;
    insightFrequency: 'daily' | 'weekly' | 'realtime';
  };
  
  // 分析结果缓存
  analysisCache: {
    patterns: ConsumptionPattern[];
    predictions: PredictionResult[];
    anomalies: AnomalyDetection[];
    userProfile: UserProfile;
    insights: InsightResult[];
    lastAnalysisTime: number;
  };
  
  // 目标和成就
  goals: Goal[];
  achievements: Achievement[];
}
```

## 核心算法设计

### 1. 消费模式识别算法

```typescript
class PatternRecognitionEngine {
  // 基于时间序列聚类的模式识别
  async identifyPatterns(data: EnhancedHistoricalDataPoint[]): Promise<ConsumptionPattern[]> {
    // 1. 数据预处理：平滑化、去噪
    // 2. 特征提取：时间特征、消费特征、变化率
    // 3. 聚类分析：K-means 或 DBSCAN
    // 4. 模式标记：根据聚类结果生成可读标签
    // 5. 置信度计算：基于聚类质量和数据量
  }
  
  // 周期性检测
  detectCyclicity(data: EnhancedHistoricalDataPoint[]): CyclicityResult {
    // 使用傅里叶变换检测周期性
  }
  
  // 趋势分析
  analyzeTrend(data: EnhancedHistoricalDataPoint[]): TrendAnalysis {
    // 线性回归 + 季节性分解
  }
}
```

### 2. 预测引擎算法

```typescript
class PredictionEngine {
  // 多模型集成预测
  async generatePrediction(
    data: EnhancedHistoricalDataPoint[],
    horizon: number
  ): Promise<PredictionResult[]> {
    // 1. 模型选择：基于数据特征选择最适合的模型
    // 2. 特征工程：构建时间特征、滞后特征等
    // 3. 模型训练：ARIMA、指数平滑、简单机器学习
    // 4. 预测生成：生成点预测和区间预测
    // 5. 后处理：平滑化、合理性检查
  }
  
  // 简化的线性趋势预测（适合浏览器环境）
  linearTrendPrediction(data: number[]): PredictionResult[] {
    // 最小二乘法线性回归
  }
  
  // 移动平均预测
  movingAveragePrediction(data: number[], window: number): PredictionResult[] {
    // 指数加权移动平均
  }
}
```

### 3. 异常检测算法

```typescript
class AnomalyDetector {
  // 统计异常检测
  detectStatisticalAnomalies(
    data: EnhancedHistoricalDataPoint[]
  ): AnomalyDetection[] {
    // 基于 Z-score 或 IQR 的异常检测
  }
  
  // 时序异常检测
  detectTimeSeriesAnomalies(
    data: EnhancedHistoricalDataPoint[]
  ): AnomalyDetection[] {
    // 基于滑动窗口和控制图的异常检测
  }
  
  // 自适应阈值异常检测
  adaptiveThresholdDetection(
    data: EnhancedHistoricalDataPoint[],
    userProfile: UserProfile
  ): AnomalyDetection[] {
    // 基于用户历史行为调整检测阈值
  }
}
```

## 用户界面设计

### 主分析页面布局

```typescript
// TrendAnalysisContainer 组件结构
const TrendAnalysisContainer = () => {
  return (
    <div className="trend-analysis-container">
      {/* 导航标签 */}
      <AnalysisNavigation />
      
      {/* 快速洞察卡片 */}
      <InsightSummaryCards />
      
      {/* 主要图表区域 */}
      <ChartDisplayArea />
      
      {/* 分析控制面板 */}
      <AnalysisControlPanel />
      
      {/* 详细分析结果 */}
      <DetailedAnalysisSection />
    </div>
  );
};
```

### 页面导航设计

```typescript
const analysisPages = [
  {
    id: 'overview',
    title: '总览',
    component: OverviewPage,
    icon: TrendingUp
  },
  {
    id: 'patterns',
    title: '消费模式',
    component: PatternAnalysisPage,
    icon: Target
  },
  {
    id: 'predictions',
    title: '趋势预测',
    component: PredictionPage,
    icon: Crystal
  },
  {
    id: 'comparisons',
    title: '对比分析',
    component: ComparisonPage,
    icon: GitCompare
  },
  {
    id: 'insights',
    title: '智能洞察',
    component: InsightsPage,
    icon: Lightbulb
  }
];
```

## 性能优化设计

### 数据处理优化

1. **分块处理**：大数据集分块计算，避免阻塞 UI
2. **懒加载**：按需加载分析模块
3. **缓存策略**：智能缓存分析结果
4. **Web Workers**：复杂计算移至后台线程

```typescript
// 数据处理优化示例
class OptimizedDataProcessor {
  private cache = new Map<string, any>();
  
  async processLargeDataset(
    data: EnhancedHistoricalDataPoint[],
    chunkSize = 1000
  ): Promise<AnalysisResult> {
    const cacheKey = this.generateCacheKey(data);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // 分块处理
    const chunks = this.chunkArray(data, chunkSize);
    const results = [];
    
    for (const chunk of chunks) {
      // 让出控制权，避免阻塞 UI
      await this.yield();
      const chunkResult = await this.processChunk(chunk);
      results.push(chunkResult);
    }
    
    const finalResult = this.mergeResults(results);
    this.cache.set(cacheKey, finalResult);
    
    return finalResult;
  }
  
  private yield(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

### 渲染性能优化

1. **虚拟化**：大列表使用虚拟滚动
2. **防抖和节流**：用户交互优化
3. **React.memo**：避免不必要的重渲染
4. **图表优化**：使用 Canvas 渲染大数据集

## 错误处理和容错设计

### 错误边界

```typescript
class AnalysisErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorType: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // 根据错误类型提供不同的降级策略
    return {
      hasError: true,
      errorType: error.name
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误日志
    console.error('Analysis error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackAnalysisView errorType={this.state.errorType} />;
    }

    return this.props.children;
  }
}
```

### 降级策略

1. **数据不足**：显示简化版分析或建议
2. **计算错误**：提供基础统计信息
3. **渲染失败**：显示文本版分析结果
4. **存储错误**：使用内存缓存临时保存

## 安全性和隐私设计

### 数据安全

1. **本地处理**：所有分析在客户端进行，不上传敏感数据
2. **数据匿名化**：导出功能提供脱敏选项
3. **存储加密**：敏感配置使用浏览器加密存储
4. **权限控制**：严格限制数据访问权限

### 隐私保护

```typescript
class PrivacyManager {
  // 数据脱敏
  anonymizeData(data: HistoricalDataPoint[]): AnonymizedData[] {
    return data.map(point => ({
      ...point,
      timestamp: this.fuzzyTimestamp(point.timestamp),
      dailySpent: this.roundToRange(point.dailySpent),
      monthlySpent: this.roundToRange(point.monthlySpent)
    }));
  }
  
  // 导出数据脱敏
  createPrivacySafeExport(data: any): SafeExportData {
    // 移除或模糊化敏感信息
  }
}
```

## 测试策略

### 单元测试

```typescript
// 算法测试示例
describe('PatternRecognitionEngine', () => {
  test('should identify peak consumption pattern', () => {
    const mockData = generateMockConsumptionData();
    const engine = new PatternRecognitionEngine();
    const patterns = engine.identifyPatterns(mockData);
    
    expect(patterns).toContainEqual(
      expect.objectContaining({
        type: 'peak',
        confidence: expect.any(Number)
      })
    );
  });
});
```

### 集成测试

```typescript
// 组件集成测试
describe('TrendAnalysisContainer Integration', () => {
  test('should handle large dataset without performance issues', async () => {
    const largeDataset = generateLargeDataset(10000);
    const startTime = performance.now();
    
    render(<TrendAnalysisContainer data={largeDataset} />);
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(3000); // 3秒内完成
  });
});
```

## 部署和迁移策略

### 渐进式部署

1. **Phase 1**：基础分析功能（模式识别、简单预测）
2. **Phase 2**：高级可视化（热力图、多维图表）
3. **Phase 3**：智能功能（AI洞察、个性化）
4. **Phase 4**：完整功能（目标跟踪、导出分享）

### 数据迁移

```typescript
class DataMigrationManager {
  async migrateToNewSchema(currentVersion: string): Promise<void> {
    const migrationPlan = this.getMigrationPlan(currentVersion);
    
    for (const step of migrationPlan) {
      await this.executeMigrationStep(step);
    }
  }
  
  private async executeMigrationStep(step: MigrationStep): Promise<void> {
    // 执行具体的迁移步骤
    // 包含数据备份、转换、验证
  }
}
```

## 监控和分析

### 性能监控

```typescript
class PerformanceMonitor {
  trackAnalysisPerformance(analysisType: string, duration: number) {
    // 记录分析性能指标
  }
  
  trackUserInteraction(action: string, componentName: string) {
    // 记录用户交互
  }
  
  generatePerformanceReport(): PerformanceReport {
    // 生成性能报告
  }
}
```

### 用户行为分析

1. **功能使用率**：统计各分析功能的使用频率
2. **用户路径**：分析用户在分析页面的行为路径
3. **错误率**：监控分析功能的错误率和失败模式
4. **性能指标**：跟踪加载时间、渲染性能等

## 扩展性设计

### 插件化架构

```typescript
interface AnalysisPlugin {
  name: string;
  version: string;
  analyze(data: HistoricalDataPoint[]): Promise<AnalysisResult>;
  getVisualization(): React.ComponentType;
}

class AnalysisPluginManager {
  private plugins = new Map<string, AnalysisPlugin>();
  
  registerPlugin(plugin: AnalysisPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  async runAnalysis(pluginName: string, data: HistoricalDataPoint[]): Promise<AnalysisResult> {
    const plugin = this.plugins.get(pluginName);
    return plugin?.analyze(data);
  }
}
```

### API 设计

```typescript
// 内部 API 设计，便于未来扩展
interface AnalysisAPI {
  // 数据分析
  analyzePatterns(data: HistoricalDataPoint[]): Promise<ConsumptionPattern[]>;
  generatePredictions(data: HistoricalDataPoint[], horizon: number): Promise<PredictionResult[]>;
  detectAnomalies(data: HistoricalDataPoint[]): Promise<AnomalyDetection[]>;
  
  // 用户画像
  buildUserProfile(data: HistoricalDataPoint[]): Promise<UserProfile>;
  updateProfile(updates: Partial<UserProfile>): Promise<void>;
  
  // 洞察生成
  generateInsights(analysisResults: any[]): Promise<InsightResult[]>;
  
  // 数据导出
  exportAnalysis(format: 'csv' | 'json' | 'pdf'): Promise<Blob>;
}
```

这个设计方案提供了完整的技术架构和实现路线，确保新功能能够seamlessly集成到现有系统中，同时保持高性能和良好的用户体验。