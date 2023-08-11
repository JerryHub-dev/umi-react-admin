// 运行时配置
import type { RequestConfig } from '@umijs/max';

// TODO: 请根据实际项目进行配置
export const requestConfig: RequestConfig = {
  timeout: 1000,
  // NOTE: 错误处理
  errorConfig: {
    // 错误抛出
    errorThrower: (res: any) => {
      throw res;
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      const { response } = error;
      console.log(response, opts);
    },
  },

  // NOTE: 请求拦截器
  requestInterceptors: [
    (config: any) => {
      // 拦截请求配置，进行个性化处理。
      const url = config.url.concat('?token = 123');
      return { ...config, url };
    },
  ],

  // NOTE: 响应拦截器
  responseInterceptors: [
    (response) => {
      // 拦截响应数据，进行个性化处理
      // const { data } = response;
      // if (!data.success) {
      //   message.error('请求失败！');
      // }
      return response;
    },
  ],
};
