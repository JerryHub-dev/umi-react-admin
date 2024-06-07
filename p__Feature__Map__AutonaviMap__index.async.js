"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[95],{36953:function(n,e,t){t.r(e),t.d(e,{default:function(){return bn}});var r,o=t(54306),i=t.n(o),a=t(27808),u=t(93236);!function(n){n.notload="notload",n.loading="loading",n.loaded="loaded",n.failed="failed"}(r||(r={}));function c(n){return c="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(n){return typeof n}:function(n){return n&&"function"==typeof Symbol&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},c(n)}function l(n,e){var t=Object.keys(n);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(n);e&&(r=r.filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable}))),t.push.apply(t,r)}return t}function f(n){for(var e=1;e<arguments.length;e++){var t=null!=arguments[e]?arguments[e]:{};e%2?l(Object(t),!0).forEach((function(e){s(n,e,t[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(n,Object.getOwnPropertyDescriptors(t)):l(Object(t)).forEach((function(e){Object.defineProperty(n,e,Object.getOwnPropertyDescriptor(t,e))}))}return n}function s(n,e,t){return(e=function(n){var e=function(n,e){if("object"!==c(n)||null===n)return n;var t=n[Symbol.toPrimitive];if(void 0!==t){var r=t.call(n,e||"default");if("object"!==c(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===e?String:Number)(n)}(n,"string");return"symbol"===c(e)?e:String(e)}(e))in n?Object.defineProperty(n,e,{value:t,enumerable:!0,configurable:!0,writable:!0}):n[e]=t,n}var p={AMap:r.notload,AMapUI:r.notload,Loca:r.notload},d={AMap:[],AMapUI:[],Loca:[]},v=f({},{key:"f97efc35164149d0c0f299e7a8adb3d2",AMap:{version:"2.0",plugins:[]},AMapUI:{version:"1.1",plugins:[]},Loca:{version:"2.0.0"}}),y=[];function b(n){var e,t=[];return n.AMapUI&&t.push((e=n.AMapUI,new Promise((function(n,t){var o=[];if(e.plugins)for(var i=0;i<e.plugins.length;i+=1)-1==v.AMapUI.plugins.indexOf(e.plugins[i])&&o.push(e.plugins[i]);if(p.AMapUI!==r.failed){if(p.AMapUI===r.notload){p.AMapUI=r.loading,v.AMapUI.version=e.version||v.AMapUI.version;var a=v.AMapUI.version,u=document.body||document.head,c=document.createElement("script");return c.type="text/javascript",c.src="https://webapi.amap.com/ui/".concat(a,"/main.js"),c.onerror=function(n){p.AMapUI=r.failed,t("请求 AMapUI 失败")},c.onload=function(){if(p.AMapUI=r.loaded,o.length)window.AMapUI.loadUI(o,(function(){for(var e=0,t=o.length;e<t;e++){var r=o[e].split("/").slice(-1)[0];window.AMapUI[r]=arguments[e]}for(n();d.AMapUI.length;)d.AMapUI.splice(0,1)[0]()}));else for(n();d.AMapUI.length;)d.AMapUI.splice(0,1)[0]()},void u.appendChild(c)}p.AMapUI!==r.loaded?e.version&&e.version!==v.AMapUI.version?t("不允许多个版本 AMapUI 混用"):d.AMapUI.push((function(e){e?t(e):o.length?window.AMapUI.loadUI(o,(function(){for(var e=0,t=o.length;e<t;e++){var r=o[e].split("/").slice(-1)[0];window.AMapUI[r]=arguments[e]}n()})):n()})):e.version&&e.version!==v.AMapUI.version?t("不允许多个版本 AMapUI 混用"):o.length?window.AMapUI.loadUI(o,(function(){for(var e=0,t=o.length;e<t;e++){var r=o[e].split("/").slice(-1)[0];window.AMapUI[r]=arguments[e]}n()})):n()}else t("前次请求 AMapUI 失败")})))),n.Loca&&t.push(function(n){return new Promise((function(e,t){if(p.Loca!==r.failed){if(p.Loca===r.notload){p.Loca=r.loading,v.Loca.version=n.version||v.Loca.version;var o=v.Loca.version,i=v.AMap.version.startsWith("2"),a=o.startsWith("2");if(i&&!a||!i&&a)return void t("JSAPI 与 Loca 版本不对应！！");var u=v.key,c=document.body||document.head,l=document.createElement("script");return l.type="text/javascript",l.src="https://webapi.amap.com/loca?v=".concat(o,"&key=").concat(u),l.onerror=function(){p.Loca=r.failed,t("请求 Loca 失败")},l.onload=function(){for(p.Loca=r.loaded,e();d.Loca.length;)d.Loca.splice(0,1)[0]()},void c.appendChild(l)}p.Loca!==r.loaded?n.version&&n.version!==v.Loca.version?t("不允许多个版本 Loca 混用"):d.Loca.push((function(n){n?t(n):t()})):n.version&&n.version!==v.Loca.version?t("不允许多个版本 Loca 混用"):e()}else t("前次请求 Loca 失败")}))}(n.Loca)),Promise.all(t)}function m(n){return new Promise((function(e,t){if(p.AMap!=r.failed){if(p.AMap==r.notload){var o=n.key,i=void 0===o?v.key:o,a=n.version,u=void 0===a?v.AMap.version:a,c=n.plugins,l=void 0===c?[]:c;v.key=i,v.AMap.version=u,v.AMap.plugins=l,p.AMap=r.loading;var f=document.body||document.head;window.__amap_init_callback=function(o){if(delete window.__amap_init_callback,o)return p.AMap=r.failed,void t(o);for(p.AMap=r.loaded,b(n).then((function(){e(window.AMap)})).catch(t);y.length;)y.splice(0,1)[0]()};var s=document.createElement("script");return s.type="text/javascript",s.src="https://webapi.amap.com/maps?callback=__amap_init_callback"+"&v=".concat((d=v).AMap.version)+"&key=".concat(d.key)+"&plugin=".concat(d.AMap.plugins.join(",")),s.onerror=function(n){p.AMap=r.failed,t(n)},void f.appendChild(s)}var d;if(p.AMap!=r.loaded)if(n.key&&n.key!==v.key)t("多个不一致的 key");else if(n.version&&n.version!==v.AMap.version)t("不允许多个版本 JSAPI 混用");else{var m=[];if(n.plugins)for(g=0;g<n.plugins.length;g+=1)-1==v.AMap.plugins.indexOf(n.plugins[g])&&m.push(n.plugins[g]);!function(n){if("function"==typeof n){if(p.AMap===r.loaded)return void n(window.AMap);y.push(n)}}((function(){m.length?window.AMap.plugin(m,(function(){b(n).then((function(){e(window.AMap)})).catch(t)})):b(n).then((function(){e(window.AMap)})).catch(t)}))}else{if(n.key&&n.key!==v.key)return void t("多个不一致的 key");if(n.version&&n.version!==v.AMap.version)return void t("不允许多个版本 JSAPI 混用");var h=[];if(n.plugins)for(var g=0;g<n.plugins.length;g+=1)-1==v.AMap.plugins.indexOf(n.plugins[g])&&h.push(n.plugins[g]);h.length?window.AMap.plugin(h,(function(){b(n).then((function(){e(window.AMap)})).catch(t)})):b(n).then((function(){e(window.AMap)})).catch(t)}}else t()}))}var h="undefined"!=typeof window,g=function(n){return n[0].toUpperCase()+n.slice(1,n.length)},w=function(){return window.AMap||window.proxy.AMap},A=t(62086);function O(n){return O="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(n){return typeof n}:function(n){return n&&"function"==typeof Symbol&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},O(n)}var j=["loading","children","onComplete"];function M(n,e){var t=Object.keys(n);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(n);e&&(r=r.filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable}))),t.push.apply(t,r)}return t}function S(n){for(var e=1;e<arguments.length;e++){var t=null!=arguments[e]?arguments[e]:{};e%2?M(Object(t),!0).forEach((function(e){I(n,e,t[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(n,Object.getOwnPropertyDescriptors(t)):M(Object(t)).forEach((function(e){Object.defineProperty(n,e,Object.getOwnPropertyDescriptor(t,e))}))}return n}function I(n,e,t){return(e=function(n){var e=function(n,e){if("object"!==O(n)||null===n)return n;var t=n[Symbol.toPrimitive];if(void 0!==t){var r=t.call(n,e||"default");if("object"!==O(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===e?String:Number)(n)}(n,"string");return"symbol"===O(e)?e:String(e)}(e))in n?Object.defineProperty(n,e,{value:t,enumerable:!0,configurable:!0,writable:!0}):n[e]=t,n}function P(n,e){return function(n){if(Array.isArray(n))return n}(n)||function(n,e){var t=null==n?null:"undefined"!=typeof Symbol&&n[Symbol.iterator]||n["@@iterator"];if(null!=t){var r,o,i,a,u=[],c=!0,l=!1;try{if(i=(t=t.call(n)).next,0===e){if(Object(t)!==t)return;c=!1}else for(;!(c=(r=i.call(t)).done)&&(u.push(r.value),u.length!==e);c=!0);}catch(n){l=!0,o=n}finally{try{if(!c&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(l)throw o}}return u}}(n,e)||function(n,e){if(!n)return;if("string"==typeof n)return x(n,e);var t=Object.prototype.toString.call(n).slice(8,-1);"Object"===t&&n.constructor&&(t=n.constructor.name);if("Map"===t||"Set"===t)return Array.from(n);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return x(n,e)}(n,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function x(n,e){(null==e||e>n.length)&&(e=n.length);for(var t=0,r=new Array(e);t<e;t++)r[t]=n[t];return r}function U(n,e){if(null==n)return{};var t,r,o=function(n,e){if(null==n)return{};var t,r,o={},i=Object.keys(n);for(r=0;r<i.length;r++)t=i[r],e.indexOf(t)>=0||(o[t]=n[t]);return o}(n,e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(n);for(r=0;r<i.length;r++)t=i[r],e.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(n,t)&&(o[t]=n[t])}return o}var k=function(n){var e=n.loading,t=n.children,r=n.onComplete,o=U(n,j),i=P((0,u.useState)(!1),2),a=i[0],c=i[1],l=P((0,u.useState)(!0),2),f=l[0],s=l[1];return(0,u.useEffect)((function(){m(S(S({},o),{},{key:o.mapKey})).then((function(){var n=w();null==r||r(n),c(!0),s(!1)})).catch((function(n){s(!1)}))}),[JSON.stringify(o)]),f&&e?(0,A.jsx)(A.Fragment,{children:e}):(0,A.jsx)(A.Fragment,{children:a&&t})};function E(n,e){var t=(0,u.useRef)(),r=(0,u.useRef)();return("function"!=typeof e||e(r.current,n))&&(t.current=r.current,r.current=n),t.current}function L(n,e){return function(n){if(Array.isArray(n))return n}(n)||function(n,e){var t=null==n?null:"undefined"!=typeof Symbol&&n[Symbol.iterator]||n["@@iterator"];if(null!=t){var r,o,i,a,u=[],c=!0,l=!1;try{if(i=(t=t.call(n)).next,0===e){if(Object(t)!==t)return;c=!1}else for(;!(c=(r=i.call(t)).done)&&(u.push(r.value),u.length!==e);c=!0);}catch(n){l=!0,o=n}finally{try{if(!c&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(l)throw o}}return u}}(n,e)||function(n,e){if(!n)return;if("string"==typeof n)return C(n,e);var t=Object.prototype.toString.call(n).slice(8,-1);"Object"===t&&n.constructor&&(t=n.constructor.name);if("Map"===t||"Set"===t)return Array.from(n);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return C(n,e)}(n,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function C(n,e){(null==e||e>n.length)&&(e=n.length);for(var t=0,r=new Array(e);t<e;t++)r[t]=n[t];return r}function D(n,e){var t,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},o=r.setterMap,i=void 0===o?{}:o,a=r.converterMap,c=void 0===a?{}:a,l=null!==(t=E(n))&&void 0!==t?t:{},f=(0,u.useRef)([]),s=(0,u.useState)(!1),p=L(s,2),d=p[0],v=p[1];(0,u.useEffect)((function(){e.current&&b(n,!0)}),[n]),(0,u.useEffect)((function(){return function(){if(e.current)try{"destroy"in e.current&&e.current.destroy(),"hide"in e.current&&e.current.hide(),"map"in n&&"setMap"in e.current&&e.current.setMap(null)}catch(n){}}}),[]);var y=function(e){var t,r;(v(!0),"events"in n&&e)&&(null===(t=(r=n.events).created)||void 0===t||t.call(r,e));b(n,!1)},b=function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],r=e.current;if(r)try{Object.keys(n).forEach((function(e){if("events"===e)return m(n);var o=!0;if(t&&(o=h(e,n,l)),o){var a=n[e];if(e in c&&(a=c[e](n[e])),e in i)i[e](a,r);else{var u="set".concat(g(e));u in r&&r[u](a)}}}))}catch(n){}},m=function(n){var t=e.current,r=Object.keys(n.events||{});r.length&&r.forEach((function(e){var r;-1===f.current.indexOf(e)&&(f.current.push(e),t.on(e,(r=e,function(){if(n.events&&r in n.events){for(var e=arguments.length,t=new Array(e),o=0;o<e;o++)t[o]=arguments[o];n.events[r].apply(null,t)}})))}))},h=function(n,e,t){return e[n]!==t[n]};return{loaded:d,prevProps:l,onInstanceCreated:y}}var _=function(n){if(!n)return null;if("getLng"in n&&"getLat"in n)return n;var e=0,t=0;Array.isArray(n)?(e=n[0],t=n[1]):"lng"in n&&"lat"in n?(e=n.lng,t=n.lat):"longitude"in n&&"latitude"in n&&(e=n.longitude,t=n.latitude);var r=w();return h&&r?new r.LngLat(e,t):null},z=["animateEnable","doubleClickZoom","dragEnable","isHotspot","jogEnable","keyboardEnable","pitchEnable","resizeEnable","rotateEnable","scrollWheel","touchZoom","zoomEnable"],R={width:"100%",height:"100%",position:"relative"},N={width:"100%",height:"100%"},Z=["layers","zoom","zooms","center","labelzIndex","lang","mapStyle","features","cursor","pitch","mask","defaultLayer"].concat(z,["view","showIndoorMap","indoorMap","expandZoomRange","touchZoomCenter","showBuildingBlock","viewMode","buildingAnimation","skyColor","WebGLParams"]),T={zoom:function(n,e){e&&e.setZoom(n)},cursor:function(n,e){e&&e.setDefaultCursor(n)},labelzIndex:function(n,e){e&&e.setLabelzIndex(n)}},W={center:_,mapStyle:function(n){return 0===n.indexOf("amap://styles")?n:"amap://styles/".concat(n)}},J=function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},e=(0,u.useRef)(),t=(0,u.useRef)(),r=D(n,t,{setterMap:T,converterMap:W}),o=r.loaded,i=r.prevProps,a=r.onInstanceCreated;(0,u.useEffect)((function(){c().then((function(){var e;null===(e=n.onMapCreate)||void 0===e||e.call(n,t.current),null==a||a(t.current)}))}),[]),(0,u.useEffect)((function(){o&&s(i,n)}),[n]);var c=function(){var n=l(),r=w();return t.current=new r.Map(e.current,n),Promise.resolve()},l=function(){var e={};return Z.forEach((function(t){t in n&&(e[t]=f(t,n))})),e},f=function(n,e){return n in W?W[n](e[n]):e[n]},s=function(n,e){var r={},o=!1;z.forEach((function(t){t in e&&(!0,p(t,n,e)&&(o=!0,r[t]=e[t]))})),o&&t.current.setStatus(r)},p=function(n,e,t){return e[n]!==t[n]};return(0,A.jsxs)("div",{style:R,children:[(0,A.jsx)("div",{ref:e,style:N,children:o?null:n.loading}),(0,A.jsx)("div",{children:o?n.children:null})]})},K=(0,u.createContext)({}),$=function(){return(0,u.useContext)(K)};function H(n){return H="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(n){return typeof n}:function(n){return n&&"function"==typeof Symbol&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},H(n)}var B=["mapKey","version","plugins","AMapUI","Loca","loading","onComplete","onMapCreate"];function F(n,e){var t=Object.keys(n);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(n);e&&(r=r.filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable}))),t.push.apply(t,r)}return t}function G(n){for(var e=1;e<arguments.length;e++){var t=null!=arguments[e]?arguments[e]:{};e%2?F(Object(t),!0).forEach((function(e){X(n,e,t[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(n,Object.getOwnPropertyDescriptors(t)):F(Object(t)).forEach((function(e){Object.defineProperty(n,e,Object.getOwnPropertyDescriptor(t,e))}))}return n}function X(n,e,t){return(e=function(n){var e=function(n,e){if("object"!==H(n)||null===n)return n;var t=n[Symbol.toPrimitive];if(void 0!==t){var r=t.call(n,e||"default");if("object"!==H(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===e?String:Number)(n)}(n,"string");return"symbol"===H(e)?e:String(e)}(e))in n?Object.defineProperty(n,e,{value:t,enumerable:!0,configurable:!0,writable:!0}):n[e]=t,n}function Y(n,e){return function(n){if(Array.isArray(n))return n}(n)||function(n,e){var t=null==n?null:"undefined"!=typeof Symbol&&n[Symbol.iterator]||n["@@iterator"];if(null!=t){var r,o,i,a,u=[],c=!0,l=!1;try{if(i=(t=t.call(n)).next,0===e){if(Object(t)!==t)return;c=!1}else for(;!(c=(r=i.call(t)).done)&&(u.push(r.value),u.length!==e);c=!0);}catch(n){l=!0,o=n}finally{try{if(!c&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(l)throw o}}return u}}(n,e)||function(n,e){if(!n)return;if("string"==typeof n)return q(n,e);var t=Object.prototype.toString.call(n).slice(8,-1);"Object"===t&&n.constructor&&(t=n.constructor.name);if("Map"===t||"Set"===t)return Array.from(n);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return q(n,e)}(n,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function q(n,e){(null==e||e>n.length)&&(e=n.length);for(var t=0,r=new Array(e);t<e;t++)r[t]=n[t];return r}function Q(n,e){if(null==n)return{};var t,r,o=function(n,e){if(null==n)return{};var t,r,o={},i=Object.keys(n);for(r=0;r<i.length;r++)t=i[r],e.indexOf(t)>=0||(o[t]=n[t]);return o}(n,e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(n);for(r=0;r<i.length;r++)t=i[r],e.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(n,t)&&(o[t]=n[t])}return o}var V=u.forwardRef((function(n,e){var t=n.mapKey,r=n.version,o=n.plugins,i=n.AMapUI,a=n.Loca,c=n.loading,l=n.onComplete,f=(n.onMapCreate,Q(n,B)),s=Y((0,u.useState)(),2),p=s[0],d=s[1],v=Y((0,u.useState)(),2),y=v[0],b=v[1];return(0,u.useImperativeHandle)(e,(function(){return y}),[y]),(0,A.jsx)(K.Provider,{value:{AMap:p,map:y},children:(0,A.jsx)(k,{mapKey:t,version:r,plugins:o,Loca:a,AMapUI:i,loading:c,onComplete:function(n){null==l||l(n),d(n)},children:(0,A.jsx)(J,G(G({loading:c},f),{},{onMapCreate:function(n){b(n)}}))})})})),nn=t(19103);function en(n,e){return function(n){if(Array.isArray(n))return n}(n)||function(n,e){var t=null==n?null:"undefined"!=typeof Symbol&&n[Symbol.iterator]||n["@@iterator"];if(null==t)return;var r,o,i=[],a=!0,u=!1;try{for(t=t.call(n);!(a=(r=t.next()).done)&&(i.push(r.value),!e||i.length!==e);a=!0);}catch(n){u=!0,o=n}finally{try{a||null==t.return||t.return()}finally{if(u)throw o}}return i}(n,e)||function(n,e){if(!n)return;if("string"==typeof n)return tn(n,e);var t=Object.prototype.toString.call(n).slice(8,-1);"Object"===t&&n.constructor&&(t=n.constructor.name);if("Map"===t||"Set"===t)return Array.from(n);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return tn(n,e)}(n,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function tn(n,e){(null==e||e>n.length)&&(e=n.length);for(var t=0,r=new Array(e);t<e;t++)r[t]=n[t];return r}var rn=function(){var n=en((0,u.useState)((function(){return document.createElement("div")})),1)[0],e=en((0,u.useState)({render:function(){return null},remove:function(){return null}}),2),t=e[0],r=e[1],o=(0,u.useCallback)((function(n){return{render:function(e){var t=e.children;return t?(0,nn.createPortal)(t,n):null},remove:function(n){n&&(0,nn.unmountComponentAtNode)(n)}}}),[]);return(0,u.useEffect)((function(){n&&t.remove();var e=o(n);return r(e),function(){e.remove(n)}}),[n]),{Portal:t.render,container:n}},on=function(n){return!!n&&"function"==typeof n};function an(n,e,t){var r={};return e.forEach((function(e){e in n&&"visible"!==e&&(r[e]=function(n,e){return n in t?t[n](e[n]):e[n]}(e,n))})),r}var un,cn=["anchor","angle","animation","clickable","content","cursor","draggable","shape","icon","label","offset","position","raiseOnDrag","shadow","title","extData","zIndex","visible"].concat(["topWhenClick","bubble","autoRotation"]),ln={visible:function(n,e){e&&(n?e.show():e.hide())},zIndex:function(n,e){e&&e.setzIndex(n)}},fn={position:_,offset:function(n){if(!n)return null;if("getX"in n&&"getY"in n)return n;var e=0,t=0;Array.isArray(n)?(e=n[0],t=n[1]):"x"in n&&"y"in n&&(e=n.x,t=n.y);var r=w();return h&&r?new r.Pixel(e,t):null}},sn=u.forwardRef((function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},e=arguments.length>1?arguments[1]:void 0,t=$(),r=t.map,o=t.AMap,i=rn(),a=i.container,c=i.Portal,l=(0,u.useRef)(null),f=D(n,l,{setterMap:ln,converterMap:fn}),s=f.onInstanceCreated;(0,u.useEffect)((function(){r&&p().then((function(){null==s||s(l.current)}))}),[r]),(0,u.useImperativeHandle)(e,(function(){return l.current}),[l.current]);var p=function(){var e=an(n,cn,fn);e.map=r;var t=new o.Marker(e);return l.current=t,d(n),Promise.resolve()},d=function(n){("render"in n||"children"in n&&n.children)&&(v(),"className"in n&&n.className&&(a.className=n.className))},v=function(){l.current.setContent(a)},y=n.render||n.children;return on(y)&&(y=y()),y?(0,A.jsx)(c,{children:y}):null})),pn=t(40238),dn=t(92935),vn=t.n(dn),yn=t(25677).ZP.div(un||(un=vn()(["\n  #Amap {\n    width: 600px;\n    height: 400px;\n  }\n"])));function bn(){var n=(0,u.useState)(),e=i()(n,2),t=e[0],r=e[1],o={click:function(n){var e=[n.lnglat.getLng(),n.lnglat.getLat()];pn.ZP.success("获取的坐标点位置为".concat(e)),r(e)}};return(0,A.jsx)(yn,{children:(0,A.jsx)(a.Z,{children:(0,A.jsx)("div",{style:{height:500},children:(0,A.jsx)(V,{events:o,children:t&&(0,A.jsx)(sn,{position:t})})})})})}}}]);