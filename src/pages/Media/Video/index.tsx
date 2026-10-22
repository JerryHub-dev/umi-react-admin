import DemoPage from '@/components/DemoPage';
import { ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Card, Result, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import Player from 'xgplayer';

import 'xgplayer/dist/index.min.css';

export default function Video() {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // 重试 = 销毁后在同一容器重建播放器（重新请求视频源）
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const player = new Player({
      el: containerRef.current,
      url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4',
      // 封面自制并随站点托管（此前热链的第三方图片被 CSP img-src 拦截，播放器区为白底）
      poster: `${PUBLIC_PATH}media/video-poster.svg`,
      lang: intl.locale === 'en-US' ? 'en' : 'zh-cn',
      fluid: true,
      // 关掉 xgplayer 自带的错误层：CDN 不可达时浏览器只报「源不支持」，它据此显示「不支持的音频/视频格式」，
      // 把网络问题说成格式问题。改由下方的加载失败说明 + 重试接管
      ignores: ['error'],
    });
    player.on('error', () => setFailed(true));
    return () => player.destroy();
  }, [intl.locale, attempt]);

  return (
    <DemoPage descriptionId="page.video.desc" source="src/pages/Media/Video/index.tsx">
      <Card>
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-lg">
          <div ref={containerRef} />
          {failed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75">
              <Result
                status="warning"
                title={<span className="text-white">{t('video.loadFailed')}</span>}
                subTitle={<span className="text-white/75">{t('video.loadFailedDesc')}</span>}
                extra={
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setFailed(false);
                      setAttempt((value) => value + 1);
                    }}
                  >
                    {t('common.retry')}
                  </Button>
                }
              />
            </div>
          )}
        </div>
        <Typography.Paragraph type="secondary" className="mx-auto mt-4 max-w-5xl text-xs">
          {t('video.source')}
        </Typography.Paragraph>
      </Card>
    </DemoPage>
  );
}
