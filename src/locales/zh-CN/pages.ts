/** 各演示页顶部的一句话说明（DemoPage 的 description） */
export default {
  'page.dashboard.desc': '运营全局：设备在线、告警趋势、工单时限与处置流向，全部由同一份演示数据实时聚合。',
  'page.users.desc': '用户增删改查、批量启停与详情抽屉；筛选、排序、分页均在服务端完成。',
  'page.roles.desc': '内置五种角色，按权限点树勾选配置；系统管理员角色必须保留全部权限。',
  'page.logs.desc': '近 30 天的登录与关键操作审计，你在演示站里的操作也会实时记录在这里。',
  'page.access.desc': '路由级、按钮级与数据级三种权限控制，切换身份即可对比。',
  'page.devices.desc': '全国 34 个城市 240 台监测站的台账：状态、在线率、心跳与监测频段。',
  'page.alarms.desc': '近 90 天告警，可按级别、类型、状态筛选，并对未恢复告警转工单或关闭。',
  'page.tickets.desc': '拖动卡片流转工单状态，支持键盘操作；待处理多为已排期的例行巡检。',
  'page.spectrum.desc': '用 D3 绘制各型号监测站的频段覆盖，对比重点频段的占用情况。',
  'page.amap.desc': '高德 JS API 2.0：全部监测站点位与状态，点击查看详情。',
  'page.openlayers.desc': 'OpenLayers + OSM 瓦片：站点点位、按状态着色与弹窗信息。',
  'page.cesium.geohash.desc':
    '站网密度立方：实测 240 站或合成 8000 站按 GeoHash 精度聚合，色带格柱随切换生长，悬停联动分布直方图。',
  'page.cesium.direction.desc':
    '电子侦察覆盖：天线方向图驱动截获/定位/解调三层覆盖带，测向波束旋转扫描，目标实时判定截获裕量。',
  'page.cesium.heatmap.desc':
    '频谱场强态势：传播模型 Worker 算场，色带热力与 dB 等值线同图，60/45 dB 覆盖圈随发射机功率联动。',
  'page.cesium.trajectory.desc':
    '巡检任务规划与回放：航路点可拖拽编辑，glTF 巡检机沿线回放并拖出覆盖走廊，高度剖面双向联动，可导出 CZML。',
  'page.cesium.select.desc':
    '空间查询与量测：拖拽框选、多边形套索、圆形选择与多段量测，选中站点分布汇总与地图脉冲联动。',
  'page.cesium.situation.desc':
    '黄海—东海综合态势：61 个军标目标在三层关注区回放，越界事件流实时推送，编成树/详情卡/时间轴协同。',
  'page.calendar.desc': '值班交接、现场巡检、复盘评审等日程：拖动改期、框选新建，改动会保存。',
  'page.richText.desc': 'TinyMCE 自托管编辑器，预置一份按当前数据生成的运维周报草稿。',
  'page.signature.desc': '工单验收签字：选择已完成工单，签名后写回工单记录。',
  'page.screenshot.desc': 'html2canvas 把任意 DOM 区域导出为图片，这里截取一张告警详情卡片。',
  'page.video.desc': 'xgplayer 视频播放器。',
  'page.audioPlayer.desc': 'xgplayer 音乐预设：频谱动画与滚动歌词（音频为项目自制合成音）。',
  'page.audioWaveform.desc': 'wavesurfer.js 波形与时间轴，可切换两段音频。',
  'page.pdf.desc': 'react-pdf 预览：本页的月报 PDF 由当前演示数据在浏览器内实时生成。',
  'page.excel.desc': 'exceljs 导出与导入 .xlsx：导出全部用户，导入时逐行校验并标出错误。',
  'page.exception.desc': '标准异常页，可直接复用。',
};
