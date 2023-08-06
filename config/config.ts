import { defineConfig } from '@umijs/max';
import { routes } from './routes';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '@umijs/max',
  },
  // @umijs/max 内置了 styled-components 样式方案。
  // https://umijs.org/docs/max/styled-components
  styledComponents: {},
  // 路由配置
  routes,
  npmClient: 'pnpm',
});

