import { defineConfig } from '@umijs/max';
import { routes } from './routes';

export default defineConfig({
  copy: [
    {
      from: 'node_modules/cesium/Build/Cesium/Workers',
      to: 'dist/Cesium/Workers',
    },
    {
      from: 'node_modules/cesium/Build/Cesium/ThirdParty',
      to: 'dist/Cesium/ThirdParty',
    },
    {
      from: 'node_modules/cesium/Build/Cesium/Assets',
      to: 'dist/Cesium/Assets',
    },
    {
      from: 'node_modules/cesium/Build/Cesium/Widgets',
      to: 'dist/Cesium/Widgets',
    },
  ],
  define: {
    CESIUM_BASE_URL: '/Cesium',
    'process.env.CESIUM_ION_TOKEN':
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZjBmZTAzMS1jMTJkLTQ5OGQtYTkyYS0xODcyMjU3MTQzMmUiLCJpZCI6MTg2MDcxLCJpYXQiOjE3MDM0MDIwMzl9.DQzBf8T_0U92DwjBcYQqdgwhFs-Cx7EacplwoL_ypjY',
  },
  jsMinifier: 'terser',
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
  lessLoader: {
    modifyVars: {
      'root-entry-name': 'default',
    },
  },
  esbuildMinifyIIFE: true, // 开启 esbuild 压缩
});
