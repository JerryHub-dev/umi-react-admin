import { defineConfig } from '@umijs/max';
import { routes } from './routes';

export default defineConfig({
  // 开启 valtio 数据流方案 https://umijs.org/docs/max/valtio
  valtio: {},
  antd: {
    theme: {},
    appConfig: {},
  },
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {},
  // @umijs/max 内置了 styled-components 样式方案。
  // https://umijs.org/docs/max/styled-components
  styledComponents: {},
  // 路由配置
  routes,
  npmClient: 'pnpm',
  // 多语言配置 https://umijs.org/docs/max/i18n
  locale: {
    // 默认使用 src/locales/zh-CN.ts 作为多语言文件
    default: 'zh-CN',
    baseSeparator: '-',
  },
  tailwindcss: {},
});
