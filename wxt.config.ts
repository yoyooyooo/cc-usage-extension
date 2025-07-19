import { defineConfig, type WxtViteConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'CC Usage Monitor',
    description: 'Claude Code 使用情况查询插件 - 智能预算管理，实时消费追踪',
    version: '1.0.0',
    permissions: [
      'storage',
      'activeTab',
    ],
    host_permissions: [
      'http://*/*',
      'https://*/*',
    ],
    action: {
      default_title: 'CC Usage Monitor',
      default_popup: 'popup.html',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    icons: {
      '16': '/icon/16.png',
      '32': '/icon/32.png',
      '48': '/icon/48.png',
      '96': '/icon/96.png',
      '128': '/icon/128.png',
    },
  },
  vite: () =>
    ({
      plugins: [tailwindcss()],
    } as WxtViteConfig),
});
