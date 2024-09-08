(self.webpackChunk=self.webpackChunk||[]).push([[4234,7002],{77511:function(e,t){"use strict";t.Z={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M928 392c8.8 0 16-7.2 16-16V192c0-8.8-7.2-16-16-16H744c-8.8 0-16 7.2-16 16v56H296v-56c0-8.8-7.2-16-16-16H96c-8.8 0-16 7.2-16 16v184c0 8.8 7.2 16 16 16h56v240H96c-8.8 0-16 7.2-16 16v184c0 8.8 7.2 16 16 16h184c8.8 0 16-7.2 16-16v-56h432v56c0 8.8 7.2 16 16 16h184c8.8 0 16-7.2 16-16V648c0-8.8-7.2-16-16-16h-56V392h56zM792 240h88v88h-88v-88zm-648 88v-88h88v88h-88zm88 456h-88v-88h88v88zm648-88v88h-88v-88h88zm-80-64h-56c-8.8 0-16 7.2-16 16v56H296v-56c0-8.8-7.2-16-16-16h-56V392h56c8.8 0 16-7.2 16-16v-56h432v56c0 8.8 7.2 16 16 16h56v240z"}}]},name:"gateway",theme:"outlined"}},24495:function(e,t,n){"use strict";n.r(t),n.d(t,{default:function(){return x}});var r=n(54306),o=n.n(r),i=n(88506),a=n(45207),s=n(93236),c=n(77511),l=n(15357);function u(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function f(e,t){return t=null!=t?t:{},Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):function(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))})),e}var g=function(e,t){return s.createElement(l.Z,f(function(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{},r=Object.keys(n);"function"==typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(t){u(e,t,n[t])}))}return e}({},e),{ref:t,icon:c.Z}))};var d=s.forwardRef(g),A=n(2087),h=n(57688),m=n(74970),p=n(49283),v=n(80078),Z=n(43290),w=n(30237),y=n(27005),C=n(21186),O=n(17678),D=n(81110),E=n(76087),S=n(10655),B=n(3035),k=n(72348),b=n(82106),L=n(71604),R=n(85831),j=(n(88949),n(62086)),x=function(){p.Z.defaultAccessToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZjBmZTAzMS1jMTJkLTQ5OGQtYTkyYS0xODcyMjU3MTQzMmUiLCJpZCI6MTg2MDcxLCJpYXQiOjE3MDM0MDIwMzl9.DQzBf8T_0U92DwjBcYQqdgwhFs-Cx7EacplwoL_ypjY";var e=h.ZP.useMessage(),t=o()(e,2),r=t[0],c=t[1],l=(0,s.useState)(null),u=o()(l,2),f=u[0],g=u[1],x=(0,s.useRef)(f);(0,s.useEffect)((function(){var e=new E.Z("cesiumContainer",{animation:!1,baseLayerPicker:!1,infoBox:!1,sceneModePicker:!0,selectionIndicator:!1,timeline:!1,navigationHelpButton:!1,navigationInstructionsInitiallyVisible:!1,shouldAnimate:!0,skyAtmosphere:!1,skyBox:!1,vrButton:!1});e.cesiumWidget.creditContainer.style.display="none";var t={destination:v.Z.fromDegrees(116.3974,39.9093,15e6)};return e.camera.flyTo(t),g(e),x.current=e,e.screenSpaceEventHandler.setInputAction((function(t){var n=e.camera.pickEllipsoid(t.position,e.scene.globe.ellipsoid);if(n){var o=S.Z.fromCartesian(n),i=B.Z.toDegrees(o.longitude).toFixed(2),a=B.Z.toDegrees(o.latitude).toFixed(2);r.info("Longitude: ".concat(i,", Latitude: ").concat(a))}}),k.Z.LEFT_CLICK),setTimeout((function(){!function(e){a.HR.forEach((function(t){e.entities.add({position:v.Z.fromDegrees(t.longitude,t.latitude),id:t.id,billboard:{image:n(15338),scale:.3},label:{text:t.label,font:"14px sans-serif",backgroundColor:Z.Z.fromCssColorString("#0094ff"),showBackground:!0,style:w.Z.FILL_AND_OUTLINE,fillColor:Z.Z.WHITE,outlineColor:Z.Z.BLACK,outlineWidth:2,horizontalOrigin:y.Z.CENTER,verticalOrigin:C.Z.BOTTOM,pixelOffset:new O.Z(0,55),pixelOffsetScaleByDistance:new D.Z(150,1.5,8e6,.5)}}).properties={text:t.label}}))}(e)}),100),function(){e.destroy()}}),[]),(0,s.useEffect)((function(){x.current=f}),[f]);var W=(0,s.useRef)();return(0,j.jsxs)(j.Fragment,{children:[c,(0,j.jsxs)(A.Z,{children:[(0,j.jsx)("div",{id:"cesiumContainer",className:"relative"}),(0,j.jsx)("div",{className:"absolute z-10 flex flex-col items-center justify-center rounded-full top-16 right-8",children:(0,j.jsx)(m.ZP,{className:"w-8 h-8 p-0",onClick:function(){return function(){f.cesiumWidget._element.style.cursor="crosshair";var e,t,n=!1;W.current=new b.Z(f.canvas);var o=Date.now();W.current.setInputAction((function(o){var a=f.camera.pickEllipsoid(o.position,f.scene.globe.ellipsoid);if(a)if(n){f.cesiumWidget._element.style.cursor="",n=!1,t.rectangle.coordinates=R.Z.fromCartographicArray([e,S.Z.fromCartesian(a)]),t.rectangle.material=Z.Z.BLACK.withAlpha(.2),t.rectangle.outlineColor=Z.Z.BLACK;var s=t.rectangle.coordinates.getValue(),c=B.Z.toDegrees(s.west),l=B.Z.toDegrees(s.south),u=B.Z.toDegrees(s.east),g=B.Z.toDegrees(s.north);r.success("".concat(c,",").concat(l,",").concat(u,",").concat(g)),console.log("左上角:",c,g,"右下角:",u,l);var d=new S.Z(s.west,s.south),A=new S.Z(s.west,s.north),h=new S.Z(s.east,s.north),m=new S.Z(s.east,s.south);console.log("左上角: ".concat(B.Z.toDegrees(A.longitude),", ").concat(B.Z.toDegrees(A.latitude))),console.log("右上角: ".concat(B.Z.toDegrees(h.longitude),", ").concat(B.Z.toDegrees(h.latitude))),console.log("左下角: ".concat(B.Z.toDegrees(d.longitude),", ").concat(B.Z.toDegrees(d.latitude))),console.log("右下角: ".concat(B.Z.toDegrees(m.longitude),", ").concat(B.Z.toDegrees(m.latitude)));var p=(0,i._$)(f,s);console.log("矩形实体内的实体",p),W.current.removeInputAction(k.Z.LEFT_CLICK),W.current.removeInputAction(k.Z.MOUSE_MOVE)}else n=!0,e=S.Z.fromCartesian(a),t=f.entities.add({rectangle:{coordinates:new L.Z((function(){if(e&&n)return R.Z.fromCartographicArray([e,e])}),!1),material:Z.Z.YELLOW.withAlpha(.2),outline:!0,outlineColor:Z.Z.YELLOW,outlineWidth:2,height:0}})}),k.Z.LEFT_CLICK),W.current.setInputAction((function(r){if(n&&e&&Date.now()-o>100){o=Date.now();var i=f.camera.pickEllipsoid(r.endPosition,f.scene.globe.ellipsoid);if(!i)return;var a=S.Z.fromCartesian(i);t.rectangle.coordinates=R.Z.fromCartographicArray([e,a])}}),k.Z.MOUSE_MOVE)}()},children:(0,j.jsx)(d,{className:"text-lg text-center align-middle text-sky-400 hover:text-sky-400 "})})})]})]})}},88506:function(e,t,n){"use strict";n.d(t,{Bi:function(){return h},He:function(){return d},Kt:function(){return m},Th:function(){return v},_$:function(){return g},iT:function(){return p},rB:function(){return A}});var r=n(93853),o=n(81893),i=n(27944),a=n(10655),s=n(85831),c=n(80078),l=n(62543),u=n(17126),f=n(3035);function g(e,t){for(var n=[],r=e.entities.values,o=0;o<r.length;o++){var c=r[o];if(c.position){var l=c.position.getValue(i.Z.now());if(l){var u=a.Z.fromCartesian(l);s.Z.contains(t,u)&&n.push(c)}}}return n}var d=function(e){var t=e.map((function(e){return c.Z.fromDegrees(e.longitude,e.latitude)}));return t.push(t[0]),new l.Z(t)};function A(e,t,n,r){var o=u.Z.WGS84.maximumRadius,i=a.Z.fromDegrees(e,t,n),s=a.Z.toCartesian(i),g=[];return r.forEach((function(e){var t=f.Z.toRadians(e.direction),n=1e3*e.distance,r=c.Z.fromRadians(a.Z.fromCartesian(s).longitude+n/o*Math.cos(t),a.Z.fromCartesian(s).latitude+n/o*Math.sin(t),a.Z.fromCartesian(s).height);g.push(r)})),g.push(g[0]),new l.Z(g)}function h(e,t,n,r){var o=u.Z.WGS84.maximumRadius,i=a.Z.fromDegrees(e,t,n),s=a.Z.toCartesian(i),g=[];return r.forEach((function(e){var t=f.Z.toRadians(e.azimuth),n=1e3*e.distancekm,r=c.Z.fromRadians(a.Z.fromCartesian(s).longitude+n/o*Math.cos(t),a.Z.fromCartesian(s).latitude+n/o*Math.sin(t),a.Z.fromCartesian(s).height);g.push(r)})),g.push(g[0]),new l.Z(g)}function m(e,t,n,r){var o=c.Z.fromDegrees(e,t,n),i=[o],s=o;return r.forEach((function(e){var t=f.Z.toRadians(e.direction),n=1e3*e.distance,r=c.Z.fromRadians(a.Z.fromCartesian(s).longitude+n/u.Z.WGS84.maximumRadius*Math.cos(t),a.Z.fromCartesian(s).latitude+n/u.Z.WGS84.maximumRadius*Math.sin(t),a.Z.fromCartesian(s).height);i.push(r),s=r})),i.push(o),i}var p=function(e,t){for(var n=[],r=0;r<e.length-1;r++){var o=e[r],i=e[r+1],a=c.Z.distance(c.Z.fromDegrees(o.longitude,o.latitude),c.Z.fromDegrees(i.longitude,i.latitude));if(a>t){for(var s=Math.floor(a/t),l=t,u=0;u<s;u++){var f=o.longitude+(i.longitude-o.longitude)*l/a,g=o.latitude+(i.latitude-o.latitude)*l/a;n.push({longitude:f,latitude:g}),l+=t}n.push(i)}}return n};function v(e){if(console.log("输入polygonArrays:",JSON.stringify(e,null,2)),!Array.isArray(e)||0===e.length)throw new Error("输入必须是多边形坐标的非空数组。");function t(e,t){return e.longitude===t.longitude&&e.latitude===t.latitude}var n=e.map((function(e,n){if(!Array.isArray(e)||e.length<3)return console.warn("索引处的多边形 ".concat(n," 无效(低于3个点)。跳过。")),null;var r=e.filter((function(e,n,r){return function(e){return e&&"number"==typeof e.longitude&&"number"==typeof e.latitude&&!isNaN(e.longitude)&&!isNaN(e.latitude)}(e)&&(0===n||!t(e,r[n-1]))}));return r.length<3?(console.warn("索引处的多边形 ".concat(n," 具有少于3个有效唯一点。跳过。")),null):(t(r[0],r[r.length-1])||r.push(r[0]),console.log("处理多边形 ".concat(n,":"),JSON.stringify(r,null,2)),r)})).filter(Boolean);if(console.log("有效的多边形:",JSON.stringify(n,null,2)),0===n.length)throw new Error("没有要合并的有效多边形。");var i=n.map((function(e,t){try{var n=e.map((function(e){return[e.longitude,e.latitude]}));return console.log("创建 turf 多边形 ".concat(t," 坐标:"),JSON.stringify(n)),r.yu([n])}catch(e){return console.error("创建 turf 多边形错误 ".concat(t,":"),e),null}})).filter(Boolean);if(console.log("创建草皮多边形:",i.length),0===i.length)throw new Error("未能创建有效的 turf 多边形。");if(1===i.length)return console.log("只有一个有效的多边形，不需要合并。"),i[0].geometry.coordinates[0].map((function(e){return{longitude:e[0],latitude:e[1]}}));try{console.log("使用 turf.combine 组合多边形");var a=r.uf(i),s=o.$(a);if(console.log("合并后的结果:",JSON.stringify(s)),!s||!s.features||0===s.features.length)throw new Error("组合导致没有功能");var c=s.features[0];if(!c||!c.geometry||!c.geometry.coordinates)throw new Error("无效的合并多边形结构");return("MultiPolygon"===c.geometry.type?c.geometry.coordinates[0][0]:c.geometry.coordinates[0]).map((function(e){return{longitude:e[0],latitude:e[1]}}))}catch(e){throw console.error("多边形组合时出错:",e),new Error("合并多边形失败: ".concat(e.message))}}},15338:function(e){"use strict";e.exports="data:image/png;base64,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"},57002:function(){}}]);