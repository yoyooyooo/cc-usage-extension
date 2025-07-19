import { defineConfig, type WxtViteConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: './assets/icon.png',
    sizes: [16, 32, 48, 96, 128],
  },
  manifest: {
    name: 'CC Usage Monitor',
    description: 'Claude Code 使用情况查询插件 - 智能预算管理，实时消费追踪',
    version: '1.1.0',
    permissions: ['storage', 'activeTab', 'notifications', 'alarms'],
    host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: 'CC Usage Monitor',
      default_popup: 'popup.html',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
  },
  vite: () =>
    ({
      plugins: [tailwindcss()],
    } as WxtViteConfig),
});
