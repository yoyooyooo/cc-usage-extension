# CC Usage Monitor 技术架构文档

## 1. 架构概览

### 1.1 总体架构
CC Usage Monitor 采用现代化的浏览器扩展架构，基于 WXT 框架构建。核心设计理念是**单一数据源 (Single Source of Truth)** 和**响应式状态管理**。

```
┌─────────────────────────────────────────────────────────┐
│                   Browser Extension                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Popup     │  │   Options   │  │ Background  │     │
│  │   (React)   │  │   (React)   │  │ (Service    │     │
│  │             │  │             │  │  Worker)    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│  ┌─────────────────────────────────────────────────────┐│
│  │             Zustand Store (状态管理层)              ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   ││
│  │  │  Settings   │ │ UI States   │ │ API States  │   ││
│  │  │   Store     │ │   Store     │ │   Store     │   ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘   ││
│  └─────────────────────────────────────────────────────┘│
│                          │                              │
│  ┌─────────────────────────────────────────────────────┐│
│  │           Chrome Storage (持久化层)                 ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   ││
│  │  │chrome.storage│ │chrome.storage│ │  Chrome     │   ││
│  │  │   .sync      │ │   .local     │ │  APIs       │   ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心技术栈

| 层级 | 技术选型 | 版本 | 作用 |
|------|----------|------|------|
| **框架层** | WXT | ^0.20.7 | 扩展开发框架 |
| **UI层** | React | ^19.0.0 | 用户界面 |
| **类型层** | TypeScript | ^5.7.2 | 类型安全 |
| **状态层** | Zustand | ^5.0.2 | 状态管理 |
| **样式层** | Tailwind CSS | ^3.4.17 | 样式框架 |
| **组件层** | shadcn/ui | latest | UI 组件库 |
| **图表层** | Recharts | ^2.13.3 | 数据可视化 |
| **存储层** | Chrome Storage API | Native | 数据持久化 |

## 2. 状态管理架构

### 2.1 Zustand Store 设计

#### 核心设计原则
- **单一数据源**：所有状态统一在 Store 中管理
- **不可变更新**：使用 immutable 方式更新状态
- **自动持久化**：状态变更自动同步到 Chrome Storage
- **类型安全**：完整的 TypeScript 类型定义

#### Store 结构 (v1.2.2+ 更新)
```typescript
interface SettingsState {
  // 核心数据状态
  settings: PluginSettings | null;  // null 表示未初始化
  isLoaded: boolean;                // 是否已从存储加载
  
  // API 数据状态 (v1.2.2 新增)
  data: ApiResponse | null;         // API 响应数据
  dataLoading: boolean;             // API 数据加载状态
  error: string | null;             // 错误信息
  
  // UI 状态
  loading: boolean;                 // Store 初始化状态
  saving: boolean;
  testing: boolean;
  
  // API 连接相关
  fieldOptions: string[];
  hasTestedConnection: boolean;
  autoMatchResult: AutoMatchResult;
  
  // Actions - 统一所有数据操作
  initializeStore: () => Promise<void>;
  loadApiData: () => Promise<void>;     // 加载 API 数据
  refreshData: () => Promise<void>;     // 强制刷新数据
  updateSettings: (updates: Partial<PluginSettings>) => void;
  saveSettings: () => Promise<void>;
  // ... 其他 actions
}
```

### 2.2 数据流向图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Chrome    │────▶│   Zustand   │────▶│ React       │
│   Storage   │     │   Store     │     │ Components  │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                     │                   │
       │                     ▼                   │
       └─────────────────────────────────────────┘
                    持久化同步

数据流特点：
1. 初始化：Chrome Storage → Zustand Store → Components
2. 用户操作：Components → Zustand Store → Chrome Storage
3. 状态订阅：Components 自动响应 Store 变化
4. 持久化：Store 变更自动同步到 Storage
```

### 2.3 状态同步机制

#### 初始化流程
```typescript
// 1. 应用启动时初始化
useEffect(() => {
  initializeStore();
}, []);

// 2. Store 初始化方法
initializeStore: async () => {
  set({ loading: true });
  try {
    const savedSettings = await loadSettingsFromStorage();
    set({ 
      settings: savedSettings, 
      isLoaded: true,
      hasTestedConnection: validateConnection(savedSettings)
    });
  } finally {
    set({ loading: false });
  }
}
```

#### 状态更新流程
```typescript
// 1. 组件中触发状态更新
const { updateSettings, saveSettings } = useSettingsStore();

// 2. 更新内存状态
updateSettings({ apiUrl: newUrl });

// 3. 持久化到存储
await saveSettings();
```

## 3. 组件架构设计

### 3.1 组件层次结构

```
App.tsx (主应用)
├── Popup View (弹窗视图)
│   ├── DataGrid.tsx (数据网格)
│   │   ├── CircularProgress.tsx (圆形进度)
│   │   ├── CountdownTimer.tsx (倒计时)
│   │   ├── RemainingBudgetAlert.tsx (预算警示)
│   │   └── DataCard.tsx (数据卡片)
│   └── UsageChart.tsx (使用图表)
│       └── DailyTimelineChart.tsx (时间线图表)
├── Settings View (设置视图)
│   └── SettingsView.tsx (设置组件)
└── Options View (选项视图)
    └── SettingsView.tsx (复用设置组件)
```

### 3.2 组件通信模式

#### 传统模式 (已废弃)
```typescript
// ❌ 复杂的 ref 通信模式
const settingsRef = useRef<SettingsViewRef>(null);
const canSave = settingsRef.current?.canSave();
```

#### 现代模式 (当前使用)
```typescript
// ✅ 直接使用 Store 状态
const { settings, canSave, saveSettings } = useSettingsStore();
```

### 3.3 组件设计原则

1. **单一职责**：每个组件只负责一个功能
2. **无状态偏好**：优先使用无状态函数组件
3. **Props 类型化**：所有 Props 都有完整的 TypeScript 类型
4. **错误边界**：关键组件包含错误处理逻辑

## 4. 数据持久化策略

### 4.1 存储分层设计

| 存储类型 | 用途 | 容量限制 | 同步性 |
|----------|------|----------|--------|
| `chrome.storage.sync` | 用户设置、配置 | 100KB | 跨设备同步 |
| `chrome.storage.local` | 历史数据、缓存 | 5MB+ | 本地存储 |

### 4.2 数据存储策略

#### 设置数据 (chrome.storage.sync)
```typescript
// 存储键名设计
const STORAGE_KEYS = {
  SETTINGS: 'plugin_settings',  // 主要设置
  CACHE: 'api_cache',          // API 缓存
  NOTIFICATION: 'notification_status'  // 通知状态
};

// 存储格式
interface StoredSettings {
  apiUrl: string;
  token: string;
  workingHours: { start: number; end: number };
  mapping: Record<string, string>;
  notifications: NotificationConfig;
  alertThresholds: AlertThresholds;
}
```

#### 历史数据 (chrome.storage.local)
```typescript
// 历史数据管理
interface HistoricalData {
  data: HistoricalDataPoint[];
  lastUpdated: number;
}

interface HistoricalDataPoint {
  timestamp: number;
  dailyBudget: number;
  dailySpent: number;
  monthlyBudget: number;
  monthlySpent: number;
}

// 数据保留策略
const MAX_HISTORICAL_DAYS = 30;  // 保留 30 天
const MAX_DATA_POINTS_PER_DAY = 24;  // 每天最多 24 个点
```

### 4.3 数据同步和缓存

#### API 数据缓存策略 (v1.2.2 优化)
```typescript
// 5分钟缓存机制 (从60秒延长)
const CACHE_DURATION = 5 * 60 * 1000;

interface CachedData {
  data: ApiResponse;
  timestamp: number;
}

// 请求管理器 - 防重复请求
class ApiRequestManager {
  private pendingRequests = new Map<string, Promise<ApiResponse>>();
  private abortControllers = new Map<string, AbortController>();
  
  async fetchApiData(settings: PluginSettings): Promise<ApiResponse> {
    const requestKey = this.generateRequestKey(settings);
    
    // 如果有相同请求正在进行，直接返回
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }
    
    // 取消之前的同类请求
    if (this.abortControllers.has(requestKey)) {
      this.abortControllers.get(requestKey)!.abort();
    }
    
    // 执行新请求...
  }
}
```

#### 历史数据去重策略
```typescript
// 同一小时内只保留最新数据
const addHistoricalDataPoint = async (point: DataPoint) => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const recentPoint = data.find(p => p.timestamp > oneHourAgo);
  
  if (recentPoint) {
    // 更新现有数据点
    Object.assign(recentPoint, point);
  } else {
    // 添加新数据点
    data.push({ ...point, timestamp: Date.now() });
  }
};
```

## 5. 智能字段匹配引擎

### 5.1 匹配算法设计

#### 关键词匹配规则
```typescript
const FIELD_PATTERNS = {
  monthlyBudget: [
    /month.*budget/i,
    /budget.*month/i,
    /monthly.*limit/i
  ],
  monthlySpent: [
    /month.*(spent|used|cost)/i,
    /(spent|used|cost).*month/i
  ],
  // ... 其他字段
};
```

#### 置信度计算
```typescript
interface MatchResult {
  field: string;
  confidence: number;  // 0-100
  reason: string;
  matchedKeywords: string[];
}

const calculateConfidence = (field: string, patterns: RegExp[]) => {
  let confidence = 0;
  let matchedKeywords: string[] = [];
  
  for (const pattern of patterns) {
    if (pattern.test(field)) {
      confidence += 25;  // 每个匹配增加 25 分
      matchedKeywords.push(extractKeywords(pattern, field));
    }
  }
  
  return Math.min(confidence, 100);
};
```

### 5.2 自动应用策略

```typescript
// 高置信度自动应用
const AUTO_APPLY_THRESHOLD = 85;

const applyAutoMatches = (matchResults: AutoMatchResult) => {
  Object.entries(matchResults).forEach(([targetField, match]) => {
    if (match && match.confidence >= AUTO_APPLY_THRESHOLD) {
      // 自动应用高置信度匹配
      updateMapping(targetField, match.field);
    }
  });
};
```

## 6. 智能通知系统

### 6.1 后台监控架构

```typescript
// Background Script 架构
export default defineBackground(() => {
  // 监听扩展启动
  chrome.runtime.onStartup.addListener(setupMonitoring);
  
  // 监听定时器事件
  chrome.alarms.onAlarm.addListener(handleBudgetCheck);
  
  // 监听设置变更
  chrome.storage.onChanged.addListener(updateMonitoring);
});
```

### 6.2 通知触发机制

```typescript
interface NotificationTrigger {
  type: 'daily' | 'monthly';
  threshold: number;  // 百分比
  currentUsage: number;
  lastNotified: number;
}

const shouldSendNotification = (trigger: NotificationTrigger): boolean => {
  const exceedsThreshold = trigger.currentUsage >= trigger.threshold;
  const cooldownPassed = Date.now() - trigger.lastNotified > COOLDOWN_DURATION;
  
  return exceedsThreshold && cooldownPassed;
};
```

### 6.3 通知去重策略

```typescript
// 30分钟冷却期
const COOLDOWN_DURATION = 30 * 60 * 1000;

interface NotificationStatus {
  dailyBudget: boolean;
  monthlyBudget: boolean;
  lastNotificationTime: number;
}

// 每日/月度自动重置
const resetNotificationStatus = () => {
  const now = new Date();
  const isNewDay = /* 检查是否新的一天 */;
  const isNewMonth = /* 检查是否新的一个月 */;
  
  if (isNewDay || isNewMonth) {
    // 重置通知状态
    setNotificationStatus({
      dailyBudget: false,
      monthlyBudget: false,
      lastNotificationTime: 0
    });
  }
};
```

## 7. 数据可视化系统

### 7.1 图表组件架构

```typescript
// 图表组件层次
UsageChart.tsx (主图表容器)
├── 控制面板
│   ├── 视图模式选择 (24小时/7天/30天/全部)
│   ├── 图表类型选择 (日度/月度/全部)
│   └── 日期导航 (仅24小时视图)
├── 趋势图视图 (Area Chart)
│   ├── 渐变填充效果
│   ├── 双轴显示 (日度/月度)
│   └── 统计信息面板
└── 时间线视图 (DailyTimelineChart)
    ├── 24小时柱状图
    ├── 颜色编码 (绿/黄/橙/红)
    ├── 当前时间标记
    └── 统计信息 (活跃时间/高峰时段)
```

### 7.2 数据处理管道

```typescript
// 原始数据 → 图表数据转换
const processChartData = (rawData: HistoricalDataPoint[]) => {
  return rawData
    .filter(filterByTimeRange)
    .map(point => ({
      ...point,
      date: formatDate(point.timestamp),
      dailyUsage: calculateUsagePercentage(point.dailySpent, point.dailyBudget),
      monthlyUsage: calculateUsagePercentage(point.monthlySpent, point.monthlyBudget)
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
};
```

### 7.3 图表交互设计

```typescript
// 响应式图表配置
const chartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  scales: {
    x: {
      display: true,
      grid: { color: '#374151' }
    },
    y: {
      display: true,
      beginAtZero: true,
      grid: { color: '#374151' }
    }
  }
};
```

## 8. 错误处理和容错机制

### 8.1 分层错误处理

```typescript
// Store 层错误处理
const saveSettings = async () => {
  try {
    await saveSettingsToStorage(settings);
    toast.success('配置保存成功！');
  } catch (error) {
    console.error('Failed to save settings:', error);
    toast.error('保存配置失败');
    throw error;  // 重新抛出供上层处理
  }
};

// 组件层错误处理
const handleSaveClick = async () => {
  try {
    await saveSettings();
    onSaveSuccess();
  } catch (error) {
    // 错误已在 Store 层处理，这里只需要 UI 响应
    setHasError(true);
  }
};
```

### 8.2 数据迁移和兼容性

```typescript
// 向后兼容的数据迁移
const migrateSettings = (savedSettings: any): PluginSettings => {
  return {
    ...defaultSettings,
    ...savedSettings,
    // 确保新字段有默认值
    alertThresholds: {
      ...defaultSettings.alertThresholds,
      ...savedSettings.alertThresholds,
    },
    notifications: {
      ...defaultSettings.notifications,
      ...savedSettings.notifications,
    }
  };
};
```

### 8.3 优雅降级策略

```typescript
// API 失败时的降级处理
const fetchApiDataWithFallback = async (settings: PluginSettings) => {
  try {
    // 尝试获取最新数据
    return await fetchApiData(settings);
  } catch (error) {
    // 降级到缓存数据
    const cached = await getCachedData();
    if (cached) {
      toast.warning('使用缓存数据，请检查网络连接');
      return cached.data;
    }
    
    // 最终降级到默认数据
    throw new Error('无法获取数据，请检查配置和网络');
  }
};
```

## 9. 性能优化策略

### 9.1 状态订阅优化 (v1.2.2 重构)

```typescript
// 组件完全依赖 Store 状态，无本地状态管理
function App() {
  const { 
    settings, 
    isLoaded, 
    data, 
    dataLoading,  // 统一的加载状态
    error,        // 统一的错误状态
    refreshData   // 统一的刷新方法
  } = useSettingsStore();
  
  // 组件只负责渲染，不管理状态
  return (
    <DataGrid 
      settings={settings} 
      data={data} 
      loading={dataLoading}  // 直接使用 store 状态
    />
  );
}

// 优化：使用选择器避免不必要的重渲染
const apiUrl = useSettingsStore(state => state.settings?.apiUrl);
const canSave = useSettingsStore(state => state.canSave());
```

### 9.2 数据缓存策略

```typescript
// 多层缓存机制
const dataCache = new Map<string, CachedData>();

const getCachedApiData = async (cacheKey: string) => {
  // 1. 内存缓存 (最快)
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }
  
  // 2. Chrome Storage 缓存
  const stored = await getCachedData();
  if (stored && isCacheValid(stored)) {
    dataCache.set(cacheKey, stored);
    return stored;
  }
  
  // 3. 重新获取数据
  return null;
};
```

### 9.3 组件懒加载

```typescript
// 图表组件懒加载
const UsageChart = lazy(() => import('./UsageChart'));
const DailyTimelineChart = lazy(() => import('./DailyTimelineChart'));

// 使用 Suspense 包装
<Suspense fallback={<ChartLoadingSkeleton />}>
  <UsageChart data={historicalData} />
</Suspense>
```

## 10. 部署和构建流程

### 10.1 构建配置

```typescript
// wxt.config.ts
export default defineConfig({
  manifest: {
    permissions: [
      'storage',
      'alarms',
      'notifications'
    ]
  },
  outDir: '.output',
  zip: {
    compression: 9,
    excludes: ['*.map', 'node_modules/**']
  }
});
```

### 10.2 多平台构建

```bash
# Chrome 构建
npm run build
npm run zip

# Firefox 构建
npm run build:firefox
npm run zip:firefox
```

### 10.3 类型检查和测试

```bash
# TypeScript 类型检查
npm run compile

# 确保所有类型都正确
tsc --noEmit --strict
```

---

## 总结

CC Usage Monitor 采用现代化的浏览器扩展架构，通过 Zustand 状态管理实现了清晰的数据流和高性能的用户体验。在 v1.2.2 版本中完成了重大架构重构，核心设计理念包括：

1. **单一数据源**：避免状态重复和同步问题，所有状态统一在 Zustand Store 中管理
2. **类型安全**：完整的 TypeScript 类型系统
3. **响应式设计**：自动的状态同步和 UI 更新
4. **容错机制**：多层错误处理和优雅降级
5. **性能优化**：智能缓存、请求去重和选择性渲染
6. **组件纯化**：组件专注渲染，所有业务逻辑集中在 Store 中

### v1.2.2 重构亮点

**状态管理革新：**
- 将所有状态（包括 API 数据、加载状态、错误状态）统一迁移到 Zustand
- 消除了组件间的状态同步问题
- 实现了真正的单向数据流

**请求优化：**
- 实现了基于 AbortController 的请求去重机制
- 延长缓存时间到 5 分钟，显著减少 API 调用
- 智能页面切换逻辑，避免不必要的强制刷新

**架构简化：**
- 移除了复杂的 useEffect 依赖链
- 简化了组件通信模式
- 提升了代码可维护性和可测试性

这种架构确保了扩展的稳定性、可维护性和可扩展性，为后续功能扩展打下了坚实的基础。