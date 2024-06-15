import { defineConfig } from '@umijs/max';
// import path from 'path';
// import { routes } from './routes';

export default defineConfig({
  chainWebpack(config) {
    config.module
      .rule('cesium')
      .test(/\.js$/)
      .include.add(path.resolve(__dirname, 'node_modules/cesium/Source'))
      .end()
      .use('strip-pragma-loader')
      .loader('strip-pragma-loader')
      .options({
        pragmas: {
          debug: false,
        },
      });
  },
  define: {
    CESIUM_BASE_URL: '/umi-react-admin/Cesium',
  },
  favicons: ['/umi-react-admin/favicon.ico'],
  base: '/umi-react-admin/',
  publicPath: '/umi-react-admin/',
});
