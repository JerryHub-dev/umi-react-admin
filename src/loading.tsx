// 路由切换时的全局加载占位（umi 按页分包）：形状贴近真实页面（标题 + 说明 + 内容卡片），减少跳动。
// 位置是 umi 约定：只认 src/loading.tsx。曾放在 src/pages/loading.tsx，从未生效——登录后、首次进入
// 某页时分包加载的那一两秒整屏空白
import { Card, Skeleton } from 'antd';

export default () => (
  <div className="px-4 py-6 sm:px-10 sm:py-8">
    <Skeleton.Input active size="small" style={{ width: 160 }} />
    <Skeleton active title={false} paragraph={{ rows: 1, width: '40%' }} className="mt-3" />
    <Card className="mt-4">
      <Skeleton active paragraph={{ rows: 8 }} />
    </Card>
  </div>
);
