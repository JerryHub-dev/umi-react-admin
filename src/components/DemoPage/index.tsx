import { GithubOutlined } from '@ant-design/icons';
import { PageContainer, type PageContainerProps } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Space, Typography } from 'antd';

import { repoBlob } from '@/constants/repo';
import { menuKeyOf } from '@/utils/pageTitle';
import { groupOf, useNamedChain } from '@/utils/routeNav';

type DemoPageProps = Omit<PageContainerProps, 'content'> & {
  /** 页面说明的 i18n 键（显示在标题下方） */
  descriptionId?: string;
  /** 本页核心源码的仓库相对路径，渲染「查看源码」按钮 */
  source?: string;
};

/**
 * 演示页统一外壳。两种形态：
 * - 组内页（绝大多数）：GroupNav 选中页签已标明页面名，头部降级为紧凑说明行
 *   （14px secondary 描述 + 右侧 extra），避免「页签 + 大标题」双重强调，页面头 ~80px → ~36px；
 * - 无分组单页（dashboard）：保留完整标题 + 说明 + extra 的页头。
 * 标题由路由链自算（menu.<父级>.<名>，与 document.title 同源）——二级菜单藏进 GroupNav 后
 * ProLayout 的菜单上下文不再含当前页；面包屑同理关闭（组内页签已表达分组语境）。
 * 各页不再各自包 ProCard + shadow-2xl，间距与层级统一由 PageContainer 承担。
 */
export default function DemoPage({ descriptionId, source, extra, children, ...rest }: DemoPageProps) {
  const intl = useIntl();
  const chain = useNamedChain();
  const key = menuKeyOf(chain);
  const title = key && intl.messages[key] ? intl.formatMessage({ id: key }) : undefined;
  const inGroup = !!groupOf(chain);

  const description = descriptionId ? intl.formatMessage({ id: descriptionId }) : undefined;
  const sourceButton = source ? (
    <Button
      key="source"
      data-tour="source"
      icon={<GithubOutlined />}
      href={repoBlob(source)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {intl.formatMessage({ id: 'common.viewSource' })}
    </Button>
  ) : null;
  const actions =
    extra || sourceButton ? (
      <Space wrap>
        {extra}
        {sourceButton}
      </Space>
    ) : undefined;

  if (inGroup) {
    return (
      <PageContainer title={false} breadcrumbRender={false} {...rest}>
        {description || actions ? (
          <div className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-3">
            {description ? (
              <Typography.Text type="secondary" className="text-sm">
                {description}
              </Typography.Text>
            ) : (
              <span />
            )}
            {actions}
          </div>
        ) : null}
        {children}
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={title ?? false}
      breadcrumbRender={false}
      content={description ? <Typography.Text type="secondary">{description}</Typography.Text> : undefined}
      extra={actions}
      {...rest}
    >
      {children}
    </PageContainer>
  );
}
