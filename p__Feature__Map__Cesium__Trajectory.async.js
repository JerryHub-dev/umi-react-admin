"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[5645],{35559:function(e,t,n){n.r(t);var i=n(93525),r=n.n(i),s=n(54306),o=n.n(s),a=n(88506),l=n(45207),u=n(34397),c=n(2087),A=n(57688),d=n(4872),g=n(74970),f=n(49283),p=n(76087),m=n(80078),h=n(3035),S=n(82106),C=n(10655),B=n(43290),k=n(71604),D=n(72348),E=(n(88949),n(93236)),y=n(62086);t.default=function(){var e=A.ZP.useMessage(),t=o()(e,2),i=t[0],s=t[1];f.Z.defaultAccessToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZjBmZTAzMS1jMTJkLTQ5OGQtYTkyYS0xODcyMjU3MTQzMmUiLCJpZCI6MTg2MDcxLCJpYXQiOjE3MDM0MDIwMzl9.DQzBf8T_0U92DwjBcYQqdgwhFs-Cx7EacplwoL_ypjY";var v=(0,E.useState)(null),w=o()(v,2),O=w[0],L=w[1];(0,E.useEffect)((function(){var e=new p.Z("cesiumContainer",{animation:!1,infoBox:!1,sceneModePicker:!0,selectionIndicator:!1,timeline:!1,navigationHelpButton:!1,navigationInstructionsInitiallyVisible:!1,shouldAnimate:!0,skyAtmosphere:!1,skyBox:!1,vrButton:!1});e.cesiumWidget.creditContainer.style.display="none";var t={destination:m.Z.fromDegrees(116.3974,39.9093,15e6)};return e.camera.flyTo(t),L(e),setTimeout((function(){Q(e)}),100),function(){e.destroy()}}),[]);var Q=function(e){var t=l.HR[0];e.entities.add({id:t.id,position:m.Z.fromDegrees(t.longitude,t.latitude),billboard:{image:n(15338),scale:.3}}).properties={text:t.label}},R=(0,E.useState)(!1),U=o()(R,2),x=U[0],F=U[1],G=E.useRef(!1),W=E.useRef([]),q=E.useRef([]),j=E.useRef(null);return(0,y.jsxs)(y.Fragment,{children:[s,(0,y.jsx)(d.Z,{className:"mb-2",message:"轨迹",type:"success"}),(0,y.jsxs)(c.Z,{children:[(0,y.jsx)("div",{id:"cesiumContainer",className:"static"}),(0,y.jsx)("div",{className:"absolute top-8 left-8",children:x?(0,y.jsx)(g.ZP,{id:"startDrawing",className:"text-cyan-50 hover:text-gray-900",onClick:function(){return function(){F(!1),G.current=!1,O.cesiumWidget._element.style.cursor="default",j.current.removeInputAction(D.Z.LEFT_CLICK),console.log("positionsArrRef",W.current),console.log("positionsGeoRef",q.current);var e=(0,a.iT)(q.current,1e3);console.log("绘制完成距离计算路径",e),e.length>1e3?i.open({type:"warning",content:"绘制点过多, 请缩小范围!"}):(e.forEach((function(e){O.entities.add({position:m.Z.fromDegrees(e.longitude,e.latitude),billboard:{image:n(15338),scale:.3}})})),e=[],W.current=[],q.current=[])}()},children:"绘制完成"}):(0,y.jsx)(g.ZP,{id:"startDrawing",className:"text-cyan-50 hover:text-gray-900",onClick:function(){return function(){G.current=!0,F(!0),O.cesiumWidget._element.style.cursor="crosshair";var e=O.entities.values.find((function(e){return"A"===e.properties.text._value}));console.log(e);var t=O.scene.globe.ellipsoid.cartesianToCartographic(e.position._value),n=h.Z.toDegrees(t.longitude),i=h.Z.toDegrees(t.latitude),s=m.Z.fromDegrees(n,i);W.current=[s],q.current=[{longitude:n,latitude:i}],j.current=new S.Z(O.scene.canvas),j.current.setInputAction((function(e){var t=O.camera.pickEllipsoid(e.position,O.scene.globe.ellipsoid);if(t&&G.current){var n=C.Z.fromCartesian(t),i=h.Z.toDegrees(n.longitude),s=h.Z.toDegrees(n.latitude),o=n.height.toFixed(2);if(console.log(i,s,o),O.entities.add({position:t,ellipse:{semiMinorAxis:30,semiMajorAxis:30,material:new B.Z(1,1,1,.5)}}),W.current.length>=1){var a=W.current[W.current.length-1];O.entities.add({polyline:{positions:new k.Z((function(){return[a,t]}),!1),width:2,material:B.Z.YELLOW}})}W.current=[].concat(r()(W.current),[t]),q.current=[].concat(r()(q.current),[{longitude:i,latitude:s}]),console.log("绘制中",W.current),console.log("绘制中",q.current)}}),D.Z.LEFT_CLICK)}()},children:"开始绘制"})}),(0,y.jsx)(g.ZP,{className:"mt-2",onClick:function(){return function(){var e=JSON.parse(JSON.stringify(u.gJ)),t=JSON.parse(JSON.stringify(u.NU)),n=JSON.parse(JSON.stringify(u.Ei)),i=[];e.forEach((function(e){i.push({longitude:e.longitude,latitude:e.latitude})})),i.push({longitude:e[0].longitude,latitude:e[0].latitude});var r=[];t.forEach((function(e){r.push({longitude:e.longitude,latitude:e.latitude})})),r.push({longitude:t[0].longitude,latitude:t[0].latitude});var s=[];n.forEach((function(e){s.push({longitude:e.longitude,latitude:e.latitude})})),s.push({longitude:s[0].longitude,latitude:s[0].latitude});var o=[i,r,s];console.log("polygonArrays",o);try{var l=(0,a.Th)(o);console.log("合并后的多边形:",JSON.stringify(l,null,2)),O.entities.add({polygon:{hierarchy:m.Z.fromDegreesArray(l.flatMap((function(e){return[e.longitude,e.latitude]}))),material:B.Z.RED.withAlpha(.5)}})}catch(e){console.error("合并多边形错误:",e)}}()},children:"相交合并渲染"})]})]})}},15338:function(e){e.exports="data:image/png;base64,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"}}]);