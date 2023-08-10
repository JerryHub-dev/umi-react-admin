// 运行时配置
import { RunTimeLayoutConfig } from '@umijs/max';
// import { Dropdown } from 'antd';
import RightContent from '@/layouts/RightContent';
// import Footer from '@/layouts/Footer';
// import { routes } from '../config/routes';
// import { LogoutOutlined } from '@ant-design/icons';
import { appList } from '@/layouts/_defaultProps';

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{ name: string }> {
  return { name: '@umijs/max' };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const layout: RunTimeLayoutConfig = (initialState) => {
  return {
    // 常用属性
    title: 'React Admin',
    logo: 'https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg',
    // logo: '../public/1297939-3f51b5.svg',
    // 默认布局调整
    // 自定义 render
    rightContentRender: () => <RightContent />,
    // footerRender: () => <Footer />,
    menuHeaderRender: undefined,
    appList,
    // layout 的菜单模式
    layout: 'mix',
    // 是否固定导航
    fixSiderbar: true,
    // 是否固定头部
    fixHeader: true,
    // 自动切割菜单 mix 模式专属功能
    splitMenus: true,

    // 其他属性见：https://procomponents.ant.design/components/layout#prolayout
  };
};
