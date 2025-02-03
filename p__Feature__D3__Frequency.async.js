"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[9385],{7272:function(e,t,a){a.r(t),a.d(t,{default:function(){return f}});var r=a(57213),n=a.n(r),o=a(54306),l=a.n(o),s=a(2087),c=a(28450),i=a(93236),p=[{value:0,label:"0kHz"},{value:5e5,label:"500kHz"},{value:1e6,label:"1000kHz"},{value:1e8,label:"100MHz"},{value:2e8,label:"200MHz"},{value:3e8,label:"300MHz"},{value:4e8,label:"400MHz"},{value:5e8,label:"500MHz"},{value:6e8,label:"600MHz"},{value:7e8,label:"700MHz"},{value:8e8,label:"800MHz"},{value:9e8,label:"900MHz"},{value:1e9,label:"1000MHz"},{value:15e9,label:"15GHz"},{value:3e10,label:"30GHz"},{value:45e9,label:"45GHz"},{value:6e10,label:"60GHz"}],u=[{typeName:"无线设备1",ranges:[{frequencyName:"设备0",range:[0,14e7],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备A",range:[35e3,14e7],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备B",range:[9e7,14e7],color:"#4299e1",slashStyle:{forward:!1,backward:!0},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备B",range:[9e7,14e7],color:"#4299e1",slashStyle:{forward:!1,backward:!0},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备C",range:[1e6,5e8],color:"#4299e1",slashStyle:{forward:!1,backward:!0},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备d",range:[1e7,5e7],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备dd",range:[1e7,5e7],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备e",range:[1e7,5e8],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}}]},{typeName:"无线设备2",ranges:[{frequencyName:"设备c",range:[1e6,5e6],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备c",range:[1e6,5e8],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备c",range:[1e6,5e8],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备c",range:[1e6,5e8],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备c",range:[1e6,5e8],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备d",range:[1e5,5e5],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}}]},{typeName:"无线设备3",ranges:[{frequencyName:"设备1",range:[1e5,5e9],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备2",range:[1e7,5e9],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}}]},{typeName:"无线设备4",ranges:[{frequencyName:"设备1",range:[1e6,5e10],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备2",range:[1e7,5e8],color:"#4299e1",slashStyle:{forward:!0,backward:!1},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备3",range:[1e6,5e8],color:"#4299e1",slashStyle:{forward:!0,backward:!0},customInfo:{description:"测试设备",power:"10W",status:"正常"}},{frequencyName:"设备4",range:[1e6,6e8],color:"#4299e1",slashStyle:{forward:!1,backward:!0},customInfo:{description:"测试设备",power:"10W",status:"正常"}}]}],d=a(62086),f=function(){var e=(0,i.useRef)(null),t=(0,i.useRef)(null),a=function(e){return e>=1e9?"".concat((e/1e9).toFixed(0),"GHz"):e>=1e6?"".concat((e/1e6).toFixed(0),"MHz"):"".concat((e/1e3).toFixed(0),"kHz")};return(0,i.useEffect)((function(){if(e.current&&null!=u&&u.length){c.Ys(e.current).selectAll("*").remove();var r=50,o=0,s=50,i=0,d=Math.max(t.current.clientWidth-i-o,800),f=u.map((function(e){return t=e.ranges,a=new Map,t.forEach((function(e){for(var t=0,r=!1;!r;)(a.get(t)||[]).some((function(t){var a=l()(e.range,2),r=a[0],n=a[1],o=l()(t.range,2),s=o[0],c=o[1];return!(n<s||r>c)}))?t++:(a.has(t)||a.set(t,[]),a.get(t).push(e),e.level=t,r=!0)})),30+35*a.size+20;var t,a})),y=f.reduce((function(e,t){return e+t}),0)+r+s,g=c.Ys(e.current).attr("width",d+i+o).attr("height",y+r+s).append("g").attr("transform","translate(".concat(i,",").concat(r,")")),v=g.append("g").attr("class","background-layer");v.append("rect").attr("width",d+i+o).attr("height",y).attr("fill","none").style("pointer-events","all");var m=g.append("g").attr("class","guidelines"),h=g.append("g").attr("transform","translate(".concat(i,",").concat(r,")")),b=g.append("g").attr("class","frequency-markers").style("pointer-events","none"),w=c.q2y().domain(p.map((function(e){return e.label}))).range([0,d]).padding(.5),x=new Map(p.map((function(e){return[e.label,e.value]}))),k=(new Map(p.map((function(e){return[e.value,e.label]}))),c.Ys(t.current).append("div").attr("class","frequency-tooltip").style("position","absolute").style("visibility","hidden").style("background-color","white").style("border","1px solid #ddd").style("border-radius","4px").style("padding","12px").style("box-shadow","0 2px 4px rgba(0,0,0,0.1)").style("z-index","9999").style("max-width","300px").style("font-size","12px").style("max-height","500px").style("overflow-y","auto")),N=c.Ys(e.current.parentNode).append("div").attr("class","hover-tooltip").style("position","absolute").style("visibility","hidden").style("background-color","white").style("border","1px solid #ddd").style("padding","8px 12px").style("border-radius","4px").style("font-size","12px").style("pointer-events","none").style("z-index","1000");v.on("mousemove",(function(e){for(var t=c.cx$(e),o=l()(t,1)[0],s=p[0],i=p[1],d=0;d<p.length-1;d++){var f=w(p[d].label),g=w(p[d+1].label);if(o>=f&&o<=g){s=p[d],i=p[d+1];break}}var v=w(s.label),h=(o-v)/(w(i.label)-v),b=Math.exp(Math.log(s.value)*(1-h)+Math.log(i.value)*h),x=u.flatMap((function(e){return e.ranges.filter((function(e){return b>=e.range[0]&&b<=e.range[1]})).map((function(t){return n()({typeName:e.typeName},t)}))}));m.selectAll("*").remove(),m.append("line").attr("x1",o).attr("y1",0).attr("x2",o).attr("y2",y-r).attr("stroke","#666").attr("stroke-width",1).attr("stroke-dasharray","4,4");var N='\n        <div>\n          <div style="font-weight: bold; margin-bottom: 8px;">\n            当前频率: '.concat(a(b),"\n          </div>\n          ").concat(x.length>0?x.map((function(e){return'\n              <div style="margin-bottom: 8px;">\n                <div style="color: '.concat(e.color,'; font-weight: bold;">\n                  ').concat(e.typeName," - ").concat(e.frequencyName,"\n                </div>\n                <div>\n                  频率范围: ").concat(a(e.range[0])," - ").concat(a(e.range[1]),'\n                </div>\n                <pre style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin: 4px 0 0 0;">\n                  ').concat(JSON.stringify(e.customInfo,null,2),"\n                </pre>\n              </div>\n            ")})).join('<hr style="margin: 8px 0;">'):'<div style="color: #666;">当前频率范围内无匹配项</div>',"\n        </div>\n      ");k.style("visibility","visible").style("left","".concat(e.pageX-240,"px")).style("top","".concat(e.pageY-70,"px")).html(N)})),v.on("mouseleave",(function(){m.selectAll("*").remove(),k.style("visibility","hidden")})),v.on("click",(function(e){for(var t=c.cx$(e),r=l()(t,1)[0],o=p[0],s=p[1],i=0;i<p.length-1;i++){var d=w(p[i].label),f=w(p[i+1].label);if(r>=d&&r<=f){o=p[i],s=p[i+1];break}}var y=w(o.label),g=(r-y)/(w(s.label)-y),v=Math.exp(Math.log(o.value)*(1-g)+Math.log(s.value)*g),m=u.flatMap((function(e){return e.ranges.filter((function(e){return v>=e.range[0]&&v<=e.range[1]})).map((function(t){return n()({typeName:e.typeName},t)}))})),h='\n        <div>\n          <div style="font-weight: bold; margin-bottom: 8px;">\n            当前频率: '.concat(a(v),"\n          </div>\n          ").concat(m.length>0?"\n              <div>已经获取到数据: matches;</div>\n            ":'\n              <div style="color: #666;">当前频率范围内无匹配项</div>\n            ',"\n        </div>\n      ");k.style("visibility","visible").style("left","".concat(e.pageX-240,"px")).style("top","".concat(e.pageY-70,"px")).html(h)}));var M=function(e){var t="top"===e?c.F5q(w):c.LLu(w),o="top"===e?0:y-r;g.append("g").attr("class","".concat(e,"-axis")).attr("transform","translate(0,".concat(o,")")).call(t).selectAll(".tick").style("cursor","pointer").each((function(e){this.addEventListener("mousemove",(function(t){var o;t.stopPropagation(),m.selectAll("*").remove();var l=w(e);m.append("line").attr("class","guideline").attr("x1",l).attr("y1",0).attr("x2",l).attr("y2",y-r).attr("stroke","#666").attr("stroke-width",1).attr("stroke-dasharray","4,4").style("pointer-events","none");var s=null===(o=p.find((function(t){return t.label===e})))||void 0===o?void 0:o.value;if(s){var c=[];u.forEach((function(e){e.ranges.forEach((function(t){s>=t.range[0]&&s<=t.range[1]&&c.push(n()({typeName:e.typeName},t))}))})),c.length>0&&k.style("visibility","visible").style("left","".concat(t.pageX-240,"px")).style("top","".concat(t.pageY-60,"px")).html('\n                    <div>\n                      <div style="font-weight: bold; margin-bottom: 8px;">\n                        频率: '.concat(e,"\n                      </div>\n                      ").concat(c.map((function(e){return'\n                        <div style="margin-bottom: 8px;">\n                          <div style="color: '.concat(e.color,';">\n                            ').concat(e.typeName," - ").concat(e.frequencyName,"\n                          </div>\n                          <div>\n                            范围: ").concat(a(e.range[0])," - ").concat(a(e.range[1]),'\n                          </div>\n                          <pre style="background: #f5f5f5; padding: 8px; margin-top: 4px; border-radius: 4px;">\n                            ').concat(JSON.stringify(e.customInfo,null,2),"\n                                    </pre>\n                                  </div>\n                                ")})).join('<hr style="margin: 8px 0;">'),"\n                              </div>\n                            "))}}))})).on("click",(function(e,t){var r=function(e){var t=[];return u.forEach((function(a){a.ranges.forEach((function(r){e>=r.range[0]&&e<=r.range[1]&&t.push(n()({typeName:a.typeName},r))}))})),t}(x.get(t));if(console.log(r,"matches"),r.length>0){var o=r.map((function(e){return'\n              <div style="margin-bottom: 8px;">\n                <div style="font-weight: bold; margin-bottom: 4px;">\n                  '.concat(e.typeName," - ").concat(e.frequencyName,'\n                </div>\n                <div style="margin-bottom: 4px;">\n                  频率范围: ').concat(a(e.range[0])," - ").concat(a(e.range[1]),'\n                </div>\n                <pre style="background: #f5f5f5; padding: 8px; margin-top: 4px; border-radius: 4px; white-space: pre-wrap;">\n                  ').concat(JSON.stringify(e.customInfo,null,2),"\n                </pre>\n              </div>\n            ")})).join('<hr style="margin: 8px 0;">');k.style("visibility","visible").style("left","".concat(e.pageX+10,"px")).style("top","".concat(e.pageY+10,"px")).html(o)}})).on("mouseout",(function(){}))};M("top"),M("bottom");var q=0;return u.forEach((function(e,t){var r=f[t],n=h.append("g").attr("class","type-group").attr("transform","translate(0,".concat(q,")"));n.append("rect").attr("x",0).attr("y",0).attr("width",d).attr("height",r-20).attr("fill","none").attr("stroke","#e5e7eb").attr("rx",4),n.append("text").attr("x",10).attr("y",20).text(e.typeName).style("font-weight","bold");var o=new Map;e.ranges.forEach((function(e){for(var t=0;;){if(!(o.get(t)||[]).some((function(t){return!(e.range[1]<t.range[0]||e.range[0]>t.range[1])}))){o.has(t)||o.set(t,[]),o.get(t).push(e),e.level=t;break}t++}}));var l=function(e){if(e<=p[0].value)return w(p[0].label);if(e>=p[p.length-1].value)return w(p[p.length-1].label);for(var t,r,n=0;n<p.length-1;n++)if(e>=p[n].value&&e<=p[n+1].value){t=p[n],r=p[n+1];break}if(!t||!r)return console.warn("无法为频率值找到合适的区间:",a(e)),null;var o=w(t.label),l=w(r.label),s=Math.log10(e),c=Math.log10(t.value);return o+(l-o)*((s-c)/(Math.log10(r.value)-c))},i=[1e6,14e7];if(i.length>0){var u=l(i[0]),v=l(i[1]);null!==u&&null!==v&&b.append("rect").attr("x",u).attr("y",0).attr("width",v-u).attr("height",y-s).attr("fill","green").attr("opacity",.1).style("pointer-events","none")}e.ranges.forEach((function(r,o){var s,i,p=l(r.range[0]),u=l(r.range[1]),d=35+30*r.level,f=n.append("g").attr("class","frequency-block").attr("transform","translate(0,".concat(d,")")),y=f.append("rect").attr("x",p).attr("y",0).attr("width",Math.max(u-p,2)).attr("height",25).attr("fill",r.color).attr("rx",3).style("cursor","pointer").attr("opacity",.7).style("pointer-events","all");if(y.on("mouseover",(function(t){t.stopPropagation(),c.Ys(this).attr("opacity",.9).attr("stroke","#000").attr("stroke-width",1),k.style("visibility","hidden"),m.selectAll("*").remove(),N.style("visibility","visible").style("left","".concat(t.pageX-240,"px")).style("top","".concat(t.pageY-60,"px")).html('\n              <div>\n                <div style="font-weight: bold; margin-bottom: 4px;">\n                  '.concat(e.typeName," - ").concat(r.frequencyName,'\n                </div>\n                <div style="margin-bottom: 4px;">\n                  频率范围: ').concat(a(r.range[0])," - ").concat(a(r.range[1]),'\n                </div>\n                <pre style="background: #f5f5f5; padding: 8px; margin-top: 4px; border-radius: 4px;">\n                  ').concat(JSON.stringify(r.customInfo,null,2),"\n                </pre>\n              </div>\n            "))})),y.on("mouseout",(function(){console.log("mouseout"),c.Ys(this).attr("opacity",.7).attr("stroke","none"),N.style("visibility","hidden")})),null!==(s=r.slashStyle)&&void 0!==s&&s.forward||null!==(i=r.slashStyle)&&void 0!==i&&i.backward){var v="pattern-".concat(t,"-").concat(o),h=g.append("defs").append("pattern").attr("id",v).attr("patternUnits","userSpaceOnUse").attr("width",10).attr("height",10);r.slashStyle.forward&&h.append("path").attr("d","M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2").attr("stroke","black").attr("stroke-width",1).attr("opacity",.3),r.slashStyle.backward&&h.append("path").attr("d","M-1,-1 l2,2 M0,0 l10,10 M9,9 l2,2").attr("stroke","black").attr("stroke-width",1).attr("opacity",.3),f.append("rect").attr("x",p).attr("y",0).attr("width",Math.max(u-p,2)).attr("height",25).attr("fill","url(#".concat(v,")")).attr("rx",3).style("pointer-events","none")}})),q+=r})),function(){k.remove()}}}),[]),(0,d.jsx)(d.Fragment,{children:(0,d.jsx)(s.Z,{children:(0,d.jsx)("div",{ref:t,className:"w-full overflow-x-auto",children:(0,d.jsx)("svg",{ref:e,className:"min-w-full"})})})})}}}]);