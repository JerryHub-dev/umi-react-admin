import { PageContainer, ProCard } from '@ant-design/pro-components';

export default function Office() {
  return (
    <PageContainer>
      <ProCard title="卡片标题" headerBordered>
        <ProCard title="内部卡片标题" bordered>
          内部卡片内容
        </ProCard>
        <ProCard title="内部卡片标题" bordered>
          内部卡片内容
        </ProCard>
      </ProCard>
    </PageContainer>
  );
}
