import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    console.error('Chart Error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 可以将错误日志上报给服务器
    console.error('Chart Error Details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 降级 UI
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-center text-center">
            <div>
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">图表加载出错</h3>
              <p className="text-gray-400 text-sm">
                无法显示24小时时间线图表
              </p>
              {this.state.error && (
                <details className="mt-3 text-left">
                  <summary className="text-xs text-gray-500 cursor-pointer">错误详情</summary>
                  <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-20">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}