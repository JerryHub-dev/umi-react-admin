"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[96],{14311:function(e,n,r){r.r(n),r.d(n,{default:function(){return G}});var t=r(57213),a=r.n(t),i=r(2087),o=r(86898),s=r(93236),l="GridContainer___KGYKE",d=r(62086);function c(e){var n=e.children,r=e.columns;return(0,d.jsx)("ul",{className:l,style:{"--col-count":r},children:n})}var u=r(54306),v=r.n(u),g=r(19103),f=r(89216),m=r(93525),p=r.n(m),h=function(e){return e};var y=r(12342),x=r.n(y),_=r(84875),b=r.n(_),w="Action___tqOYg",j=["active","className","cursor","style"],I=(0,s.forwardRef)((function(e,n){var r=e.active,t=e.className,i=e.cursor,o=e.style,s=x()(e,j);return(0,d.jsx)("button",a()(a()({ref:n},s),{},{className:b()(w,t),tabIndex:0,style:a()(a()({},o),{},{cursor:i,"--fill":null==r?void 0:r.fill,"--background":null==r?void 0:r.background})}))})),C=(0,s.forwardRef)((function(e,n){return(0,d.jsx)(I,a()(a()({ref:n,cursor:"grab","data-cypress":"draggable-handle"},e),{},{children:(0,d.jsx)("svg",{viewBox:"0 0 20 20",width:"12",children:(0,d.jsx)("path",{d:"M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"})})}))}));function S(e){return(0,d.jsx)(I,a()(a()({},e),{},{active:{fill:"rgba(255, 70, 70, 0.95)",background:"rgba(255, 70, 70, 0.1)"},children:(0,d.jsx)("svg",{width:"8",viewBox:"0 0 22 22",xmlns:"http://www.w3.org/2000/svg",children:(0,d.jsx)("path",{d:"M2.99998 -0.000206962C2.7441 -0.000206962 2.48794 0.0972617 2.29294 0.292762L0.292945 2.29276C-0.0980552 2.68376 -0.0980552 3.31682 0.292945 3.70682L7.58591 10.9998L0.292945 18.2928C-0.0980552 18.6838 -0.0980552 19.3168 0.292945 19.7068L2.29294 21.7068C2.68394 22.0978 3.31701 22.0978 3.70701 21.7068L11 14.4139L18.2929 21.7068C18.6829 22.0978 19.317 22.0978 19.707 21.7068L21.707 19.7068C22.098 19.3158 22.098 18.6828 21.707 18.2928L14.414 10.9998L21.707 3.70682C22.098 3.31682 22.098 2.68276 21.707 2.29276L19.707 0.292762C19.316 -0.0982383 18.6829 -0.0982383 18.2929 0.292762L11 7.58573L3.70701 0.292762C3.51151 0.0972617 3.25585 -0.000206962 2.99998 -0.000206962Z"})})}))}var L={Wrapper:"Wrapper___iTcrq",fadeIn:"fadeIn___o9QqL",dragOverlay:"dragOverlay___fizNb",Item:"Item___pjfyL",pop:"pop___hY8QZ",withHandle:"withHandle___ULrf7",dragging:"dragging___M1E4p",disabled:"disabled___BO6rp",color:"color___VB2YJ",Remove:"Remove___NOT12",Actions:"Actions___X8v1P"},D=["color","dragOverlay","dragging","disabled","fadeIn","handle","handleProps","height","index","listeners","onRemove","renderItem","sorting","style","transition","transform","value","wrapperStyle"],N=s.memo(s.forwardRef((function(e,n){var r=e.color,t=e.dragOverlay,i=e.dragging,o=e.disabled,l=e.fadeIn,c=e.handle,u=e.handleProps,v=(e.height,e.index),g=e.listeners,f=e.onRemove,m=e.renderItem,p=e.sorting,h=e.style,y=e.transition,_=e.transform,w=e.value,j=e.wrapperStyle,I=x()(e,D);return(0,s.useEffect)((function(){if(t)return document.body.style.cursor="grabbing",function(){document.body.style.cursor=""}}),[t]),m?m({dragOverlay:Boolean(t),dragging:Boolean(i),sorting:Boolean(p),index:v,fadeIn:Boolean(l),listeners:g,ref:n,style:h,transform:_,transition:y,value:w}):(0,d.jsx)("li",{className:b()(L.Wrapper,l&&L.fadeIn,p&&L.sorting,t&&L.dragOverlay),style:a()(a()({},j),{},{transition:[y,null==j?void 0:j.transition].filter(Boolean).join(", "),"--translate-x":_?"".concat(Math.round(_.x),"px"):void 0,"--translate-y":_?"".concat(Math.round(_.y),"px"):void 0,"--scale-x":null!=_&&_.scaleX?"".concat(_.scaleX):void 0,"--scale-y":null!=_&&_.scaleY?"".concat(_.scaleY):void 0,"--index":v,"--color":r}),ref:n,children:(0,d.jsxs)("div",a()(a()(a()({className:b()(L.Item,i&&L.dragging,c&&L.withHandle,t&&L.dragOverlay,o&&L.disabled,r&&L.color),style:h,"data-cypress":"draggable-item"},c?void 0:g),I),{},{tabIndex:c?void 0:0,children:[w,(0,d.jsxs)("span",{className:L.Actions,children:[f?(0,d.jsx)(S,{className:L.Remove,onClick:f}):null,c?(0,d.jsx)(C,a()(a()({},u),g)):null]})]}))})}))),O="List___jtLKv",R="horizontal___udKZE",A=(0,s.forwardRef)((function(e,n){var r=e.children,t=e.columns,i=void 0===t?1:t,o=e.horizontal,s=e.style;return(0,d.jsx)("ul",{ref:n,style:a()(a()({},s),{},{"--columns":i}),className:b()(O,o&&R),children:r})})),B="Wrapper___NJieG",k="center___Fh1ue";function z(e){var n=e.children,r=e.center,t=e.style;return(0,d.jsx)("div",{className:b()(B,r&&k),style:t,children:n})}function E(e){var n=e.disabled,r=e.animateLayoutChanges,t=e.getNewIndex,i=e.handle,s=e.id,l=e.index,c=e.onRemove,u=e.style,v=e.renderItem,g=e.useDragOverlay,f=e.wrapperStyle,m=(0,o.nB)({id:s,animateLayoutChanges:r,disabled:n,getNewIndex:t}),p=m.active,h=m.attributes,y=m.isDragging,x=m.isSorting,_=m.listeners,b=m.overIndex,w=m.setNodeRef,j=m.setActivatorNodeRef,I=m.transform,C=m.transition;return(0,d.jsx)(N,a()({ref:w,value:s,disabled:n,dragging:y,sorting:x,handle:i,handleProps:i?{ref:j}:void 0,renderItem:v,index:l,style:u({index:l,id:s,isDragging:y,isSorting:x,overIndex:b}),onRemove:c?function(){return c(s)}:void 0,transform:I,transition:C,wrapperStyle:null==f?void 0:f({index:l,isDragging:y,active:p,id:s}),listeners:_,"data-index":l,"data-id":s,dragOverlay:!g&&y},h))}var P={sideEffects:(0,f.Ai)({styles:{active:{opacity:"0.5"}}})},M={draggable:"\n    To pick up a sortable item, press the space bar.\n    While sorting, use the arrow keys to move the item.\n    Press space again to drop the item in its new position, or press escape to cancel.\n  "};function T(e){var n=e.activationConstraint,r=e.animateLayoutChanges,t=e.adjustScale,a=void 0!==t&&t,i=e.Container,l=void 0===i?A:i,c=e.collisionDetection,u=void 0===c?f.pE:c,m=e.coordinateGetter,y=void 0===m?o.is:m,x=e.dropAnimation,_=void 0===x?P:x,b=e.getItemStyles,w=void 0===b?function(){return{}}:b,j=e.getNewIndex,I=e.handle,C=void 0!==I&&I,S=e.itemCount,L=void 0===S?16:S,D=e.items,O=e.isDisabled,R=void 0===O?function(){return!1}:O,B=e.measuring,k=e.modifiers,T=e.removable,Y=e.renderItem,G=e.reorderItems,W=void 0===G?o.Rp:G,K=e.strategy,V=void 0===K?o.U2:K,Z=e.style,q=e.useDragOverlay,H=void 0===q||q,U=e.wrapperStyle,X=void 0===U?function(){return{}}:U,F=(0,s.useState)((function(){return null!=D?D:function(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:h;return p()(new Array(e)).map((function(e,r){return n(r)}))}(L,(function(e){return e+1}))})),J=v()(F,2),Q=J[0],$=J[1],ee=(0,s.useState)(null),ne=v()(ee,2),re=ne[0],te=ne[1],ae=(0,f.Dy)((0,f.VT)(f.MA,{activationConstraint:n}),(0,f.VT)(f.LO,{activationConstraint:n}),(0,f.VT)(f.Lg,{scrollBehavior:"Cypress"in window?"auto":void 0,coordinateGetter:y})),ie=(0,s.useRef)(!0),oe=function(e){return Q.indexOf(e)},se=function(e){return oe(e)+1},le=re?oe(re):-1,de=T?function(e){return $((function(n){return n.filter((function(n){return n!==e}))}))}:void 0,ce={onDragStart:function(e){var n=e.active.id;return"Picked up sortable item ".concat(String(n),". Sortable item ").concat(n," is in position ").concat(se(n)," of ").concat(Q.length)},onDragOver:function(e){var n=e.active,r=e.over;if(!0!==ie.current)return r?"Sortable item ".concat(n.id," was moved into position ").concat(se(r.id)," of ").concat(Q.length):void 0;ie.current=!1},onDragEnd:function(e){var n=e.active,r=e.over;if(r)return"Sortable item ".concat(n.id," was dropped at position ").concat(se(r.id)," of ").concat(Q.length)},onDragCancel:function(e){var n=e.active.id;return"Sorting was cancelled. Sortable item ".concat(n," was dropped and returned to position ").concat(se(n)," of ").concat(Q.length,".")}};return(0,s.useEffect)((function(){re||(ie.current=!0)}),[re]),(0,d.jsxs)(f.LB,{accessibility:{announcements:ce,screenReaderInstructions:M},sensors:ae,collisionDetection:u,onDragStart:function(e){var n=e.active;n&&te(n.id)},onDragEnd:function(e){var n=e.over;if(te(null),n){var r=oe(n.id);le!==r&&$((function(e){return W(e,le,r)}))}},onDragCancel:function(){return te(null)},measuring:B,modifiers:k,children:[(0,d.jsx)(z,{style:Z,center:!0,children:(0,d.jsx)(o.Fo,{items:Q,strategy:V,children:(0,d.jsx)(l,{children:Q.map((function(e,n){return(0,d.jsx)(E,{id:e,handle:C,index:n,style:w,wrapperStyle:X,disabled:R(e),renderItem:Y,onRemove:de,animateLayoutChanges:r,useDragOverlay:H,getNewIndex:j},e)}))})})}),H?(0,g.createPortal)((0,d.jsx)(f.y9,{adjustScale:a,dropAnimation:_,children:re?(0,d.jsx)(N,{value:Q[le],handle:C,renderItem:Y,wrapperStyle:X({active:{id:re},index:le,isDragging:!0,id:Q[le]}),style:w({id:Q[le],index:le,isSorting:null!==re,isDragging:!0,overIndex:-1,isDragOverlay:!0}),dragOverlay:!0}):null}),document.body):null]})}var Y={adjustScale:!0,Container:function(e){return(0,d.jsx)(c,a()(a()({},e),{},{columns:5}))},strategy:o.U2,wrapperStyle:function(){return{width:140,height:140}}};function G(){return(0,d.jsx)(i.Z,{className:"shadow-2xl",children:(0,d.jsx)(T,a()(a()({},Y),{},{useDragOverlay:!1}))})}}}]);