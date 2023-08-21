"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[731],{64009:function(q,T,m){m.r(T),m.d(T,{default:function(){return $}});var A=m(95442),C=m(93236),e=m(40507),k=function(){return k=Object.assign||function(t){for(var r,o=1,n=arguments.length;o<n;o++){r=arguments[o];for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&(t[i]=r[i])}return t},k.apply(this,arguments)},D={onActivate:e.func,onAddUndo:e.func,onBeforeAddUndo:e.func,onBeforeExecCommand:e.func,onBeforeGetContent:e.func,onBeforeRenderUI:e.func,onBeforeSetContent:e.func,onBeforePaste:e.func,onBlur:e.func,onChange:e.func,onClearUndos:e.func,onClick:e.func,onContextMenu:e.func,onCommentChange:e.func,onCopy:e.func,onCut:e.func,onDblclick:e.func,onDeactivate:e.func,onDirty:e.func,onDrag:e.func,onDragDrop:e.func,onDragEnd:e.func,onDragGesture:e.func,onDragOver:e.func,onDrop:e.func,onExecCommand:e.func,onFocus:e.func,onFocusIn:e.func,onFocusOut:e.func,onGetContent:e.func,onHide:e.func,onInit:e.func,onKeyDown:e.func,onKeyPress:e.func,onKeyUp:e.func,onLoadContent:e.func,onMouseDown:e.func,onMouseEnter:e.func,onMouseLeave:e.func,onMouseMove:e.func,onMouseOut:e.func,onMouseOver:e.func,onMouseUp:e.func,onNodeChange:e.func,onObjectResizeStart:e.func,onObjectResized:e.func,onObjectSelected:e.func,onPaste:e.func,onPostProcess:e.func,onPostRender:e.func,onPreProcess:e.func,onProgressState:e.func,onRedo:e.func,onRemove:e.func,onReset:e.func,onSaveContent:e.func,onSelectionChange:e.func,onSetAttrib:e.func,onSetContent:e.func,onShow:e.func,onSubmit:e.func,onUndo:e.func,onVisualAid:e.func,onSkinLoadError:e.func,onThemeLoadError:e.func,onModelLoadError:e.func,onPluginLoadError:e.func,onIconsLoadError:e.func,onLanguageLoadError:e.func,onScriptsLoad:e.func,onScriptsLoadError:e.func},H=k({apiKey:e.string,id:e.string,inline:e.bool,init:e.object,initialValue:e.string,onEditorChange:e.func,value:e.string,tagName:e.string,cloudChannel:e.string,plugins:e.oneOfType([e.string,e.array]),toolbar:e.oneOfType([e.string,e.array]),disabled:e.bool,textareaName:e.string,tinymceScriptSrc:e.oneOfType([e.string,e.arrayOf(e.string),e.arrayOf(e.shape({src:e.string,async:e.bool,defer:e.bool}))]),rollback:e.oneOfType([e.number,e.oneOf([!1])]),scriptLoading:e.shape({async:e.bool,defer:e.bool,delay:e.number})},D),w=function(t){return typeof t=="function"},j=function(t){return t in D},B=function(t){return t.substr(2)},V=function(t,r,o,n,i,s,u){var a=Object.keys(i).filter(j),c=Object.keys(s).filter(j),l=a.filter(function(f){return s[f]===void 0}),d=c.filter(function(f){return i[f]===void 0});l.forEach(function(f){var p=B(f),h=u[p];o(p,h),delete u[p]}),d.forEach(function(f){var p=n(t,f),h=B(f);u[h]=p,r(h,p)})},z=function(t,r,o,n,i){return V(i,t.on.bind(t),t.off.bind(t),function(s,u){return function(a){var c;return(c=s(u))===null||c===void 0?void 0:c(a,t)}},r,o,n)},_=0,P=function(t){var r=Date.now(),o=Math.floor(Math.random()*1e9);return _++,t+"_"+o+_+String(r)},M=function(t){return t!==null&&(t.tagName.toLowerCase()==="textarea"||t.tagName.toLowerCase()==="input")},N=function(t){return typeof t=="undefined"||t===""?[]:Array.isArray(t)?t:t.split(" ")},K=function(t,r){return N(t).concat(N(r))},U=function(){return window.InputEvent&&typeof InputEvent.prototype.getTargetRanges=="function"},F=function(t){if(!("isConnected"in Node.prototype)){for(var r=t,o=t.parentNode;o!=null;)r=o,o=r.parentNode;return r===t.ownerDocument}return t.isConnected},R=function(t,r){t!==void 0&&(t.mode!=null&&typeof t.mode=="object"&&typeof t.mode.set=="function"?t.mode.set(r):t.setMode(r))},L=function(){return L=Object.assign||function(t){for(var r,o=1,n=arguments.length;o<n;o++){r=arguments[o];for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&(t[i]=r[i])}return t},L.apply(this,arguments)},G=function(t,r,o){var n,i,s=t.createElement("script");s.referrerPolicy="origin",s.type="application/javascript",s.id=r.id,s.src=r.src,s.async=(n=r.async)!==null&&n!==void 0?n:!1,s.defer=(i=r.defer)!==null&&i!==void 0?i:!1;var u=function(){s.removeEventListener("load",u),s.removeEventListener("error",a),o(r.src)},a=function(c){s.removeEventListener("load",u),s.removeEventListener("error",a),o(r.src,c)};s.addEventListener("load",u),s.addEventListener("error",a),t.head&&t.head.appendChild(s)},Z=function(t){var r={},o=function(u,a){var c=r[u];c.done=!0,c.error=a;for(var l=0,d=c.handlers;l<d.length;l++){var f=d[l];f(u,a)}c.handlers=[]},n=function(u,a,c){var l=function(E){return c!==void 0?c(E):console.error(E)};if(u.length===0){l(new Error("At least one script must be provided"));return}for(var d=0,f=!1,p=function(E,x){f||(x?(f=!0,l(x)):++d===u.length&&a())},h=0,v=u;h<v.length;h++){var g=v[h],y=r[g.src];if(y)y.done?p(g.src,y.error):y.handlers.push(p);else{var b=P("tiny-");r[g.src]={id:b,src:g.src,done:!1,error:null,handlers:[p]},G(t,L({id:b},g),o)}}},i=function(){for(var u,a=0,c=Object.values(r);a<c.length;a++){var l=c[a],d=t.getElementById(l.id);d!=null&&d.tagName==="SCRIPT"&&((u=d.parentNode)===null||u===void 0||u.removeChild(d))}r={}},s=function(){return t};return{loadScripts:n,deleteScripts:i,getDocument:s}},J=function(){var t=[],r=function(i){var s=t.find(function(u){return u.getDocument()===i});return s===void 0&&(s=Z(i),t.push(s)),s},o=function(i,s,u,a,c){var l=function(){return r(i).loadScripts(s,a,c)};u>0?setTimeout(l,u):l()},n=function(){for(var i=t.pop();i!=null;i=t.pop())i.deleteScripts()};return{loadList:o,reinitialize:n}},W=J(),I=function(t){var r=t;return r&&r.tinymce?r.tinymce:null},Q=function(){var t=function(r,o){return t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var s in i)Object.prototype.hasOwnProperty.call(i,s)&&(n[s]=i[s])},t(r,o)};return function(r,o){if(typeof o!="function"&&o!==null)throw new TypeError("Class extends value "+String(o)+" is not a constructor or null");t(r,o);function n(){this.constructor=r}r.prototype=o===null?Object.create(o):(n.prototype=o.prototype,new n)}}(),S=function(){return S=Object.assign||function(t){for(var r,o=1,n=arguments.length;o<n;o++){r=arguments[o];for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&(t[i]=r[i])}return t},S.apply(this,arguments)},X=function(t){Q(r,t);function r(o){var n=this,i,s,u;return n=t.call(this,o)||this,n.rollbackTimer=void 0,n.valueCursor=void 0,n.rollbackChange=function(){var a=n.editor,c=n.props.value;a&&c&&c!==n.currentContent&&a.undoManager.ignore(function(){if(a.setContent(c),n.valueCursor&&(!n.inline||a.hasFocus()))try{a.selection.moveToBookmark(n.valueCursor)}catch(l){}}),n.rollbackTimer=void 0},n.handleBeforeInput=function(a){if(n.props.value!==void 0&&n.props.value===n.currentContent&&n.editor&&(!n.inline||n.editor.hasFocus()))try{n.valueCursor=n.editor.selection.getBookmark(3)}catch(c){}},n.handleBeforeInputSpecial=function(a){(a.key==="Enter"||a.key==="Backspace"||a.key==="Delete")&&n.handleBeforeInput(a)},n.handleEditorChange=function(a){var c=n.editor;if(c&&c.initialized){var l=c.getContent();n.props.value!==void 0&&n.props.value!==l&&n.props.rollback!==!1&&(n.rollbackTimer||(n.rollbackTimer=window.setTimeout(n.rollbackChange,typeof n.props.rollback=="number"?n.props.rollback:200))),l!==n.currentContent&&(n.currentContent=l,w(n.props.onEditorChange)&&n.props.onEditorChange(l,c))}},n.handleEditorChangeSpecial=function(a){(a.key==="Backspace"||a.key==="Delete")&&n.handleEditorChange(a)},n.initialise=function(a){var c,l,d;a===void 0&&(a=0);var f=n.elementRef.current;if(f){if(!F(f)){if(a===0)setTimeout(function(){return n.initialise(1)},1);else if(a<100)setTimeout(function(){return n.initialise(a+1)},100);else throw new Error("tinymce can only be initialised when in a document");return}var p=I(n.view);if(!p)throw new Error("tinymce should have been loaded into global scope");var h=S(S({},n.props.init),{selector:void 0,target:f,readonly:n.props.disabled,inline:n.inline,plugins:K((c=n.props.init)===null||c===void 0?void 0:c.plugins,n.props.plugins),toolbar:(l=n.props.toolbar)!==null&&l!==void 0?l:(d=n.props.init)===null||d===void 0?void 0:d.toolbar,setup:function(v){n.editor=v,n.bindHandlers({}),n.inline&&!M(f)&&v.once("PostRender",function(g){v.setContent(n.getInitialValue(),{no_events:!0})}),n.props.init&&w(n.props.init.setup)&&n.props.init.setup(v)},init_instance_callback:function(v){var g,y,b=n.getInitialValue();n.currentContent=(g=n.currentContent)!==null&&g!==void 0?g:v.getContent(),n.currentContent!==b&&(n.currentContent=b,v.setContent(b),v.undoManager.clear(),v.undoManager.add(),v.setDirty(!1));var E=(y=n.props.disabled)!==null&&y!==void 0?y:!1;R(n.editor,E?"readonly":"design"),n.props.init&&w(n.props.init.init_instance_callback)&&n.props.init.init_instance_callback(v)}});n.inline||(f.style.visibility=""),M(f)&&(f.value=n.getInitialValue()),p.init(h)}},n.id=n.props.id||P("tiny-react"),n.elementRef=C.createRef(),n.inline=(u=(i=n.props.inline)!==null&&i!==void 0?i:(s=n.props.init)===null||s===void 0?void 0:s.inline)!==null&&u!==void 0?u:!1,n.boundHandlers={},n}return Object.defineProperty(r.prototype,"view",{get:function(){var o,n;return(n=(o=this.elementRef.current)===null||o===void 0?void 0:o.ownerDocument.defaultView)!==null&&n!==void 0?n:window},enumerable:!1,configurable:!0}),r.prototype.componentDidUpdate=function(o){var n=this,i,s;if(this.rollbackTimer&&(clearTimeout(this.rollbackTimer),this.rollbackTimer=void 0),this.editor&&(this.bindHandlers(o),this.editor.initialized)){if(this.currentContent=(i=this.currentContent)!==null&&i!==void 0?i:this.editor.getContent(),typeof this.props.initialValue=="string"&&this.props.initialValue!==o.initialValue)this.editor.setContent(this.props.initialValue),this.editor.undoManager.clear(),this.editor.undoManager.add(),this.editor.setDirty(!1);else if(typeof this.props.value=="string"&&this.props.value!==this.currentContent){var u=this.editor;u.undoManager.transact(function(){var c;if(!n.inline||u.hasFocus())try{c=u.selection.getBookmark(3)}catch(h){}var l=n.valueCursor;if(u.setContent(n.props.value),!n.inline||u.hasFocus())for(var d=0,f=[c,l];d<f.length;d++){var p=f[d];if(p)try{u.selection.moveToBookmark(p),n.valueCursor=p;break}catch(h){}}})}if(this.props.disabled!==o.disabled){var a=(s=this.props.disabled)!==null&&s!==void 0?s:!1;R(this.editor,a?"readonly":"design")}}},r.prototype.componentDidMount=function(){var o=this,n,i,s,u,a;if(I(this.view)!==null)this.initialise();else if(Array.isArray(this.props.tinymceScriptSrc)&&this.props.tinymceScriptSrc.length===0)(i=(n=this.props).onScriptsLoadError)===null||i===void 0||i.call(n,new Error("No `tinymce` global is present but the `tinymceScriptSrc` prop was an empty array."));else if(!((s=this.elementRef.current)===null||s===void 0)&&s.ownerDocument){var c=function(){var d,f;(f=(d=o.props).onScriptsLoad)===null||f===void 0||f.call(d),o.initialise()},l=function(d){var f,p;(p=(f=o.props).onScriptsLoadError)===null||p===void 0||p.call(f,d)};W.loadList(this.elementRef.current.ownerDocument,this.getScriptSources(),(a=(u=this.props.scriptLoading)===null||u===void 0?void 0:u.delay)!==null&&a!==void 0?a:0,c,l)}},r.prototype.componentWillUnmount=function(){var o=this,n=this.editor;n&&(n.off(this.changeEvents(),this.handleEditorChange),n.off(this.beforeInputEvent(),this.handleBeforeInput),n.off("keypress",this.handleEditorChangeSpecial),n.off("keydown",this.handleBeforeInputSpecial),n.off("NewBlock",this.handleEditorChange),Object.keys(this.boundHandlers).forEach(function(i){n.off(i,o.boundHandlers[i])}),this.boundHandlers={},n.remove(),this.editor=void 0)},r.prototype.render=function(){return this.inline?this.renderInline():this.renderIframe()},r.prototype.changeEvents=function(){var o,n,i,s=(i=(n=(o=I(this.view))===null||o===void 0?void 0:o.Env)===null||n===void 0?void 0:n.browser)===null||i===void 0?void 0:i.isIE();return s?"change keyup compositionend setcontent CommentChange":"change input compositionend setcontent CommentChange"},r.prototype.beforeInputEvent=function(){return U()?"beforeinput SelectionChange":"SelectionChange"},r.prototype.renderInline=function(){var o=this.props.tagName,n=o===void 0?"div":o;return C.createElement(n,{ref:this.elementRef,id:this.id})},r.prototype.renderIframe=function(){return C.createElement("textarea",{ref:this.elementRef,style:{visibility:"hidden"},name:this.props.textareaName,id:this.id})},r.prototype.getScriptSources=function(){var o,n,i=(o=this.props.scriptLoading)===null||o===void 0?void 0:o.async,s=(n=this.props.scriptLoading)===null||n===void 0?void 0:n.defer;if(this.props.tinymceScriptSrc!==void 0)return typeof this.props.tinymceScriptSrc=="string"?[{src:this.props.tinymceScriptSrc,async:i,defer:s}]:this.props.tinymceScriptSrc.map(function(l){return typeof l=="string"?{src:l,async:i,defer:s}:l});var u=this.props.cloudChannel,a=this.props.apiKey?this.props.apiKey:"no-api-key",c="https://cdn.tiny.cloud/1/".concat(a,"/tinymce/").concat(u,"/tinymce.min.js");return[{src:c,async:i,defer:s}]},r.prototype.getInitialValue=function(){return typeof this.props.initialValue=="string"?this.props.initialValue:typeof this.props.value=="string"?this.props.value:""},r.prototype.bindHandlers=function(o){var n=this;if(this.editor!==void 0){z(this.editor,o,this.props,this.boundHandlers,function(a){return n.props[a]});var i=function(a){return a.onEditorChange!==void 0||a.value!==void 0},s=i(o),u=i(this.props);!s&&u?(this.editor.on(this.changeEvents(),this.handleEditorChange),this.editor.on(this.beforeInputEvent(),this.handleBeforeInput),this.editor.on("keydown",this.handleBeforeInputSpecial),this.editor.on("keyup",this.handleEditorChangeSpecial),this.editor.on("NewBlock",this.handleEditorChange)):s&&!u&&(this.editor.off(this.changeEvents(),this.handleEditorChange),this.editor.off(this.beforeInputEvent(),this.handleBeforeInput),this.editor.off("keydown",this.handleBeforeInputSpecial),this.editor.off("keyup",this.handleEditorChangeSpecial),this.editor.off("NewBlock",this.handleEditorChange))}},r.propTypes=H,r.defaultProps={cloudChannel:"6"},r}(C.Component),Y=m(17628),O=m(62086),$=function(){var t=(0,C.useRef)(null),r=function(){t.current&&console.log(t.current.getContent())};return(0,O.jsxs)(A.Z,{className:"shadow-2xl",children:[(0,O.jsx)(X,{apiKey:"6zvw3rhm02o1kafli7w6bclz6xt3zgc8fcc718dq44s56rz7",onInit:function(n,i){return t.current=i},initialValue:"<p>This is the initial content of the editor.</p>",init:{height:500,menubar:!1,plugins:["advlist","autolink","lists","link","image","charmap","preview","anchor","searchreplace","visualblocks","code","fullscreen","insertdatetime","media","table","code","help","wordcount"],toolbar:"undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help",content_style:"body { font-family:Helvetica,Arial,sans-serif; font-size:14px }"}}),(0,O.jsx)(Y.ZP,{className:"mt-8",onClick:r,children:"Log editor content"})]})}}}]);
