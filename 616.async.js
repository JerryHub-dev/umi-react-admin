(self.webpackChunk=self.webpackChunk||[]).push([[616],{30047:function(e,t,a){"use strict";a.d(t,{Z:function(){return _}});var n=a(93236),i=a(82187),s=a.n(i),r=a(21720),l=a(97099);var o=e=>{const{prefixCls:t,className:a,style:i,size:r,shape:l}=e,o=s()({[`${t}-lg`]:"large"===r,[`${t}-sm`]:"small"===r}),c=s()({[`${t}-circle`]:"circle"===l,[`${t}-square`]:"square"===l,[`${t}-round`]:"round"===l}),g=n.useMemo((()=>"number"==typeof r?{width:r,height:r,lineHeight:`${r}px`}:{}),[r]);return n.createElement("span",{className:s()(t,o,c,a),style:Object.assign(Object.assign({},g),i)})},c=a(35521),g=a(66537),d=a(75285);const u=new c.E4("ant-skeleton-loading",{"0%":{backgroundPosition:"100% 50%"},"100%":{backgroundPosition:"0 50%"}}),m=e=>({height:e,lineHeight:(0,c.bf)(e)}),b=e=>Object.assign({width:e},m(e)),h=e=>({background:e.skeletonLoadingBackground,backgroundSize:"400% 100%",animationName:u,animationDuration:e.skeletonLoadingMotionDuration,animationTimingFunction:"ease",animationIterationCount:"infinite"}),$=(e,t)=>Object.assign({width:t(e).mul(5).equal(),minWidth:t(e).mul(5).equal()},m(e)),p=e=>{const{skeletonAvatarCls:t,gradientFromColor:a,controlHeight:n,controlHeightLG:i,controlHeightSM:s}=e;return{[`${t}`]:Object.assign({display:"inline-block",verticalAlign:"top",background:a},b(n)),[`${t}${t}-circle`]:{borderRadius:"50%"},[`${t}${t}-lg`]:Object.assign({},b(i)),[`${t}${t}-sm`]:Object.assign({},b(s))}},f=e=>{const{controlHeight:t,borderRadiusSM:a,skeletonInputCls:n,controlHeightLG:i,controlHeightSM:s,gradientFromColor:r,calc:l}=e;return{[`${n}`]:Object.assign({display:"inline-block",verticalAlign:"top",background:r,borderRadius:a},$(t,l)),[`${n}-lg`]:Object.assign({},$(i,l)),[`${n}-sm`]:Object.assign({},$(s,l))}},v=e=>Object.assign({width:e},m(e)),C=e=>{const{skeletonImageCls:t,imageSizeBase:a,gradientFromColor:n,borderRadiusSM:i,calc:s}=e;return{[`${t}`]:Object.assign(Object.assign({display:"flex",alignItems:"center",justifyContent:"center",verticalAlign:"top",background:n,borderRadius:i},v(s(a).mul(2).equal())),{[`${t}-path`]:{fill:"#bfbfbf"},[`${t}-svg`]:Object.assign(Object.assign({},v(a)),{maxWidth:s(a).mul(4).equal(),maxHeight:s(a).mul(4).equal()}),[`${t}-svg${t}-svg-circle`]:{borderRadius:"50%"}}),[`${t}${t}-circle`]:{borderRadius:"50%"}}},k=(e,t,a)=>{const{skeletonButtonCls:n}=e;return{[`${a}${n}-circle`]:{width:t,minWidth:t,borderRadius:"50%"},[`${a}${n}-round`]:{borderRadius:t}}},j=(e,t)=>Object.assign({width:t(e).mul(2).equal(),minWidth:t(e).mul(2).equal()},m(e)),O=e=>{const{borderRadiusSM:t,skeletonButtonCls:a,controlHeight:n,controlHeightLG:i,controlHeightSM:s,gradientFromColor:r,calc:l}=e;return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({[`${a}`]:Object.assign({display:"inline-block",verticalAlign:"top",background:r,borderRadius:t,width:l(n).mul(2).equal(),minWidth:l(n).mul(2).equal()},j(n,l))},k(e,n,a)),{[`${a}-lg`]:Object.assign({},j(i,l))}),k(e,i,`${a}-lg`)),{[`${a}-sm`]:Object.assign({},j(s,l))}),k(e,s,`${a}-sm`))},w=e=>{const{componentCls:t,skeletonAvatarCls:a,skeletonTitleCls:n,skeletonParagraphCls:i,skeletonButtonCls:s,skeletonInputCls:r,skeletonImageCls:l,controlHeight:o,controlHeightLG:c,controlHeightSM:g,gradientFromColor:d,padding:u,marginSM:m,borderRadius:$,titleHeight:v,blockRadius:k,paragraphLiHeight:j,controlHeightXS:w,paragraphMarginTop:x}=e;return{[`${t}`]:{display:"table",width:"100%",[`${t}-header`]:{display:"table-cell",paddingInlineEnd:u,verticalAlign:"top",[`${a}`]:Object.assign({display:"inline-block",verticalAlign:"top",background:d},b(o)),[`${a}-circle`]:{borderRadius:"50%"},[`${a}-lg`]:Object.assign({},b(c)),[`${a}-sm`]:Object.assign({},b(g))},[`${t}-content`]:{display:"table-cell",width:"100%",verticalAlign:"top",[`${n}`]:{width:"100%",height:v,background:d,borderRadius:k,[`+ ${i}`]:{marginBlockStart:g}},[`${i}`]:{padding:0,"> li":{width:"100%",height:j,listStyle:"none",background:d,borderRadius:k,"+ li":{marginBlockStart:w}}},[`${i}> li:last-child:not(:first-child):not(:nth-child(2))`]:{width:"61%"}},[`&-round ${t}-content`]:{[`${n}, ${i} > li`]:{borderRadius:$}}},[`${t}-with-avatar ${t}-content`]:{[`${n}`]:{marginBlockStart:m,[`+ ${i}`]:{marginBlockStart:x}}},[`${t}${t}-element`]:Object.assign(Object.assign(Object.assign(Object.assign({display:"inline-block",width:"auto"},O(e)),p(e)),f(e)),C(e)),[`${t}${t}-block`]:{width:"100%",[`${s}`]:{width:"100%"},[`${r}`]:{width:"100%"}},[`${t}${t}-active`]:{[`\n        ${n},\n        ${i} > li,\n        ${a},\n        ${s},\n        ${r},\n        ${l}\n      `]:Object.assign({},h(e))}}};var x=(0,g.I$)("Skeleton",(e=>{const{componentCls:t,calc:a}=e,n=(0,d.TS)(e,{skeletonAvatarCls:`${t}-avatar`,skeletonTitleCls:`${t}-title`,skeletonParagraphCls:`${t}-paragraph`,skeletonButtonCls:`${t}-button`,skeletonInputCls:`${t}-input`,skeletonImageCls:`${t}-image`,imageSizeBase:a(e.controlHeight).mul(1.5).equal(),borderRadius:100,skeletonLoadingBackground:`linear-gradient(90deg, ${e.gradientFromColor} 25%, ${e.gradientToColor} 37%, ${e.gradientFromColor} 63%)`,skeletonLoadingMotionDuration:"1.4s"});return[w(n)]}),(e=>{const{colorFillContent:t,colorFill:a}=e;return{color:t,colorGradientEnd:a,gradientFromColor:t,gradientToColor:a,titleHeight:e.controlHeight/2,blockRadius:e.borderRadiusSM,paragraphMarginTop:e.marginLG+e.marginXXS,paragraphLiHeight:e.controlHeight/2}}),{deprecatedTokens:[["color","gradientFromColor"],["colorGradientEnd","gradientToColor"]]});var y=e=>{const{prefixCls:t,className:a,rootClassName:i,active:c,shape:g="circle",size:d="default"}=e,{getPrefixCls:u}=n.useContext(r.E_),m=u("skeleton",t),[b,h,$]=x(m),p=(0,l.Z)(e,["prefixCls","className"]),f=s()(m,`${m}-element`,{[`${m}-active`]:c},a,i,h,$);return b(n.createElement("div",{className:f},n.createElement(o,Object.assign({prefixCls:`${m}-avatar`,shape:g,size:d},p))))};var E=e=>{const{prefixCls:t,className:a,rootClassName:i,active:c,block:g=!1,size:d="default"}=e,{getPrefixCls:u}=n.useContext(r.E_),m=u("skeleton",t),[b,h,$]=x(m),p=(0,l.Z)(e,["prefixCls"]),f=s()(m,`${m}-element`,{[`${m}-active`]:c,[`${m}-block`]:g},a,i,h,$);return b(n.createElement("div",{className:f},n.createElement(o,Object.assign({prefixCls:`${m}-button`,size:d},p))))};var N=e=>{const{prefixCls:t,className:a,rootClassName:i,style:l,active:o}=e,{getPrefixCls:c}=n.useContext(r.E_),g=c("skeleton",t),[d,u,m]=x(g),b=s()(g,`${g}-element`,{[`${g}-active`]:o},a,i,u,m);return d(n.createElement("div",{className:b},n.createElement("div",{className:s()(`${g}-image`,a),style:l},n.createElement("svg",{viewBox:"0 0 1098 1024",xmlns:"http://www.w3.org/2000/svg",className:`${g}-image-svg`},n.createElement("path",{d:"M365.714286 329.142857q0 45.714286-32.036571 77.677714t-77.677714 32.036571-77.677714-32.036571-32.036571-77.677714 32.036571-77.677714 77.677714-32.036571 77.677714 32.036571 32.036571 77.677714zM950.857143 548.571429l0 256-804.571429 0 0-109.714286 182.857143-182.857143 91.428571 91.428571 292.571429-292.571429zM1005.714286 146.285714l-914.285714 0q-7.460571 0-12.873143 5.412571t-5.412571 12.873143l0 694.857143q0 7.460571 5.412571 12.873143t12.873143 5.412571l914.285714 0q7.460571 0 12.873143-5.412571t5.412571-12.873143l0-694.857143q0-7.460571-5.412571-12.873143t-12.873143-5.412571zM1097.142857 164.571429l0 694.857143q0 37.741714-26.843429 64.585143t-64.585143 26.843429l-914.285714 0q-37.741714 0-64.585143-26.843429t-26.843429-64.585143l0-694.857143q0-37.741714 26.843429-64.585143t64.585143-26.843429l914.285714 0q37.741714 0 64.585143 26.843429t26.843429 64.585143z",className:`${g}-image-path`})))))};var H=e=>{const{prefixCls:t,className:a,rootClassName:i,active:c,block:g,size:d="default"}=e,{getPrefixCls:u}=n.useContext(r.E_),m=u("skeleton",t),[b,h,$]=x(m),p=(0,l.Z)(e,["prefixCls"]),f=s()(m,`${m}-element`,{[`${m}-active`]:c,[`${m}-block`]:g},a,i,h,$);return b(n.createElement("div",{className:f},n.createElement(o,Object.assign({prefixCls:`${m}-input`,size:d},p))))},S=a(80284),q={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M888 792H200V168c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v688c0 4.4 3.6 8 8 8h752c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM288 604a64 64 0 10128 0 64 64 0 10-128 0zm118-224a48 48 0 1096 0 48 48 0 10-96 0zm158 228a96 96 0 10192 0 96 96 0 10-192 0zm148-314a56 56 0 10112 0 56 56 0 10-112 0z"}}]},name:"dot-chart",theme:"outlined"},z=a(87292),M=function(e,t){return n.createElement(z.Z,(0,S.Z)({},e,{ref:t,icon:q}))};var R=n.forwardRef(M);var A=e=>{const{prefixCls:t,className:a,rootClassName:i,style:l,active:o,children:c}=e,{getPrefixCls:g}=n.useContext(r.E_),d=g("skeleton",t),[u,m,b]=x(d),h=s()(d,`${d}-element`,{[`${d}-active`]:o},m,a,i,b),$=null!=c?c:n.createElement(R,null);return u(n.createElement("div",{className:h},n.createElement("div",{className:s()(`${d}-image`,a),style:l},$)))},B=a(6399);const I=(e,t)=>{const{width:a,rows:n=2}=t;return Array.isArray(a)?a[e]:n-1===e?a:void 0};var F=e=>{const{prefixCls:t,className:a,style:i,rows:r}=e,l=(0,B.Z)(Array(r)).map(((t,a)=>n.createElement("li",{key:a,style:{width:I(a,e)}})));return n.createElement("ul",{className:s()(t,a),style:i},l)};var L=e=>{let{prefixCls:t,className:a,width:i,style:r}=e;return n.createElement("h3",{className:s()(t,a),style:Object.assign({width:i},r)})};function T(e){return e&&"object"==typeof e?e:{}}const P=e=>{const{prefixCls:t,loading:a,className:i,rootClassName:l,style:c,children:g,avatar:d=!1,title:u=!0,paragraph:m=!0,active:b,round:h}=e,{getPrefixCls:$,direction:p,skeleton:f}=n.useContext(r.E_),v=$("skeleton",t),[C,k,j]=x(v);if(a||!("loading"in e)){const e=!!d,t=!!u,a=!!m;let r,g;if(e){const e=Object.assign(Object.assign({prefixCls:`${v}-avatar`},function(e,t){return e&&!t?{size:"large",shape:"square"}:{size:"large",shape:"circle"}}(t,a)),T(d));r=n.createElement("div",{className:`${v}-header`},n.createElement(o,Object.assign({},e)))}if(t||a){let i,s;if(t){const t=Object.assign(Object.assign({prefixCls:`${v}-title`},function(e,t){return!e&&t?{width:"38%"}:e&&t?{width:"50%"}:{}}(e,a)),T(u));i=n.createElement(L,Object.assign({},t))}if(a){const a=Object.assign(Object.assign({prefixCls:`${v}-paragraph`},function(e,t){const a={};return e&&t||(a.width="61%"),a.rows=!e&&t?3:2,a}(e,t)),T(m));s=n.createElement(F,Object.assign({},a))}g=n.createElement("div",{className:`${v}-content`},i,s)}const $=s()(v,{[`${v}-with-avatar`]:e,[`${v}-active`]:b,[`${v}-rtl`]:"rtl"===p,[`${v}-round`]:h},null==f?void 0:f.className,i,l,k,j);return C(n.createElement("div",{className:$,style:Object.assign(Object.assign({},null==f?void 0:f.style),c)},r,g))}return null!=g?g:null};P.Button=E,P.Avatar=y,P.Input=H,P.Image=N,P.Node=A;var _=P},54689:function(e,t,a){var n=a(41442);e.exports=function(e,t){var a="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(!a){if(Array.isArray(e)||(a=n(e))||t&&e&&"number"==typeof e.length){a&&(e=a);var i=0,s=function(){};return{s:s,n:function(){return i>=e.length?{done:!0}:{done:!1,value:e[i++]}},e:function(e){throw e},f:s}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var r,l=!0,o=!1;return{s:function(){a=a.call(e)},n:function(){var e=a.next();return l=e.done,e},e:function(e){o=!0,r=e},f:function(){try{l||null==a.return||a.return()}finally{if(o)throw r}}}},e.exports.__esModule=!0,e.exports.default=e.exports}}]);