"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[951],{20469:function(){},52522:function(t,e,n){function i(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(t);e&&(i=i.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),n.push.apply(n,i)}return n}function r(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?i(Object(n),!0).forEach((function(e){s(t,e,n[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))}))}return t}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function a(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,y(i.key),i)}}function c(t,e,n){return e&&a(t.prototype,e),n&&a(t,n),Object.defineProperty(t,"prototype",{writable:!1}),t}function s(t,e,n){return(e=y(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function l(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&f(t,e)}function u(t){return(u=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}function f(t,e){return(f=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t})(t,e)}function h(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function d(t,e){if(e&&("object"==typeof e||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return h(t)}function p(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(t){return!1}}();return function(){var n,i=u(t);if(e){var r=u(this).constructor;n=Reflect.construct(i,arguments,r)}else n=i.apply(this,arguments);return d(this,n)}}function y(t){var e=function(t,e){if("object"!=typeof t||null===t)return t;var n=t[Symbol.toPrimitive];if(void 0!==n){var i=n.call(t,e||"default");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===e?String:Number)(t)}(t,"string");return"symbol"==typeof e?e:String(e)}n.d(e,{Lc:function(){return h},PA:function(){return o},WY:function(){return p},XW:function(){return l},Zj:function(){return r},_x:function(){return s},qH:function(){return c}})},51457:function(t,e,n){n.d(e,{Z:function(){return u}});var i=n(52522);function r(t,e,n){for(var i=t.createLinearGradient(0,0,e,0),r=100/n.length,o=0;o<n.length;o++)i.addColorStop(r*o/100,n[o]);return i}function o(t,e,n,i){var r=n.w,o=n.linear,a=n.reverse,c=n.offset;t.save(),t.beginPath();var s=1*r/i;t.strokeStyle=o;for(var l=0,u=0,f=0;f<i;f++)u=c-(u=a?0-e[f]:e[f]),0===f?t.moveTo(l,u):t.lineTo(l,u),l+=s;t.lineTo(r,u),t.stroke()}var a={bars:function(t){var e=t.data,n=t.options,i=t.ctx,r=t.h,o=t.w,a=e.length>n.count?n.count:e.length,c=parseInt(r/255*2,10);i.clearRect(0,0,o,r),i.fillStyle=n.bgColor,i.fillRect(0,0,o,r);for(var s,l=o/a,u=l-l/4,f=0,h=n.linear,d=0;d<a;d++)s=e[d],i.fillStyle=h,i.fillRect(f,r-s,u,s*c+r/2),f+=l},vertLines:function(t){var e=t.data,n=t.options,i=t.ctx,r=t.h,o=t.w,a=n.count||128;e.length<a&&(a=e.length);var c=r/255,s=o/a,l=n.linear;i.clearRect(0,0,o,r),i.fillStyle=n.bgColor,i.fillRect(0,0,o,r);for(var u=1;u<=a;u++){var f=e[u];f*=c;var h=s*u;i.moveTo(h,r),i.lineTo(h,r-f),i.strokeStyle=l,i.stroke(),i.beginPath()}},lightning:function(t){var e=t.data,n=t.options,i=t.ctx,r=t.h,o=t.w,a=e.length>n.count?n.count:e.length;i.clearRect(0,0,o,r),i.fillStyle=n.bgColor,i.fillRect(0,0,o,r),i.beginPath();var c=n.linear;i.strokeStyle=c;for(var s=o/a,l=0,u=0;u<a;u++){var f=e[u]/128*r/2;0===u?i.moveTo(l,f):i.lineTo(l,f),l+=s}i.lineTo(o,r/2),i.stroke()},doubleLine:function(t){var e=t.data,n=t.options,i=t.ctx,r=t.h,o=t.w,a=r/255,c=o/128,s=n.count||128;i.clearRect(0,0,o,r),i.fillStyle=n.bgColor,i.fillRect(0,0,o,r);for(var l=n.linear,u=1;u<=s;u++){var f=e[u];f+=5;var h=c*u,d=r/2+(f*=a)/2;i.moveTo(h,d),i.lineTo(h,d-f),i.strokeStyle=l,i.stroke(),i.beginPath()}},doubleBars:function(t){var e=t.data,n=t.options,i=t.ctx,r=t.h,o=t.w,a=e.length>n.count?n.count:e.length,c=r/255;i.clearRect(0,0,o,r),i.fillStyle=n.bgColor,i.fillRect(0,0,o,r);for(var s,l=o/a,u=l-l/4,f=0,h=n.linear,d=0;d<a;d++)s=e[d]*c,i.fillStyle=h,i.fillRect(f,r/2+s/2,u,-s),f+=l},waves:function(t){var e=t.options,n=t.ctx,i=t.h,r=t.w,a=t.data,c=e.colors;a=function(t,e){(!e||e<1)&&(e=t.length*e);for(var n=[],i=Math.floor(t.length/e),r=1;r<=e;r++){var o=t.slice(r*i,r*i+i),a=o[Math.floor(o.length/2)];n.push(a)}return n}(a,2048),a=function(t,e){for(var n=Math.floor(t.length/e),i=[],r=[],o=0,a=0;a<=n*e;a++)o===n&&(i.push(r),r=[],o=0),r.push(t[a]),o++;return i}(a=function(t,e){var n=e/255;return e<=3&&e>=0&&(n=e),t.map((function(t){return t*n}))}(a,i/2),4).slice(0,3),n.clearRect(0,0,r,i),n.fillStyle=e.bgColor,n.fillRect(0,0,r,i);for(var s=0;s<a.length;s++)o(n,a[s],{linear:c[s],w:r,h:i,offset:i/2,reverse:!1},a[s].length),o(n,a[s],{linear:c[s],w:r,h:i,offset:i/2,reverse:!0},a[s].length)}},c={bars:2,vertLines:1,lightning:2,doubleLine:1,doubleBars:2,waves:2},s={BARS:"bars",VERT_LINES:"vertLines",LIGHTNING:"lightning",DOUBLE_LINE:"doubleLine",DOUBLE_BARS:"doubleBars",WAVES:"waves"};function l(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},r=arguments.length>3?arguments[3]:void 0;if(e){(n=(0,i.Zj)({},n)).stroke||(n.stroke=1),n.colors||(n.colors=["#ff8177","#cf556c","#f99185","#b12a5b"]);var o=e.getContext("2d"),s=e.height,l=e.width;o.strokeStyle=n.colors[0],o.lineWidth=n.stroke;var u={data:t,options:n,ctx:o,h:s,w:l};"string"==typeof n.mode&&(n.mode=[n.mode]),n.mode.forEach((function(t){r%c[t]==0&&(o.clearRect(0,0,l,s),o.beginPath(),a[t](u))}))}}var u=function(){function t(e,n){var o=this,a=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};(0,i.PA)(this,t),(0,i._x)(this,"start",(function(){o.reqId||o._renderFrame()})),(0,i._x)(this,"stop",(function(){cancelAnimationFrame(o.reqId),o.reqId=null})),(0,i._x)(this,"_onDestroy",(function(){o._audioCtx.close()})),(0,i._x)(this,"_onoVolumechange",(function(){console.log("onoVolumechange"),o.gainNode.gain.setValueAtTime(o.player.volume,o.player.currentTime)})),(0,i._x)(this,"_renderFrame",(function(){o.reqId&&cancelAnimationFrame(o.reqId),o.reqId=requestAnimationFrame(o._renderFrame),o.frameCount++,"lightning"===o.mode?o.analyser.getByteTimeDomainData(o.dataArray):o.analyser.getByteFrequencyData(o.dataArray),l.call(o,o.dataArray,o.canvas,o.options,o.frameCount)})),this.canvas=n;var c=this.canvas.getBoundingClientRect(),s=c.width,u=c.height;if(this.canvas.width=2*s,this.canvas.height=2*u,this.player=e,this.options=t.defaultConfig,Object.keys(a).map((function(t){o.options[t]=a[t]})),t.AudioCtx){e.audioCtx?this._audioCtx=e.audioCtx:this._audioCtx=new t.AudioCtx,this.analyser=this._audioCtx.createAnalyser();var f=this._audioCtx.createGain();f.gain.setValueAtTime(e.volume,e.currentTime),this.gainNode=f,this.source=this._audioCtx.createMediaElementSource(e.video),this.ctx=n.getContext("2d"),this.source.connect(this.analyser),this.analyser.connect(f),this.fftSize=this.options.fftSize,this.frameCount=0,this.options.isGradient&&(this.options.linear=r(this.ctx,n.width,this.options.colors)),f.connect(this._audioCtx.destination),this._initPlayerEvents()}}return(0,i.qH)(t,[{key:"_initPlayerEvents",value:function(){var t=this;["play","playing","seeked"].forEach((function(e){t.player.on(e,t.start)})),this.player.on("volumechange",this._onoVolumechange),this.player.on("destroy",this._onDestroy)}},{key:"destroy",value:function(){var t=this;this.stop(),["play","playing","seeked"].forEach((function(e){t.player.off(e,t.start)})),this.player.off("volumechange",this._onoVolumechange),this.player.off("destroy",this._onDestroy),this._audioCtx.close()}},{key:"mode",get:function(){return this.options.mode},set:function(t){this.options.mode=t}},{key:"fftSize",get:function(){return 2*this.analyser.frequencyBinCount},set:function(t){this.analyser.fftSize=t;var e=this.analyser.frequencyBinCount;this.dataArray=new Uint8Array(e)}}],[{key:"defaultConfig",get:function(){return{fftSize:16384,count:1024,mode:"bars",colors:["#ff8177","#cf556c","#f99185","#b12a5b"],stroke:2,bgColor:"#000",isGradient:!0,linear:null}}},{key:"MODES",get:function(){return s}},{key:"AudioCtx",get:function(){return window.AudioContext||window.webkitAudioContext}}]),t}()},69051:function(t,e,n){n.d(e,{Z:function(){return a}});var i=n(52522),r=n(75190),o=(0,i.qH)((function t(e){(0,i.PA)(this,t),this.regRule=/(\d{2}(?=:)):(\d{2}(?=\.))\.(\d{2,3})/g,this.regRule.test(e)?this.time=60*RegExp.$1+1*RegExp.$2+1*("0."+RegExp.$3):this.time=-1})),a=function(){function t(e,n){var r=this;(0,i.PA)(this,t),this.rawTxts=e,this.txts=e.map((function(t){return t.replace(/^[\r\n]|[\r\n]$/g,"").match(/(\[.*\])[^[]+/g)})),this.isDynamics=e.map((function(t,e){return[].concat(t.match(/\[\d{2}:\d{2}\.\d{2,3}\]/g)).length===r.txts[e].length&&r.txts[e].length===r.txts[0].length&&r.txts[e].length>1})),this.isDynamic=this.isDynamics.some((function(t){return t})),this.__ainimateInterval__=0,this.__offset__=0,this.__offsetScale__=.5,this.dom=n,this.lists=[],this.isDynamics.map((function(t,e){t&&r.lists.push(r.txts[e].map((function(t,e){var n=/(\[[\d:\S]+\])([^[]+)/g.test(t),i=RegExp.$1,r=RegExp.$2;return{time:n?new o(i).time:-1,lyric:r,idx:e}})))})),this.list=this.lists.reduce((function(t,e){return t.map((function(t,n){return{time:t.time,lyric:"\n"===t.lyric?"".concat(t.lyric).concat(e[n].lyric):"".concat(t.lyric,"<br/>").concat(e[n].lyric),idx:n}}))})),this.line=0}return(0,i.qH)(t,[{key:"interval",get:function(){return this.__ainimateInterval__},set:function(t){this.__ainimateInterval__=t}},{key:"offset",get:function(){return this.__offset__},set:function(t){this.__offset__=t}},{key:"offsetScale",get:function(){return this.__offsetScale__},set:function(t){this.__offsetScale__=t}},{key:"adjust",value:function(){for(var t,e,n=this.list,i=0,r=n.length;i<r;i++){for(t=i+1;t<r&&!(n[t].time>n[i].time);t++);if(t<r){var o=(n[t].time-n[i].time)/(t-i);for(e=i+1;e<t;e++)n[e].time=n[e-1].time+o}}}},{key:"find",value:function(t){var e=this.list,n=this.__ainimateInterval__,i=this.__offset__;return t=t+i>0?t+i:0,e.filter((function(i,r){var o=i.time,a=r+1;return t>=o&&(e[a]&&1*t+1*n<=e[a].time||a>=e.length)}))}},{key:"bind",value:function(t){var e=this,n=this;return this.__player__=t,!!n.isDynamic&&(n.__handle__=function(){var n=e.find(t.currentTime)[0];n&&n.idx!==e.line&&(e.line=n.idx,t.emit("lyricUpdate",n))}.bind(n,t),t.on("timeupdate",n.__handle__),n.__startHandle__=function(){t.emit("lyricUpdate",n.list[0])}.bind(n,t),t.once("playing",n.__startHandle__),!0)}},{key:"unbind",value:function(t){delete this.__player__,this.__handle__&&(t.off("lyricUpdate",this.__handle__),delete this.__handle__)}},{key:"show",value:function(){var t=this,e=this.dom,n=[],i=this,o=["click","touchstart"];if(e&&1===e.nodeType){var a=r.ZP.createDom("div","<div></div>",{},"xgplayer-lrcWrap");e.appendChild(a),this.list.forEach((function(t){n.push('<xg-lyric-item class="xgplayer-lyric-item" data-idx="'.concat(t.idx,'">').concat(t.lyric.replace(/[\r\n]/g,""),"</xg-lyric-item>"))})),a.innerHTML=n.join("");var c=r.ZP.createDom("xg-lrcForward","<div></div>",{},"xgplayer-lrcForward");e.appendChild(c),o.forEach((function(t){c.addEventListener(t,(function(t){t.preventDefault(),t.stopPropagation(),i.offset-=i.offsetScale,console.log("lyric go forward ".concat(i.offsetScale,"s"))}),!1)}));var s=r.ZP.createDom("xg-lrcBack","<div></div>",{},"xgplayer-lrcBack");e.appendChild(s),o.forEach((function(t){s.addEventListener(t,(function(t){t.preventDefault(),t.stopPropagation(),i.offset+=i.offsetScale,console.log("lyric go back ".concat(i.offsetScale,"s"))}),!1)})),this.__updateHandle__=function(e){var n,i=t.dom.querySelector(".xgplayer-lrcWrap"),r=i.querySelector(".xgplayer-lyric-item-active"),o=i.offsetHeight;r&&(r.className="xgplayer-lyric-item"),(r=i.querySelector('.xgplayer-lyric-item[data-idx="'.concat(e.idx,'"]')))&&(r.className="xgplayer-lyric-item xgplayer-lyric-item-active",(n=r.getBoundingClientRect().top-i.getBoundingClientRect().top+i.scrollTop-o/2)&&(i.scrollTop=n))},this.__player__.on("lyricUpdate",this.__updateHandle__)}else this.__player__.emit("error","lyric container can not be empty")}},{key:"hide",value:function(){this.__updateHandle__.off("lyricUpdate",this.__updateHandle__)}}]),t}()},61741:function(t,e,n){n.d(e,{Z:function(){return x}});var i=n(52522),r=n(75190),o=n(22834),a=n(87201),c=function(){function t(e,n){(0,i.PA)(this,t),this.url=e;var r=new window.XMLHttpRequest;r.target=this,r.responseType="arraybuffer",r.open("get",e),r.onload=function(){200!==r.status&&206!==r.status||n&&n instanceof Function&&n(r.response)},r.onerror=function(t){},this.xhr=r,this.run()}return(0,i.qH)(t,[{key:"cancel",value:function(){this.xhr.abort()}},{key:"run",value:function(){1===this.xhr.readyState&&this.xhr.send()}}]),t}(),s={ORDER:"order",SLOOP:"sloop",LOOP:"loop",RANDOM:"random"},l="xgplayer-music";function u(t,e,n){var i=Math.floor(Math.random()*(e-t)+t);return i===n?(i>e/2?e/=2:t=e/2,e-t>2?u(t,e,n):i):i}var f=function(t){(0,i.XW)(n,t);var e=(0,i.WY)(n);function n(){var t;(0,i.PA)(this,n);for(var r=arguments.length,o=new Array(r),a=0;a<r;a++)o[a]=arguments[a];return t=e.call.apply(e,[this].concat(o)),(0,i._x)((0,i.Lc)(t),"_onEnded",(function(){if("order"===t.mode&&t.index+1>=t.list.length)return t.player.pause(),void(t.player.currentTime=0);if(t.mode===s.SLOOP)t.change();else t.next()})),(0,i._x)((0,i.Lc)(t),"_onDurationChange",(function(){var e=t.config.abCycle;t._initABCycle(e,t.player)})),(0,i._x)((0,i.Lc)(t),"_onTimeUpdate",(function(){var e=(0,i.Lc)(t),n=e.config,r=e.player;if(!t.halfPass&&r.currentTime>r.duration/2&&t.confirmOrder(),n.abCycle){var o=n.abCycle,a=o.end>r.duration?r.duration:o.end;r.currentTime>=a?(o.loop||(r.pause(),t.emit("abCycle_ended")),r.currentTime=o.start||0):r.currentTime<o.start&&(r.currentTime=o.start||0)}})),t}return(0,i.qH)(n,[{key:"afterCreate",value:function(){var t=this.player,e=this.playerConfig;r.ZP.addClass(t.root,l),this.halfPass=!1,this.list=this.config.list||[],this.nextIndex=-1,this.prevIndex=-1,this.history=[],this.disable=!(this.list.length>0),0!==this.list.length&&(!e.url&&this.list.length>0&&(e.url=this.list[0].src),e.poster||(e.poster=this.list[0].poster),e.title||(e.title=this.list[0].title||""),e.vid||(e.vid=this.list[0].vid||""),this._curInfo={src:e.url,poster:e.poster,title:e.title,vid:e.vid},this.index=0,this.on(o.TIME_UPDATE,this._onTimeUpdate),this.on(o.ENDED,this._onEnded),this.on(o.DURATION_CHANGE,this._onDurationChange),this.config.offline&&this.checkOffline(this._curInfo.src,this._curInfo.vid).then((function(n){0===n.code&&(e.url=n.url,t.state>=4&&(t.src=n.url))})).catch((function(t){})))}},{key:"destroy",value:function(){r.ZP.removeClass(this.player.root,l)}},{key:"_nextCompute",value:function(){if(!this.disable)switch(this.mode){case s.SLOOP:case s.ORDER:case s.LOOP:this.index+1<this.list.length?this.nextIndex=this.index+1:this.nextIndex=0;break;default:this.nextIndex=u(0,this.list.length,this.index)}}},{key:"_prevCompute",value:function(){if(!this.disable)switch(this.mode){case s.SLOOP:case s.ORDER:case s.LOOP:this.index-1>=0?this.prevIndex=this.index-1:this.prevIndex=this.list.length-1;break;default:this.prevIndex=u(0,this.list.length,this.index)}}},{key:"_emitChange",value:function(){this.emit("change",this._curInfo)}},{key:"_initABCycle",value:function(t,e){var n=e.plugins.progresspreview;if(t&&e){var i=t.end>this.player.duration?this.player.duration:t.end,r=t.start>this.player.duration?0:t.start,o={id:e.playerId,time:t.start,duration:i-r,text:t.text,color:t.color};n.findDot(o.id)?n.updateDot(o):n.createDot(o)}else n.findDot(e.playerId)&&n.deleteDot(e.playerId)}},{key:"random",value:function(){if(this.list.length<0)return null;var t=u(0,this.list.length,this.index);return this.list[t]}},{key:"next",value:function(){this.disable||(this.halfPass||(this.halfPass=!0,this._nextCompute()),this.index=this.nextIndex,this.change())}},{key:"prev",value:function(){this.disable||(this.halfPass||(this.halfPass=!0,this._prevCompute()),this.index=this.prevIndex,this.change())}},{key:"forward",value:function(){var t=this.player,e=this.config.timeScale;t.currentTime=t.currentTime+e<t.duration?t.currentTime+e:t.duration-.1}},{key:"backward",value:function(){var t=this.player,e=this.config.timeScale;t.currentTime=t.currentTime-e>0?t.currentTime-e:0}},{key:"add",value:function(t){this.list.push({src:t.src,title:t.title,vid:t.vid,poster:t.poster})}},{key:"remove",value:function(t){var e=-1;this.list.every((function(n,i){return n.vid!==t||(e=i,!1)})),e>-1&&this.list.splice(e,1)}},{key:"setAbCycle",value:function(t,e,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};t&&"Object"===r.ZP.typeof(t)?this.config.abCycle=(0,i.Zj)({},t):this.config.abCycle=(0,i.Zj)({start:t||0,end:e||this.player.duration,loop:n},o),this._initABCycle(this.config.abCycle,this.player)}},{key:"removeAbCycle",value:function(){this.config.abCycle=null,this._initABCycle(null,this.player)}},{key:"updateList",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[];this.removeAbCycle(),this.player.pause(),this.player.currentTime=0,this.list=t,this.nextIndex=0,this.index=0,this.change()}},{key:"setIndex",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0;t<0||t>=this.list.length||(this.nextIndex=t,this.index=t,this.change())}},{key:"change",value:function(){var t=this;if(!this.disable){var e=this.player,n=this.list,i=this.index,r=n[i].vid;this.halfPass=!1,this.checkOffline(n[i].src,r).then((function(n){t._curInfo={title:t.list[t.index].title||"",vid:t.list[t.index].vid,poster:t.list[t.index].poster||"",src:n.url},e.playNext({url:n.url,vid:t.list[t.index].vid||0,poster:t.list[t.index].poster||"",autoplay:!0}),e.off("timeupdate",t._emitChange),e.once("timeupdate",t._emitChange),e.play()}))}}},{key:"checkOffline",value:function(t,e){var n=this;return new Promise((function(i,r){n.config.offline&&!n.disable||i({url:t,code:-1,vid:e});var o=n.player.database;o.openDB((function(){o.getDataByKey(o.myDB.ojstore.name,e,(function(n){setTimeout((function(){o.closeDB()}),5e3),i(n?{url:URL.createObjectURL(n.blob),code:0,vid:n.vid}:{url:t,code:-2,vid:e})}))}))}))}},{key:"confirmOrder",value:function(){this.halfPass=!0,this._nextCompute(),this._prevCompute(),this.config.preloadNext&&this.preload(this.nextIndex)}},{key:"preload",value:function(t){if(!(t<0||t>=this.list.length)){var e=this.list[t],n=this.player;this.checkOffline(e.src,e.vid).then((function(t){if(-2===t.code){var i=e.vid;new c(e.src,(function(t){n.database.openDB((function(){n.database.addData(n.database.myDB.ojstore.name,[{vid:i,blob:new Blob([t],{type:'audio/mp4; codecs="mp4a.40.5"'})}]),setTimeout((function(){n.database.closeDB()}),5e3)}))}))}}))}}},{key:"timeScale",get:function(){return this.config.timeScale||15},set:function(t){this.config.timeScale=t}},{key:"mode",get:function(){return this.config.mode||s.RANDOM},set:function(t){this.config.mode=t}}],[{key:"pluginName",get:function(){return"music"}},{key:"defaultConfig",get:function(){return{offline:!1,preloadNext:!0,abCycle:null,timeScale:15,mode:s.ORDER,list:[]}}},{key:"ModeType",get:function(){return Object.keys(s).map((function(t){return s[t]}))}}]),n}(a.ZP),h=n(16765),d=function(t){(0,i.XW)(n,t);var e=(0,i.WY)(n);function n(){return(0,i.PA)(this,n),e.apply(this,arguments)}return(0,i.qH)(n,[{key:"afterCreate",value:function(){var t=this;if(this.on("change",(function(e){if(e&&e.poster){if(t.find("img"))t.find("img").src=e.poster;else{var n=new Image;n.src=e.poster,t.appendChild(n)}t.find("img").src=e.poster,t.show()}else t.hide()})),this.playerConfig.poster){var e=new Image;e.src=this.playerConfig.poster,this.appendChild(e)}}},{key:"render",value:function(){return'<xg-icon class="xgplayer-cover"></xg-icon>'}}],[{key:"pluginName",get:function(){return"musiccover"}},{key:"defaultConfig",get:function(){return{index:6,position:h.ZP.POSITIONS.CONTROLS_LEFT}}}]),n}(h.ZP),p=function(t){(0,i.XW)(n,t);var e=(0,i.WY)(n);function n(){var t;(0,i.PA)(this,n);for(var r=arguments.length,o=new Array(r),a=0;a<r;a++)o[a]=arguments[a];return t=e.call.apply(e,[this].concat(o)),(0,i._x)((0,i.Lc)(t),"onClick",(function(e){var n=(0,i.Lc)(t).player;e.preventDefault(),e.stopPropagation(),n.plugins.music.backward()})),t}return(0,i.qH)(n,[{key:"afterCreate",value:function(){var t=this;this.initIcons();["click","touchstart"].forEach((function(e){t.bind(e,t.onClick)}))}},{key:"registerIcons",value:function(){return{musicBackward:{icon:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-2 0 21 15">\n      <path d="m 14,2.99996 0,10 -7,-5 7,-5 z m -7,5 0,5 -7,-5 7,-5 0,5 z m -7,0 0,0 z"></path>\n  </svg>',class:"xg-icon-mbackward"}}}},{key:"initIcons",value:function(){var t=this.icons;this.appendChild(".xgplayer-icon",t.musicBackward)}},{key:"destroy",value:function(){var t=this;["click","touchstart"].forEach((function(e){t.unbind(e,t.onClick)}))}},{key:"render",value:function(){return'<xg-icon class="xgplayer-backward">\n            <div class="xgplayer-icon">\n            </div>\n          </xg-icon>'}}],[{key:"pluginName",get:function(){return"musicbackword"}},{key:"defaultConfig",get:function(){return{index:1,position:h.ZP.POSITIONS.CONTROLS_LEFT}}}]),n}(h.ZP),y=function(t){(0,i.XW)(n,t);var e=(0,i.WY)(n);function n(){var t;(0,i.PA)(this,n);for(var r=arguments.length,o=new Array(r),a=0;a<r;a++)o[a]=arguments[a];return t=e.call.apply(e,[this].concat(o)),(0,i._x)((0,i.Lc)(t),"onClick",(function(e){var n=(0,i.Lc)(t).player;e.preventDefault(),e.stopPropagation(),n.plugins.music.prev()})),t}return(0,i.qH)(n,[{key:"afterCreate",value:function(){var t=this;this.initIcons();["click","touchstart"].forEach((function(e){t.bind(e,t.onClick)}))}},{key:"registerIcons",value:function(){return{musicPrev:{icon:' <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="300 200 1024 1024">\n        <path d="M600 1140v-768h128v352l320-320v704l-320-320v352zz"></path>\n    </svg>',class:"xg-icon-mprev"}}}},{key:"initIcons",value:function(){var t=this.icons;this.appendChild(".xgplayer-icon",t.musicPrev)}},{key:"destroy",value:function(){var t=this;["click","touchstart"].forEach((function(e){t.unbind(e,t.onClick)}))}},{key:"render",value:function(){return'<xg-icon class="xgplayer-next">\n            <div class="xgplayer-icon">\n            </div>\n          </xg-icon>'}}],[{key:"pluginName",get:function(){return"musicprev"}},{key:"defaultConfig",get:function(){return{index:2,position:h.ZP.POSITIONS.CONTROLS_LEFT}}}]),n}(h.ZP),v=function(t){(0,i.XW)(n,t);var e=(0,i.WY)(n);function n(){var t;(0,i.PA)(this,n);for(var r=arguments.length,o=new Array(r),a=0;a<r;a++)o[a]=arguments[a];return t=e.call.apply(e,[this].concat(o)),(0,i._x)((0,i.Lc)(t),"onClick",(function(e){var n=(0,i.Lc)(t).player;e.preventDefault(),e.stopPropagation(),n.plugins.music.forward()})),t}return(0,i.qH)(n,[{key:"afterCreate",value:function(){var t=this;this.initIcons();["click","touchstart"].forEach((function(e){t.bind(e,t.onClick)}))}},{key:"registerIcons",value:function(){return{musicForward:{icon:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-2 0 21 15">\n        <path d="m 2,2.99996 0,10 7,-5 -7,-5 z m 7,5 0,5 7,-5 -7,-5 0,5 z m 7,0 0,0 z"></path>\n      </svg>',class:"xg-icon-mforward"}}}},{key:"initIcons",value:function(){var t=this.icons;this.appendChild(".xgplayer-icon",t.musicForward)}},{key:"destroy",value:function(){var t=this;["click","touchstart"].forEach((function(e){t.unbind(e,t.onClick)}))}},{key:"render",value:function(){return'<xg-icon class="xgplayer-forward">\n            <div class="xgplayer-icon">\n            </div>\n          </xg-icon>'}}],[{key:"pluginName",get:function(){return"musicforward"}},{key:"defaultConfig",get:function(){return{index:5,position:h.ZP.POSITIONS.CONTROLS_LEFT}}}]),n}(h.ZP),g=function(t){(0,i.XW)(n,t);var e=(0,i.WY)(n);function n(){var t;(0,i.PA)(this,n);for(var r=arguments.length,o=new Array(r),a=0;a<r;a++)o[a]=arguments[a];return t=e.call.apply(e,[this].concat(o)),(0,i._x)((0,i.Lc)(t),"onClick",(function(e){var n=(0,i.Lc)(t).player;e.preventDefault(),e.stopPropagation(),n.plugins.music.next()})),t}return(0,i.qH)(n,[{key:"afterCreate",value:function(){var t=this;this.initIcons();["click","touchstart"].forEach((function(e){t.bind(e,t.onClick)}))}},{key:"registerIcons",value:function(){return{musicNext:{icon:' <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" viewBox="100 200 1024 1024">\n        <path d="M800 380v768h-128v-352l-320 320v-704l320 320v-352z">\n      </svg>',class:"xg-icon-mnext"}}}},{key:"initIcons",value:function(){var t=this.icons;this.appendChild(".xgplayer-icon",t.musicNext)}},{key:"destroy",value:function(){var t=this;["click","touchstart"].forEach((function(e){t.unbind(e,t.onClick)}))}},{key:"render",value:function(){return'<xg-icon class="xgplayer-next">\n            <div class="xgplayer-icon">\n            </div>\n          </xg-icon>'}}],[{key:"pluginName",get:function(){return"musicnext"}},{key:"defaultConfig",get:function(){return{index:4,position:h.ZP.POSITIONS.CONTROLS_LEFT}}}]),n}(h.ZP),m=function(t){(0,i.XW)(n,t);var e=(0,i.WY)(n);function n(){return(0,i.PA)(this,n),e.apply(this,arguments)}return(0,i.qH)(n,[{key:"beforeCreate",value:function(t){var e=t.player.plugins.progress;e&&(t.root=e.root)}},{key:"afterCreate",value:function(){var t=this;this.on("change",(function(e){e&&e.title?t.root.innerHTML="".concat(e.title):t.root.innerHTML=""}))}},{key:"render",value:function(){var t=this.playerConfig;return'<xg-title class="xgplayer-name">\n          '.concat(t.title||"","\n       </xg-title>")}}],[{key:"pluginName",get:function(){return"musicmeta"}},{key:"defaultConfig",get:function(){return{index:0}}}]),n}(h.ZP);var x=(0,i.qH)((function t(e,n){(0,i.PA)(this,t),console.log("config",e,n),console.log("playerConfig","Object"!==r.ZP.typeOf(n.controls)),function(t){if("Object"!==r.ZP.typeOf(t.controls))t.controls={mode:"flex",initShow:!0};else{var e=t.controls;t.controls=(0,i.Zj)({mode:"flex",initShow:!0},e)}var n=t.play||{};t.play=(0,i.Zj)({index:3},n),t.marginControls=!0,t.mediaType="audio"}(n),this.plugins=[f,p,y,v,g,d,m],this.ignores=["start","cssFullScreen","fullscreen","pip","enter","replay","pc","loading","poster"]}))}}]);