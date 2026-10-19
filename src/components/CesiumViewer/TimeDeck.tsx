import { PauseCircleOutlined, PlayCircleOutlined, RetweetOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Segmented, Tooltip } from 'antd';
import * as Cesium from 'cesium';
import { useEffect, useMemo, useState } from 'react';

const fmtClock = (date: Cesium.JulianDate) => {
  const d = Cesium.JulianDate.toDate(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * 六场景统一的回放控制条：绑定 viewer.clock（单一时间源，废除各页自建的
 * performance.now() 心跳）。播放/暂停、倍速、循环、拖动定位（Slider 在
 * startTime..stopTime 之间跳时刻）。倍速档位由场景自定（态势页到 ×600，巡检页 ×1..×8）。
 * 时钟未设置自定义区间（stop ≤ start）时隐藏拖动条，只留播放与倍速。
 */
export const TimeDeck = ({
  viewer,
  playing,
  onPlayingChange,
  speed,
  onSpeedChange,
  speeds = [1, 2, 4, 8],
  loop = true,
  onLoopChange,
}: {
  viewer: Cesium.Viewer | null;
  playing: boolean;
  onPlayingChange: (next: boolean) => void;
  speed: number;
  onSpeedChange: (next: number) => void;
  speeds?: number[];
  loop?: boolean;
  onLoopChange?: (next: boolean) => void;
}) => {
  const intl = useIntl();
  const [now, setNow] = useState<Cesium.JulianDate | null>(null);
  const [range, setRange] = useState<{ start: Cesium.JulianDate; stop: Cesium.JulianDate } | null>(null);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    let start: Cesium.JulianDate | undefined;
    let stop: Cesium.JulianDate | undefined;
    let lastSecond = Number.NaN;
    let lastWall = Number.NEGATIVE_INFINITY;
    const sync = (clock: Cesium.Clock) => {
      // 区间每拍比对：调用方可能在本组件的 effect 之后才配置时钟（子组件 effect 先跑；Trajectory 在
      // playRoute 里设置），重绘航线也会换区间——只在挂载时读一次会锁死在 Viewer 默认的 24h 窗口
      if (
        !start ||
        !stop ||
        !Cesium.JulianDate.equals(clock.startTime, start) ||
        !Cesium.JulianDate.equals(clock.stopTime, stop)
      ) {
        start = clock.startTime.clone();
        stop = clock.stopTime.clone();
        setRange(
          Cesium.JulianDate.secondsDifference(stop, start) > 0 ? { start: start.clone(), stop: stop.clone() } : null,
        );
        lastSecond = Number.NaN;
      }
      // Cesium 每个渲染帧都派发 onTick（暂停时也是）：显示只有秒粒度，按秒去重，并限到 ≤10Hz
      // （高倍速下每帧都跨秒），避免整条控制条 60Hz 重渲染
      const second = Math.floor(Cesium.JulianDate.secondsDifference(clock.currentTime, start));
      const wall = performance.now();
      if (second === lastSecond || wall - lastWall < 100) return;
      lastSecond = second;
      lastWall = wall;
      setNow(clock.currentTime.clone());
    };
    sync(viewer.clock);
    viewer.clock.onTick.addEventListener(sync);
    return () => {
      if (!viewer.isDestroyed()) viewer.clock.onTick.removeEventListener(sync);
    };
  }, [viewer]);

  const total = useMemo(
    () => (range ? Math.max(1, Cesium.JulianDate.secondsDifference(range.stop, range.start)) : 0),
    [range],
  );
  const elapsed = useMemo(
    () => (range && now ? Math.max(0, Cesium.JulianDate.secondsDifference(now, range.start)) : 0),
    [range, now],
  );

  const seek = (seconds: number) => {
    if (!viewer || !range) return;
    viewer.clock.currentTime = Cesium.JulianDate.addSeconds(range.start, seconds, new Cesium.JulianDate());
  };

  return (
    <div className="scene-panel scene-timedeck" data-tour="timedeck">
      <Button
        size="small"
        type={playing ? 'text' : 'primary'}
        icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        aria-label={intl.formatMessage({ id: playing ? 'cesium.deck.pause' : 'cesium.deck.play' })}
        onClick={() => onPlayingChange(!playing)}
      />
      {range && (
        <input
          type="range"
          className="scene-timedeck-slider"
          min={0}
          max={total}
          step={Math.max(total / 600, 1)}
          value={Math.min(elapsed, total)}
          aria-label={intl.formatMessage({ id: 'cesium.deck.scrub' })}
          onChange={(e) => seek(Number(e.target.value))}
        />
      )}
      <span className="scene-timedeck-clock">{now ? fmtClock(now) : '--/-- --:--:--'}</span>
      <Segmented
        size="small"
        value={speed}
        onChange={(value) => onSpeedChange(value as number)}
        options={speeds.map((value) => ({ value, label: `×${value}` }))}
      />
      {onLoopChange && (
        <Tooltip title={intl.formatMessage({ id: 'cesium.deck.loop' })}>
          <Button
            size="small"
            type={loop ? 'primary' : 'text'}
            icon={<RetweetOutlined />}
            aria-label={intl.formatMessage({ id: 'cesium.deck.loop' })}
            aria-pressed={loop}
            onClick={() => onLoopChange(!loop)}
          />
        </Tooltip>
      )}
    </div>
  );
};
