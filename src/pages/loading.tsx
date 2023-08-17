// 全局加载组件。
// Umi 4 默认 按页分包 ，从而在页面切换时存在加载过程，通过该文件来配置加载动画。
// https://umijs.org/docs/guides/directory-structure#loadingtsxjsx

import { Skeleton } from 'antd';

export default () => {
  return (
    <>
      <Skeleton />
      <Skeleton />
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </>
  );
};
