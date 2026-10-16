import { formatDateTime } from '@/utils/format';
import { useIntl } from '@umijs/max';
import { theme, Typography } from 'antd';

import { REPO_URL as REPO } from '@/constants/repo';

/** 页脚：构建提交、时间与部署目标（与 dist/version.json 同源），一眼看出线上跑的是哪个版本 */
export default function BuildFooter() {
  const intl = useIntl();
  const { token } = theme.useToken();
  const { sha, time, target } = BUILD_INFO;
  const short = sha.slice(0, 7);
  return (
    /*
     * 无障碍（Q5）：布局的每一层容器背景都是透明的（实际底色由布局在更底层的绘制层给出），
     * axe 的颜色对比度检查因此按「默认白色画布」计算页脚文字，暗色主题下会误判为
     * #8f8f8f on #ffffff = 3.23:1。这里给页脚显式铺上当前主题的布局底色
     * （浅色 #f5f5f5 / 深色 #000，与像素实测一致），让对比度按真实背景计算。
     */
    <footer className="py-6 text-center text-xs" style={{ backgroundColor: token.colorBgLayout }}>
      <Typography.Text type="secondary">
        {intl.formatMessage({ id: 'footer.build' }, { time: formatDateTime(time, 'YYYY-MM-DD HH:mm'), target })}{' '}
        {sha === 'unknown' ? (
          short
        ) : (
          <Typography.Link href={`${REPO}/commit/${sha}`} target="_blank" rel="noopener noreferrer">
            {short}
          </Typography.Link>
        )}
      </Typography.Text>
    </footer>
  );
}
