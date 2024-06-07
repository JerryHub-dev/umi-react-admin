"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[745],{9299:function(t,e,i){i.r(e),i.d(e,{default:function(){return m}});var n=i(27808),s=i(37863),o=i(95500);class r{constructor(t,e,i,n){if(isNaN(t)||isNaN(e))throw new Error(`Point is invalid: (${t}, ${e})`);this.x=+t,this.y=+e,this.pressure=i||0,this.time=n||Date.now()}distanceTo(t){return Math.sqrt(Math.pow(this.x-t.x,2)+Math.pow(this.y-t.y,2))}equals(t){return this.x===t.x&&this.y===t.y&&this.pressure===t.pressure&&this.time===t.time}velocityFrom(t){return this.time!==t.time?this.distanceTo(t)/(this.time-t.time):0}}class a{constructor(t,e,i,n,s,o){this.startPoint=t,this.control2=e,this.control1=i,this.endPoint=n,this.startWidth=s,this.endWidth=o}static fromPoints(t,e){const i=this.calculateControlPoints(t[0],t[1],t[2]).c2,n=this.calculateControlPoints(t[1],t[2],t[3]).c1;return new a(t[1],i,n,t[2],e.start,e.end)}static calculateControlPoints(t,e,i){const n=t.x-e.x,s=t.y-e.y,o=e.x-i.x,a=e.y-i.y,h=(t.x+e.x)/2,c=(t.y+e.y)/2,d=(e.x+i.x)/2,l=(e.y+i.y)/2,u=Math.sqrt(n*n+s*s),v=Math.sqrt(o*o+a*a),p=v/(u+v),m=d+(h-d)*p,_=l+(c-l)*p,g=e.x-m,w=e.y-_;return{c1:new r(h+g,c+w),c2:new r(d+g,l+w)}}length(){let t,e,i=0;for(let n=0;n<=10;n+=1){const s=n/10,o=this.point(s,this.startPoint.x,this.control1.x,this.control2.x,this.endPoint.x),r=this.point(s,this.startPoint.y,this.control1.y,this.control2.y,this.endPoint.y);if(n>0){const n=o-t,s=r-e;i+=Math.sqrt(n*n+s*s)}t=o,e=r}return i}point(t,e,i,n,s){return e*(1-t)*(1-t)*(1-t)+3*i*(1-t)*(1-t)*t+3*n*(1-t)*t*t+s*t*t*t}}class h{constructor(){try{this._et=new EventTarget}catch(t){this._et=document}}addEventListener(t,e,i){this._et.addEventListener(t,e,i)}dispatchEvent(t){return this._et.dispatchEvent(t)}removeEventListener(t,e,i){this._et.removeEventListener(t,e,i)}}class c extends h{constructor(t,e={}){super(),this.canvas=t,this._drawningStroke=!1,this._isEmpty=!0,this._lastPoints=[],this._data=[],this._lastVelocity=0,this._lastWidth=0,this._handleMouseDown=t=>{1===t.buttons&&(this._drawningStroke=!0,this._strokeBegin(t))},this._handleMouseMove=t=>{this._drawningStroke&&this._strokeMoveUpdate(t)},this._handleMouseUp=t=>{1===t.buttons&&this._drawningStroke&&(this._drawningStroke=!1,this._strokeEnd(t))},this._handleTouchStart=t=>{if(t.cancelable&&t.preventDefault(),1===t.targetTouches.length){const e=t.changedTouches[0];this._strokeBegin(e)}},this._handleTouchMove=t=>{t.cancelable&&t.preventDefault();const e=t.targetTouches[0];this._strokeMoveUpdate(e)},this._handleTouchEnd=t=>{if(t.target===this.canvas){t.cancelable&&t.preventDefault();const e=t.changedTouches[0];this._strokeEnd(e)}},this._handlePointerStart=t=>{this._drawningStroke=!0,t.preventDefault(),this._strokeBegin(t)},this._handlePointerMove=t=>{this._drawningStroke&&(t.preventDefault(),this._strokeMoveUpdate(t))},this._handlePointerEnd=t=>{this._drawningStroke&&(t.preventDefault(),this._drawningStroke=!1,this._strokeEnd(t))},this.velocityFilterWeight=e.velocityFilterWeight||.7,this.minWidth=e.minWidth||.5,this.maxWidth=e.maxWidth||2.5,this.throttle="throttle"in e?e.throttle:16,this.minDistance="minDistance"in e?e.minDistance:5,this.dotSize=e.dotSize||0,this.penColor=e.penColor||"black",this.backgroundColor=e.backgroundColor||"rgba(0,0,0,0)",this.compositeOperation=e.compositeOperation||"source-over",this._strokeMoveUpdate=this.throttle?function(t,e=250){let i,n,s,o=0,r=null;const a=()=>{o=Date.now(),r=null,i=t.apply(n,s),r||(n=null,s=[])};return function(...h){const c=Date.now(),d=e-(c-o);return n=this,s=h,d<=0||d>e?(r&&(clearTimeout(r),r=null),o=c,i=t.apply(n,s),r||(n=null,s=[])):r||(r=window.setTimeout(a,d)),i}}(c.prototype._strokeUpdate,this.throttle):c.prototype._strokeUpdate,this._ctx=t.getContext("2d"),this.clear(),this.on()}clear(){const{_ctx:t,canvas:e}=this;t.fillStyle=this.backgroundColor,t.clearRect(0,0,e.width,e.height),t.fillRect(0,0,e.width,e.height),this._data=[],this._reset(this._getPointGroupOptions()),this._isEmpty=!0}fromDataURL(t,e={}){return new Promise(((i,n)=>{const s=new Image,o=e.ratio||window.devicePixelRatio||1,r=e.width||this.canvas.width/o,a=e.height||this.canvas.height/o,h=e.xOffset||0,c=e.yOffset||0;this._reset(this._getPointGroupOptions()),s.onload=()=>{this._ctx.drawImage(s,h,c,r,a),i()},s.onerror=t=>{n(t)},s.crossOrigin="anonymous",s.src=t,this._isEmpty=!1}))}toDataURL(t="image/png",e){return"image/svg+xml"===t?("object"!=typeof e&&(e=void 0),`data:image/svg+xml;base64,${btoa(this.toSVG(e))}`):("number"!=typeof e&&(e=void 0),this.canvas.toDataURL(t,e))}on(){this.canvas.style.touchAction="none",this.canvas.style.msTouchAction="none",this.canvas.style.userSelect="none";const t=/Macintosh/.test(navigator.userAgent)&&"ontouchstart"in document;window.PointerEvent&&!t?this._handlePointerEvents():(this._handleMouseEvents(),"ontouchstart"in window&&this._handleTouchEvents())}off(){this.canvas.style.touchAction="auto",this.canvas.style.msTouchAction="auto",this.canvas.style.userSelect="auto",this.canvas.removeEventListener("pointerdown",this._handlePointerStart),this.canvas.removeEventListener("pointermove",this._handlePointerMove),this.canvas.ownerDocument.removeEventListener("pointerup",this._handlePointerEnd),this.canvas.removeEventListener("mousedown",this._handleMouseDown),this.canvas.removeEventListener("mousemove",this._handleMouseMove),this.canvas.ownerDocument.removeEventListener("mouseup",this._handleMouseUp),this.canvas.removeEventListener("touchstart",this._handleTouchStart),this.canvas.removeEventListener("touchmove",this._handleTouchMove),this.canvas.removeEventListener("touchend",this._handleTouchEnd)}isEmpty(){return this._isEmpty}fromData(t,{clear:e=!0}={}){e&&this.clear(),this._fromData(t,this._drawCurve.bind(this),this._drawDot.bind(this)),this._data=this._data.concat(t)}toData(){return this._data}_getPointGroupOptions(t){return{penColor:t&&"penColor"in t?t.penColor:this.penColor,dotSize:t&&"dotSize"in t?t.dotSize:this.dotSize,minWidth:t&&"minWidth"in t?t.minWidth:this.minWidth,maxWidth:t&&"maxWidth"in t?t.maxWidth:this.maxWidth,velocityFilterWeight:t&&"velocityFilterWeight"in t?t.velocityFilterWeight:this.velocityFilterWeight,compositeOperation:t&&"compositeOperation"in t?t.compositeOperation:this.compositeOperation}}_strokeBegin(t){this.dispatchEvent(new CustomEvent("beginStroke",{detail:t}));const e=this._getPointGroupOptions(),i=Object.assign(Object.assign({},e),{points:[]});this._data.push(i),this._reset(e),this._strokeUpdate(t)}_strokeUpdate(t){if(0===this._data.length)return void this._strokeBegin(t);this.dispatchEvent(new CustomEvent("beforeUpdateStroke",{detail:t}));const e=t.clientX,i=t.clientY,n=void 0!==t.pressure?t.pressure:void 0!==t.force?t.force:0,s=this._createPoint(e,i,n),o=this._data[this._data.length-1],r=o.points,a=r.length>0&&r[r.length-1],h=!!a&&s.distanceTo(a)<=this.minDistance,c=this._getPointGroupOptions(o);if(!a||!a||!h){const t=this._addPoint(s,c);a?t&&this._drawCurve(t,c):this._drawDot(s,c),r.push({time:s.time,x:s.x,y:s.y,pressure:s.pressure})}this.dispatchEvent(new CustomEvent("afterUpdateStroke",{detail:t}))}_strokeEnd(t){this._strokeUpdate(t),this.dispatchEvent(new CustomEvent("endStroke",{detail:t}))}_handlePointerEvents(){this._drawningStroke=!1,this.canvas.addEventListener("pointerdown",this._handlePointerStart),this.canvas.addEventListener("pointermove",this._handlePointerMove),this.canvas.ownerDocument.addEventListener("pointerup",this._handlePointerEnd)}_handleMouseEvents(){this._drawningStroke=!1,this.canvas.addEventListener("mousedown",this._handleMouseDown),this.canvas.addEventListener("mousemove",this._handleMouseMove),this.canvas.ownerDocument.addEventListener("mouseup",this._handleMouseUp)}_handleTouchEvents(){this.canvas.addEventListener("touchstart",this._handleTouchStart),this.canvas.addEventListener("touchmove",this._handleTouchMove),this.canvas.addEventListener("touchend",this._handleTouchEnd)}_reset(t){this._lastPoints=[],this._lastVelocity=0,this._lastWidth=(t.minWidth+t.maxWidth)/2,this._ctx.fillStyle=t.penColor,this._ctx.globalCompositeOperation=t.compositeOperation}_createPoint(t,e,i){const n=this.canvas.getBoundingClientRect();return new r(t-n.left,e-n.top,i,(new Date).getTime())}_addPoint(t,e){const{_lastPoints:i}=this;if(i.push(t),i.length>2){3===i.length&&i.unshift(i[0]);const t=this._calculateCurveWidths(i[1],i[2],e),n=a.fromPoints(i,t);return i.shift(),n}return null}_calculateCurveWidths(t,e,i){const n=i.velocityFilterWeight*e.velocityFrom(t)+(1-i.velocityFilterWeight)*this._lastVelocity,s=this._strokeWidth(n,i),o={end:s,start:this._lastWidth};return this._lastVelocity=n,this._lastWidth=s,o}_strokeWidth(t,e){return Math.max(e.maxWidth/(t+1),e.minWidth)}_drawCurveSegment(t,e,i){const n=this._ctx;n.moveTo(t,e),n.arc(t,e,i,0,2*Math.PI,!1),this._isEmpty=!1}_drawCurve(t,e){const i=this._ctx,n=t.endWidth-t.startWidth,s=2*Math.ceil(t.length());i.beginPath(),i.fillStyle=e.penColor;for(let i=0;i<s;i+=1){const o=i/s,r=o*o,a=r*o,h=1-o,c=h*h,d=c*h;let l=d*t.startPoint.x;l+=3*c*o*t.control1.x,l+=3*h*r*t.control2.x,l+=a*t.endPoint.x;let u=d*t.startPoint.y;u+=3*c*o*t.control1.y,u+=3*h*r*t.control2.y,u+=a*t.endPoint.y;const v=Math.min(t.startWidth+a*n,e.maxWidth);this._drawCurveSegment(l,u,v)}i.closePath(),i.fill()}_drawDot(t,e){const i=this._ctx,n=e.dotSize>0?e.dotSize:(e.minWidth+e.maxWidth)/2;i.beginPath(),this._drawCurveSegment(t.x,t.y,n),i.closePath(),i.fillStyle=e.penColor,i.fill()}_fromData(t,e,i){for(const n of t){const{points:t}=n,s=this._getPointGroupOptions(n);if(t.length>1)for(let i=0;i<t.length;i+=1){const n=t[i],o=new r(n.x,n.y,n.pressure,n.time);0===i&&this._reset(s);const a=this._addPoint(o,s);a&&e(a,s)}else this._reset(s),i(t[0],s)}}toSVG({includeBackgroundColor:t=!1}={}){const e=this._data,i=Math.max(window.devicePixelRatio||1,1),n=this.canvas.width/i,s=this.canvas.height/i,o=document.createElementNS("http://www.w3.org/2000/svg","svg");if(o.setAttribute("xmlns","http://www.w3.org/2000/svg"),o.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink"),o.setAttribute("viewBox",`0 0 ${n} ${s}`),o.setAttribute("width",n.toString()),o.setAttribute("height",s.toString()),t&&this.backgroundColor){const t=document.createElement("rect");t.setAttribute("width","100%"),t.setAttribute("height","100%"),t.setAttribute("fill",this.backgroundColor),o.appendChild(t)}return this._fromData(e,((t,{penColor:e})=>{const i=document.createElement("path");if(!(isNaN(t.control1.x)||isNaN(t.control1.y)||isNaN(t.control2.x)||isNaN(t.control2.y))){const n=`M ${t.startPoint.x.toFixed(3)},${t.startPoint.y.toFixed(3)} C ${t.control1.x.toFixed(3)},${t.control1.y.toFixed(3)} ${t.control2.x.toFixed(3)},${t.control2.y.toFixed(3)} ${t.endPoint.x.toFixed(3)},${t.endPoint.y.toFixed(3)}`;i.setAttribute("d",n),i.setAttribute("stroke-width",(2.25*t.endWidth).toFixed(3)),i.setAttribute("stroke",e),i.setAttribute("fill","none"),i.setAttribute("stroke-linecap","round"),o.appendChild(i)}}),((t,{penColor:e,dotSize:i,minWidth:n,maxWidth:s})=>{const r=document.createElement("circle"),a=i>0?i:(n+s)/2;r.setAttribute("r",a.toString()),r.setAttribute("cx",t.x.toString()),r.setAttribute("cy",t.y.toString()),r.setAttribute("fill",e),o.appendChild(r)})),o.outerHTML}}var d,l=i(92935),u=i.n(l),v=i(25677).ZP.div(d||(d=u()(["\n  .wrapper {\n    position: relative;\n    width: 600px;\n    height: 300px;\n    -moz-user-select: none;\n    -webkit-user-select: none;\n    -ms-user-select: none;\n    user-select: none;\n  }\n\n  .signature-pad {\n    position: absolute;\n    left: 0;\n    top: 0;\n    width: 600px;\n    height: 300px;\n    background-color: white;\n    border: 1px solid #e8e8e8;\n    border-radius: 8px;\n  }\n"]))),p=i(62086);function m(){return(0,s.Z)((function(){var t=document.getElementById("signature-pad");function e(){var e=Math.max(window.devicePixelRatio||1,1);t.width=t.offsetWidth*e,t.height=t.offsetHeight*e,t.getContext("2d").scale(e,e)}window.onresize=e,e();var i=new c(t,{backgroundColor:"rgb(255, 255, 255)"});document.getElementById("save-png").addEventListener("click",(function(){if(i.isEmpty())return alert("请先提供签名.");var t=i.toDataURL("image/png");console.log(t),window.open(t)})),document.getElementById("save-jpeg").addEventListener("click",(function(){if(i.isEmpty())return alert("请先提供签名.");var t=i.toDataURL("image/jpeg");console.log(t),window.open(t)})),document.getElementById("save-svg").addEventListener("click",(function(){if(i.isEmpty())return alert("请先提供签名.");var t=i.toDataURL("image/svg+xml");console.log(t),console.log(atob(t.split(",")[1])),window.open(t)})),document.getElementById("clear").addEventListener("click",(function(){i.clear()})),document.getElementById("draw").addEventListener("click",(function(){i.compositeOperation="source-over"})),document.getElementById("erase").addEventListener("click",(function(){i.compositeOperation="destination-out"})),document.getElementById("undo").addEventListener("click",(function(){var t=i.toData();t&&(t.pop(),i.fromData(t))}))})),(0,p.jsx)(v,{children:(0,p.jsxs)(n.Z,{className:"shadow-2xl h-full",children:[(0,p.jsx)("div",{className:"wrapper",children:(0,p.jsx)("canvas",{id:"signature-pad",className:"signature-pad"})}),(0,p.jsxs)("div",{className:"mt-8 flex justify-between mb-28",children:[(0,p.jsx)(o.ZP,{id:"save-png",children:"保存为 PNG"}),(0,p.jsx)(o.ZP,{id:"save-jpeg",children:"保存为 JPEG"}),(0,p.jsx)(o.ZP,{id:"save-svg",children:"保存为 SVG"}),(0,p.jsx)(o.ZP,{id:"draw",children:"画"}),(0,p.jsx)(o.ZP,{id:"erase",children:"擦除"}),(0,p.jsx)(o.ZP,{id:"undo",children:"撤销"}),(0,p.jsx)(o.ZP,{id:"clear",children:"清除"})]})]})})}},37863:function(t,e,i){i.d(e,{Z:function(){return s}});var n=i(93236),s=function(t){(0,n.useEffect)((function(){null==t||t()}),[])}}}]);