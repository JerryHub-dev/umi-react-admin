import { ProCard } from '@ant-design/pro-components';
import ArtPlayer from 'artplayer';
import { useEffect, useRef } from 'react';

const VideoArtPlayer = () => {
  const artRef = useRef(null);

  useEffect(() => {
    const art = new ArtPlayer({
      url: '//sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4',
      poster: '//lf9-cdn-tos.bytecdntp.com/cdn/expire-1-M/byted-player-videos/1.0.0/poster.jpg',
      container: artRef.current,
    });

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, []);

  return (
    <>
      <ProCard>
        <div ref={artRef}></div>
      </ProCard>
    </>
  );
};

export default VideoArtPlayer;
