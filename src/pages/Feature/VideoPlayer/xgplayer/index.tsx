import { ProCard } from '@ant-design/pro-components';
import { useMount } from 'ahooks';
import Player from 'xgplayer';

import 'xgplayer/dist/index.min.css';

export default function VideoPlayer() {
  useMount(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let player = new Player({
      id: 'mse',
      // url: 'http://s2.pstatp.com/cdn/expire-1-M/byted-player-videos/1.0.0/xgplayer-demo.mp4',
      url: '//sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4',
      // 海报
      poster: '//lf9-cdn-tos.bytecdntp.com/cdn/expire-1-M/byted-player-videos/1.0.0/poster.jpg',
      height: '70vh',
      width: '100vh',
    });
  });

  return (
    <ProCard className="shadow-2xl">
      <h1>VideoPlayer</h1>
      <div className="mt-8 mb-8 shadow-2xl" id="mse"></div>
    </ProCard>
  );
}
