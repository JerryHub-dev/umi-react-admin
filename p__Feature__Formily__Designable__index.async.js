"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[532],{73013:function(n,e,r){r.r(e),r.d(e,{default:function(){return q}});var t={};r.r(t),r.d(t,{ArrayCards:function(){return P.uE},ArrayTable:function(){return P.hf},Card:function(){return I.Z},Cascader:function(){return P.vT},Checkbox:function(){return P.XZ},DatePicker:function(){return P.Mt},Editable:function(){return P.CX},Form:function(){return P.l0},FormCollapse:function(){return P.ox},FormGrid:function(){return P.T5},FormItem:function(){return P.xJ},FormLayout:function(){return P.lt},FormTab:function(){return P.KE},Input:function(){return P.II},NumberPicker:function(){return P.Ye},Password:function(){return P.ro},PreviewText:function(){return P.c8},Radio:function(){return P.Y8},Rate:function(){return E.Z},Reset:function(){return P.AG},Select:function(){return P.Ph},Slider:function(){return R.Z},Space:function(){return P.T},Submit:function(){return P.k4},Switch:function(){return P.rs},Text:function(){return D},TimePicker:function(){return P.jI},Transfer:function(){return P.FE},TreeSelect:function(){return P.mP},Upload:function(){return P.gq}});var o=r(57213),i=r.n(o),c=r(93236),a=r(73858),s=r(40238),u=function(n){localStorage.setItem("formily-schema",JSON.stringify((0,a.Q)(n.getCurrentTree()))),s.ZP.success("Save Success")},l=r(75384),m=r(79879),d=r(73803),f=r(84931),p=r(87074),h=r(84525),g=r(43776),x=r(62086),y=(0,m.Pi)((function(){var n=(0,f.et)();(0,c.useEffect)((function(){!function(n){try{n.setCurrentTree((0,a.I)(JSON.parse(localStorage.getItem("formily-schema"))))}catch(n){}}(n)}),[]);var e=["zh-cn","en-us","ko-kr"];return(0,c.useEffect)((function(){e.includes(d.lU.getDesignerLanguage())||d.lU.setDesignerLanguage("zh-cn")}),[]),(0,x.jsxs)(p.Z,{style:{marginRight:10},children:[(0,x.jsx)(h.ZP,{href:"https://designable-fusion.formilyjs.org",children:"Alibaba Fusion"}),(0,x.jsx)(g.ZP.Group,{value:d.lU.getDesignerLanguage(),optionType:"button",options:[{label:"English",value:"en-us"},{label:"简体中文",value:"zh-cn"},{label:"한국어",value:"ko-kr"}],onChange:function(n){d.lU.setDesignerLanguage(n.target.value)}}),(0,x.jsxs)(h.ZP,{href:"https://github.com/pindjs/designable",target:"_blank",children:[(0,x.jsx)(l.Z,{}),"Github"]}),(0,x.jsx)(h.ZP,{onClick:function(){u(n)},children:(0,x.jsx)(f.yE,{children:"Save"})}),(0,x.jsx)(h.ZP,{type:"primary",onClick:function(){u(n)},children:(0,x.jsx)(f.yE,{children:"Publish"})})]})})),j={dark:"//img.alicdn.com/imgextra/i2/O1CN01NTUDi81fHLQvZCPnc_!!6000000003981-55-tps-1141-150.svg",light:"//img.alicdn.com/imgextra/i2/O1CN01Kq3OHU1fph6LGqjIz_!!6000000004056-55-tps-1141-150.svg"},S=function(){var n=j[(0,f.Fg)()];return(0,x.jsx)("div",{style:{display:"flex",alignItems:"center",fontSize:14},children:(0,x.jsx)("img",{src:n,style:{margin:"12px 8px",height:18,width:"auto"}})})},v=r(3857),b=r(71754),F=function(n){return(0,x.jsx)(b.kI,i()(i()({},n),{},{options:{readOnly:!0},value:(e=n.tree,r=function(n){if(!n)return"";var e=i()({},n.props);return 0!==n.depth&&(e.name=n.props.name||n.id),"".concat(Object.keys(e).map((function(n){if("x-designable-id"===n||"x-designable-source-name"===n||"_isJSONSchemaObject"===n||"version"===n||"type"===n)return"";var r=e[n];return(0,v.Uk)(r)&&(0,v.xb)(r)?"":"string"==typeof r?"".concat(n,'="').concat(r,'"'):"".concat(n,"={").concat(JSON.stringify(r),"}")})).join(" "))},t=function(n){return n?n.children.map((function(n){return c(n)})).join(""):""},o=function(n){return"string"===n.props.type?"SchemaField.String":"number"===n.props.type?"SchemaField.Number":"boolean"===n.props.type?"SchemaField.Boolean":"date"===n.props.type?"SchemaField.Date":"datetime"===n.props.type?"SchemaField.DateTime":"array"===n.props.type?"SchemaField.Array":"object"===n.props.type?"SchemaField.Object":"void"===n.props.type?"SchemaField.Void":"SchemaField.Markup"},c=function(n){return n?"<".concat(o(n)," ").concat(r(n)," ").concat(n.children.length?">".concat(t(n),"</").concat(o(n),">"):"/>"):""},a=e.find((function(n){return"Form"===n.componentName||"Root"===n.componentName})),"import React, { useMemo } from 'react'\nimport { createForm } from '@formily/core'\nimport { createSchemaField } from '@formily/react'\nimport {\n  Form,\n  FormItem,\n  DatePicker,\n  Checkbox,\n  Cascader,\n  Editable,\n  Input,\n  NumberPicker,\n  Switch,\n  Password,\n  PreviewText,\n  Radio,\n  Reset,\n  Select,\n  Space,\n  Submit,\n  TimePicker,\n  Transfer,\n  TreeSelect,\n  Upload,\n  FormGrid,\n  FormLayout,\n  FormTab,\n  FormCollapse,\n  ArrayTable,\n  ArrayCards,\n} from '@formily/antd-v5'\nimport { Card, Slider, Rate } from 'antd'\n\nconst Text: React.FC<{\n  value?: string\n  content?: string\n  mode?: 'normal' | 'h1' | 'h2' | 'h3' | 'p'\n}> = ({ value, mode, content, ...props }) => {\n  const tagName = mode === 'normal' || !mode ? 'div' : mode\n  return React.createElement(tagName, props, value || content)\n}\n\nconst SchemaField = createSchemaField({\n  components: {\n    Space,\n    FormGrid,\n    FormLayout,\n    FormTab,\n    FormCollapse,\n    ArrayTable,\n    ArrayCards,\n    FormItem,\n    DatePicker,\n    Checkbox,\n    Cascader,\n    Editable,\n    Input,\n    Text,\n    NumberPicker,\n    Switch,\n    Password,\n    PreviewText,\n    Radio,\n    Reset,\n    Select,\n    Submit,\n    TimePicker,\n    Transfer,\n    TreeSelect,\n    Upload,\n    Card,\n    Slider,\n    Rate,\n  },\n})\n\nexport default ()=>{\n  const form = useMemo(() => createForm(), [])\n\n  return <Form form={form} ".concat(r(a),">\n    <SchemaField>\n      ").concat(t(a),"\n    </SchemaField>\n  </Form>\n}\n  \n")),language:"typescript"}));var e,r,t,o,c,a},C=r(94831),k=r(12342),T=r.n(k),P=r(93761),I=r(46390),E=r(26600),R=r(72336),N=["value","mode","content"],D=function(n){var e=n.value,r=n.mode,t=n.content,o=T()(n,N),i="normal"!==r&&r?r:"div";return c.createElement(i,o,e||t)},A=r(95494),O=A.Z.ErrorBoundary,w=(0,m.cA)({components:t}),L=function(n){var e=(0,c.useMemo)((function(){return(0,C.Np)()}),[]),r=(0,a.Q)(n.tree),t=r.form,o=r.schema;return(0,x.jsx)(O,{children:(0,x.jsx)(P.l0,i()(i()({},t),{},{form:e,children:(0,x.jsx)(w,{schema:o})}))})},Z=function(n){return(0,x.jsx)(b.kI,i()(i()({},n),{},{value:JSON.stringify((0,a.Q)(n.tree),null,2),onChange:function(e){var r;null===(r=n.onChange)||void 0===r||r.call(n,(0,a.I)(JSON.parse(e)))},language:"json"}))},U=r(96869);(0,b.GJ)("//unpkg.com");var J=A.Z.ErrorBoundary;d.lU.registerDesignerLocales({"zh-CN":{sources:{Inputs:"输入控件",Layouts:"布局组件",Arrays:"自增组件",Displays:"展示组件"}},"en-US":{sources:{Inputs:"Inputs",Layouts:"Layouts",Arrays:"Arrays",Displays:"Displays"}},"ko-KR":{sources:{Inputs:"입력",Layouts:"레이아웃",Arrays:"배열",Displays:"디스플레이"}}});var G=function(){var n=(0,c.useMemo)((function(){return(0,d.vP)({shortcuts:[new d.z9({codes:[[d.VD.Meta,d.VD.S],[d.VD.Control,d.VD.S]],handler:function(n){u(n.engine)}})],rootComponentName:"Form"})}),[]);return(0,x.jsx)(f.lg,{engine:n,children:(0,x.jsxs)(f.ZE,{logo:(0,x.jsx)(S,{}),actions:(0,x.jsx)(y,{}),children:[(0,x.jsxs)(f.qi,{children:[(0,x.jsx)(f.qi.Item,{title:"panels.Component",icon:"Component",children:(0,x.jsx)(f.kv,{sources:Object.values(i()({},U.YI))})}),(0,x.jsx)(f.qi.Item,{title:"panels.OutlinedTree",icon:"Outline",children:(0,x.jsx)(f.Ri,{})}),(0,x.jsx)(f.qi.Item,{title:"panels.History",icon:"History",children:(0,x.jsx)(f.Je,{})})]}),(0,x.jsx)(f.j$,{id:"form",children:(0,x.jsx)(f.qs,{children:(0,x.jsxs)(J,{children:[(0,x.jsxs)(f.T0,{children:[(0,x.jsx)(f.hL,{}),(0,x.jsx)(f.cl,{use:["DESIGNABLE","JSONTREE","MARKUP","PREVIEW"]})]}),(0,x.jsxs)(f.Im,{style:{height:"100%"},children:[(0,x.jsx)(f.Rf,{type:"DESIGNABLE",children:function(){return(0,x.jsx)(f.wY,{components:i()({},U.YI)})}}),(0,x.jsx)(f.Rf,{type:"JSONTREE",scrollable:!1,children:function(n,e){return(0,x.jsx)(Z,{tree:n,onChange:e})}}),(0,x.jsx)(f.Rf,{type:"MARKUP",scrollable:!1,children:function(n){return(0,x.jsx)(F,{tree:n})}}),(0,x.jsx)(f.Rf,{type:"PREVIEW",children:function(n){return(0,x.jsx)(L,{tree:n})}})]})]})})}),(0,x.jsx)(f.fQ,{title:"panels.PropertySettings",children:(0,x.jsx)(b.lB,{uploadAction:"https://www.mocky.io/v2/5cc8019d300000980a055e76"})})]})})},M=r(27808),q=function(){return(0,x.jsx)(M.Z,{children:(0,x.jsx)(G,{})})}}}]);