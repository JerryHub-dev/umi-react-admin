"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[17],{16273:function(y,o,n){n.r(o),n.d(o,{default:function(){return x}});var s=n(95442),d=n(82769),F=n(65186),c=n(73665),g=n(69124),E=n(54509),b=n(32864),f=n(31789),h=n(92935),p=n.n(h),m=n(8734),a,v=m.ZP.div(a||(a=p()([`
  // proCard \u7684\u6837\u5F0F
  .ant-pro-card-body {
    padding: 0px;
  }
  // proCard \u7684\u6837\u5F0F
  .audio-player {
    width: 100%;
    height: 80vh;
    background: white;
    margin: auto;
    overflow: hidden;
  }

  .audio-player {
    background-image: url('//sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/music/bg.jpg');
    background-size: 100% 100%;
  }

  #left {
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    margin-left: 10%;
  }

  #mask {
    position: absolute;
    left: 50%;
    top: 0;
    width: 50%;
    height: 100%;
    -webkit-mask-image: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0) 0,
      rgba(255, 255, 255, 0.6) 15%,
      rgba(255, 255, 255, 1) 25%,
      rgba(255, 255, 255, 1) 75%,
      rgba(255, 255, 255, 0.1) 85%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  #gc {
    height: 100%;
    display: block;
    position: relative;
  }

  #mse {
    position: absolute;
    bottom: 0;
    left: 0;
  }

  #album {
    height: 55%;
    background-image: url('//sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/music/poster-big.jpeg');
    background-size: 60%;
    background-repeat: no-repeat;
    background-position: center left;
  }

  #info {
    font-size: 18px;
    line-height: 40px;
    width: 53%;
    color: white;
  }

  #info > div {
    font-size: 12px;
    line-height: 16px;
    color: rgba(225, 225, 225, 0.8);
  }

  .xgplayer-lyric-item {
    display: block;
    text-align: center;
    line-height: 22px !important;
    font-size: 12px !important;
    color: rgba(225, 225, 225, 0.8) !important;
  }

  .xgplayer-lyric-item-active {
    color: rgb(49, 194, 124) !important;
  }

  #canvas {
    width: 100%;
    position: absolute;
    bottom: 45px;
    left: 0;
    z-index: 0;
    -webkit-mask-image: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.3) 0,
      rgba(255, 255, 255, 0.8) 70%,
      rgba(255, 255, 255, 0.9) 100%
    );
  }

  canvas {
    width: 100%;
  }

  .xgplayer-lrcWrap {
    border: 0px solid #ddd !important;
    height: 100% !important;
    padding: 0 !important;
  }

  .xgplayer-lrcForward {
    left: 0px !important;
  }

  .xgplayer-lrcBack {
    left: 0px !important;
    top: 75% !important;
  }

  .select {
    position: relative;
    height: 30px;
    margin: 50px 20px;
    line-height: 30px;
  }

  .select select {
    outline: none;
    width: 100px;
    height: 30px;
  }
`]))),u=n(62086);function x(){return(0,d.Z)(function(){function A(){var e=document.getElementById("js-select");e.addEventListener("change",function(C){var t=C.target.value;window.analyze&&(window.analyze.mode=t,t==="lightning"?(window.analyze.options.count=512,window.analyze.options.stroke=4):(t==="waves"?window.analyze.options.stroke=3:window.analyze.options.stroke=2,window.analyze.options.count=256))})}A();var i=new F.Z({id:"mse",url:"//sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/music/audio.mp3",volume:.8,width:"100%",height:50,mediaType:"audio",presets:["default",c.Z],ignores:["playbackrate"],controls:{initShow:!0,mode:"flex"},marginControls:!0,videoConfig:{crossOrigin:"anonymous"}});i.crossOrigin="anonymous";var B=`[00:00.00] \u8106\u5F31\u4E00\u5206\u949F
[00:00.00] \u4F5C\u66F2 : \u6797\u5BB6\u8C26
[00:00.00] \u4F5C\u8BCD : \u5F90\u4E16\u73CD/\u5434\u8F89\u798F
[00:00.000]\u7F16\u66F2\uFF1A\u6797\u5BB6\u8C26
[00:00.000]\u65F6\u949F\u4E0D\u8981\u8D70
[00:04.220]\u8BA9\u6211\u8106\u5F31\u4E00\u5206\u949F
[00:07.440]\u8981\u591A\u4E45\u624D\u80FD\u4E60\u60EF\u88AB\u653E\u624B
[00:15.800]\u9A6C\u514B\u676F\u7A7A\u4E86 \u6696\u6696\u7684\u6E29\u70ED
[00:22.660]\u5374\u8FD8\u5728\u6211\u624B\u4E2D\u505C\u7559
[00:27.960]
[00:29.790]\u52C7\u6C14\u4E0D\u8981\u8D70
[00:32.200]\u7ED9\u6211\u7406\u7531\u518D\u51B2\u52A8
[00:35.690]\u53BB\u76F8\u4FE1\u7231\u60C5 \u5C31\u7B97\u8FD8\u5728\u75DB
[00:43.960]\u5982\u679C\u6211\u4E0D\u8BF4\u4E0D\u4F1A\u6709\u4EBA\u61C2
[00:50.720]\u5931\u53BB\u4F60\u6211\u6709\u591A\u5BC2\u5BDE
[00:55.610]\u8FD8\u662F\u613F\u610F
[00:57.580]\u4ED8\u51FA\u4E00\u5207\u4EC5\u4EC5\u4E3A\u4E86\u4E00\u4E2A\u597D\u68A6
[01:03.980]\u68A6\u91CC\u6709\u4EBA\u771F\u5FC3\u7231\u6211 \u966A\u6211\u5FEB\u4E50\u4E5F\u966A\u6211\u6C89\u9ED8
[01:11.260]\u6CA1\u6709\u65E0\u7F18\u65E0\u6545\u7684\u75DB\u627F\u53D7\u8D8A\u591A\u8D8A\u6210\u719F
[01:18.630]\u80FD\u8BA9\u4F60\u62E5\u62B1\u66F4\u597D\u7684\u6211
[01:25.030] \u8C01\u4E5F\u4E0D\u8981\u8D70
[01:28.270]\u5E94\u8BE5\u662F\u4E00\u79CD\u5962\u6C42
[01:31.900]\u53EF\u662F\u6211\u53EA\u60F3 \u63E1\u7D27\u4F60\u7684\u624B
[01:39.780]\u6211\u5B81\u613F\u7B49\u5019 \u4E5F\u4E0D\u613F\u9519\u8FC7
[01:46.630]\u4F60\u5BF9\u6211\u5FAE\u7B11\u7684\u65F6\u5019
[01:56.780]
[02:18.910]\u8FD8\u662F\u613F\u610F
[02:21.320]\u7528\u5C3D\u5168\u529B\u4EC5\u4EC5\u4E3A\u4E86\u4E00\u4E2A\u4EE5\u540E
[02:27.870]\u54EA\u6015\u751F\u547D\u5E76\u4E0D\u6E29\u67D4\u54EA\u6015\u88AB\u5E78\u798F\u4E00\u518D\u53CD\u9A73
[02:34.870]\u4E5F\u8981\u76F8\u4FE1\u4F24\u75D5\u7D2F\u7D2F \u5176\u5B9E\u53EA\u662F\u5728\u7422\u78E8
[02:42.070]\u80FD\u8BA9\u4F60\u4E3A\u4E4B\u4E00\u4EAE \u7684\u6211
[02:53.910]
[02:56.350]\u5236\u4F5C\u4EBA\uFF1A\u6797\u5BA5\u5609
[02:57.750]\u5236\u4F5C\u52A9\u7406\uFF1A\u5F20\u5A55\u6C5D
[02:59.010]\u5F55\u97F3\u5E08\uFF1A\u9648\u6587\u9A8F\u3001\u53F6\u80B2\u8F69
[03:00.410]\u5F55\u97F3\u5BA4\uFF1A\u767D\u91D1\u5F55\u97F3\u5BA4
[03:01.740]\u6DF7\u97F3\u5E08\uFF1ASimonLi @ nOiz
[03:03.000]OP: Terence Lam Production & Co. (Warner/Chappell Music, HK Ltd.)
[03:04.050]SP: Warner/Chappell Music Taiwan Ltd.
[03:04.910]OP\uFF1AUniversal Ms Publ Ltd Taiwan
`,w=new g.Z(i,document.querySelector("canvas"),{bgColor:"rgba(0,0,0,0.7)",stroke:3}),l=new E.Z([B],document.querySelector("#gc"),{});l.bind(i);var D=0;i.on("lyricUpdate",function(e){console.log(e),e.lyric===`
`&&D++}),i.on("playing",function(){l.show(),i.mode=2});var r=document.getElementById("canvas");r.width=window.innerWidth,r.height=window.innerHeight*.25}),(0,u.jsx)(v,{children:(0,u.jsx)(s.Z,{className:"shadow-2xl p-0",children:(0,u.jsxs)("div",{className:"audio-player",children:[(0,u.jsxs)("div",{id:"left",children:[(0,u.jsx)("div",{id:"album"}),(0,u.jsxs)("div",{id:"info",children:["\u8106\u5F31\u4E00\u5206\u949F",(0,u.jsx)("div",{children:"\u6B4C\u624B\uFF1A\u6797\u5BA5\u5609"}),(0,u.jsx)("div",{children:"\u4E13\u8F91\uFF1A\u8106\u5F31\u4E00\u5206\u949F "})]})]}),(0,u.jsx)("div",{className:"select",children:(0,u.jsxs)("select",{id:"js-select",children:[(0,u.jsx)("option",{value:"waves",children:"waves"}),(0,u.jsx)("option",{value:"bars",children:"bars"}),(0,u.jsx)("option",{value:"lightning",children:"lightning"}),(0,u.jsx)("option",{value:"vertLines",children:"vertLines"}),(0,u.jsx)("option",{value:"doubleLine",children:"doubleLine"}),(0,u.jsx)("option",{value:"doubleBars",children:"doubleBars"})]})}),(0,u.jsx)("div",{id:"canvas",children:(0,u.jsx)("canvas",{width:"550",height:"110"})}),(0,u.jsx)("div",{id:"mask",children:(0,u.jsx)("div",{id:"gc"})}),(0,u.jsx)("div",{id:"mse"})]})})})}}}]);
