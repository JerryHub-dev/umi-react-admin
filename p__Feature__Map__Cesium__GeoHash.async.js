"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[899],{95494:function(e,t,n){n.r(t),n.d(t,{default:function(){return M}});var s=n(54306),o=n.n(s);function a(e,t,n){for(var s=[16,8,4,2,1],o=!0,a=-90,i=90,r=-180,c=180,l=0,u=0,d="";d.length<n;){if(o){var g=(r+c)/2;t>g?(u|=s[l],r=g):c=g}else{var m=(a+i)/2;e>m?(u|=s[l],a=m):i=m}o=!o,l<4?l++:(d+="0123456789bcdefghjkmnpqrstuvwxyz"[u],l=0,u=0)}return d}var i=n(80583),r=n(57688),c=n(4872),l=n(20136),u=n(74970),d=n(3964),g=n(49283),m=n(9157),h=n(80078),f=n(10655),Z=n(3035),v=n(72348),x=n(85831),p=n(43290),D=n(63452),j=(n(88949),n(93236)),C=n(62086),M=function(){var e=(0,j.useState)(null),t=o()(e,2),n=t[0],s=t[1],M=r.ZP.useMessage(),k=o()(M,2),w=k[0],y=k[1];g.Z.defaultAccessToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZjBmZTAzMS1jMTJkLTQ5OGQtYTkyYS0xODcyMjU3MTQzMmUiLCJpZCI6MTg2MDcxLCJpYXQiOjE3MDM0MDIwMzl9.DQzBf8T_0U92DwjBcYQqdgwhFs-Cx7EacplwoL_ypjY",(0,j.useEffect)((function(){var e=new m.Z("cesiumContainer",{animation:!1,infoBox:!1,sceneModePicker:!0,selectionIndicator:!1,timeline:!1,navigationHelpButton:!1,navigationInstructionsInitiallyVisible:!1,shouldAnimate:!0,skyAtmosphere:!1,skyBox:!1,vrButton:!1});e.cesiumWidget.creditContainer.style.display="none";var t={destination:h.Z.fromDegrees(116.3974,39.9093,15e6)};return e.camera.flyTo(t),e.screenSpaceEventHandler.setInputAction((function(t){var n=e.camera.pickEllipsoid(t.position,e.scene.globe.ellipsoid);if(n){var s=f.Z.fromCartesian(n),o=Z.Z.toDegrees(s.longitude).toFixed(2),a=Z.Z.toDegrees(s.latitude).toFixed(2);w.info("Longitude: ".concat(o,", Latitude: ").concat(a))}}),v.Z.LEFT_CLICK),e.camera.moveEnd.addEventListener((function(){var t=e.camera.positionCartographic.height;console.log("相机高度变化: ",t)})),s(e),function(){e.destroy()}}),[]);var b=(0,j.useState)(""),I=o()(b,2),N=I[0],T=I[1],A=(0,j.useState)(5),E=o()(A,2),L=E[0],B=E[1],S=(0,j.useState)(""),z=o()(S,2),J=z[0],G=z[1],P=(0,j.useState)(""),O=o()(P,2),Q=O[0],F=O[1];var H=(0,j.useState)([]),R=o()(H,2),V=R[0],Y=R[1],q=function(){var e,t=(e=n.camera.computeViewRectangle())?{west:Z.Z.toDegrees(e.west),south:Z.Z.toDegrees(e.south),east:Z.Z.toDegrees(e.east),north:Z.Z.toDegrees(e.north)}:null;if(t){console.log("Map view rectangle:",t);var s=function(e,t){for(var s=e.west,o=e.south,i=(e.east-s)/3,r=(e.north-o)/2,c=[],l=0;l<3;l++)for(var u=0;u<2;u++){var d=s+l*i,g=d+i,m=o+u*r,h=m+r,f=a((m+h)/2,(d+g)/2,t);c.push({geohash:f,bounds:{subWest:d,subSouth:m,subEast:g,subNorth:h}}),n.entities.add({rectangle:{coordinates:x.Z.fromDegrees(d,m,g,h),material:p.Z.RED.withAlpha(.3),outline:!0,outlineColor:p.Z.BLACK}})}return c}(t,5);console.log("Geohashes for sub-areas:",s),Y(s)}};return(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)(c.Z,{className:"mb-2",message:"空间点索引算法-GeoHash",type:"success"}),(0,C.jsxs)(i.Z,{children:[y,null===n&&(0,C.jsx)(l.Z,{spinning:!0}),(0,C.jsx)("div",{id:"cesiumContainer"}),(0,C.jsx)(u.ZP,{className:"mt-2",onClick:function(){n.entities.removeAll()},children:"清除所有"}),(0,C.jsxs)("div",{className:"mt-2",children:[(0,C.jsx)(u.ZP,{onClick:function(){return q()},children:"视图范围内 geohash"}),V.map((function(e,t){return(0,C.jsx)("span",{className:"ml-2 text-red-600",children:e.geohash},t)}))]}),(0,C.jsxs)("div",{className:"mt-2",children:[(0,C.jsx)(u.ZP,{onClick:function(){return function(){if(null!==n){var e=n.camera.computeViewRectangle(),t=x.Z.southwest(e),s=x.Z.southeast(e),o=x.Z.northeast(e),a=x.Z.northwest(e);F("\n      西北角/左上角: ".concat(Z.Z.toDegrees(a.longitude),", ").concat(Z.Z.toDegrees(a.latitude),"\n      东北角/右上角: ").concat(Z.Z.toDegrees(o.longitude),", ").concat(Z.Z.toDegrees(o.latitude),"\n      东南角/右下角: ").concat(Z.Z.toDegrees(s.longitude),", ").concat(Z.Z.toDegrees(s.latitude),"\n      西南角/左下角: ").concat(Z.Z.toDegrees(t.longitude),", ").concat(Z.Z.toDegrees(t.latitude),"\n    "))}}()},children:"获取视图范围"}),(0,C.jsx)("div",{className:"ml-4 text-red-600 text-success",children:Q})]}),(0,C.jsxs)("div",{className:"mt-2",children:[(0,C.jsx)(d.Z,{addonBefore:"精度",className:"mr-2 w-[120px]",min:1,max:10,value:L,defaultValue:L,onChange:function(e){B(e)}}),(0,C.jsx)(u.ZP,{onClick:function(){return function(){if(null!==n){var e=n.camera.position,t=f.Z.fromCartesian(e);console.log(t);var s=Z.Z.toDegrees(t.longitude),o=Z.Z.toDegrees(t.latitude);console.log(s,o);var i=a(o,s,L);w.success("生成的GeoHash: ".concat(i)),G(i),setTimeout((function(){n.entities.removeAll();var e=function(e){if(0===e.length)return null;for(var t=[16,8,4,2,1],n=!0,s=-90,o=90,a=-180,i=180,r=0,c=0,l=0,u=0;u<e.length;u++){l="0123456789bcdefghjkmnpqrstuvwxyz".indexOf(e[u]);for(var d=0;d<5;d++){var g=t[d];n?(c=(a+i)/2,l&g?a=c:i=c):(r=(s+o)/2,l&g?s=r:o=r),n=!n}}return{latitude:r,longitude:c,latitudeMin:s,latitudeMax:o,longitudeMin:a,longitudeMax:i}}(i);console.log(e);var t=x.Z.fromDegrees(e.longitudeMin,e.latitudeMin,e.longitudeMax,e.latitudeMax),s=n.entities.add({rectangle:{coordinates:t,fill:!0,material:p.Z.RED.withAlpha(.5),outline:!0,outlineColor:p.Z.BLACK}});n.zoomTo(s,new D.Z(0,-.5,0))}),100)}}()},children:"生成 GeoHash"}),(0,C.jsx)("span",{className:"ml-4 text-red-600 text-success",children:J})]}),(0,C.jsxs)("div",{className:"mt-2",children:[(0,C.jsx)(u.ZP,{onClick:function(){return function(){if(null!==n){var e=n.camera.position,t=f.Z.fromCartesian(e),s=Z.Z.toDegrees(t.longitude),o=Z.Z.toDegrees(t.latitude);w.success("中心点坐标: ".concat(s,", ").concat(o)),T("".concat(s,", ").concat(o))}}()},children:"获取中心点坐标"}),(0,C.jsx)("span",{className:"ml-4 text-red-600 text-success",children:N})]})]})]})}}}]);