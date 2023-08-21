"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[532],{93809:function(tn,T,e){e.r(T),e.d(T,{default:function(){return rn}});var C={};e.r(C),e.d(C,{ArrayCards:function(){return r.uE},ArrayTable:function(){return r.hf},Card:function(){return V.Z},Cascader:function(){return r.vT},Checkbox:function(){return r.XZ},DatePicker:function(){return r.Mt},Editable:function(){return r.CX},Form:function(){return r.l0},FormCollapse:function(){return r.ox},FormGrid:function(){return r.T5},FormItem:function(){return r.xJ},FormLayout:function(){return r.lt},FormTab:function(){return r.KE},Input:function(){return r.II},NumberPicker:function(){return r.Ye},Password:function(){return r.ro},PreviewText:function(){return r.c8},Radio:function(){return r.Y8},Rate:function(){return k.Z},Reset:function(){return r.AG},Select:function(){return r.Ph},Slider:function(){return K.Z},Space:function(){return r.T},Submit:function(){return r.k4},Switch:function(){return r.rs},Text:function(){return Y},TimePicker:function(){return r.jI},Transfer:function(){return r.FE},TreeSelect:function(){return r.mP},Upload:function(){return r.gq}});var N=e(57213),m=e.n(N),h=e(93236),g=e(48653),D=e(97855),F=function(t){localStorage.setItem("formily-schema",JSON.stringify((0,g.Q)(t.getCurrentTree()))),D.ZP.success("Save Success")},R=function(t){try{t.setCurrentTree((0,g.I)(JSON.parse(localStorage.getItem("formily-schema"))))}catch(s){}},A=e(18906),P=e(29683),l=e(59622),a=e(29688),L=e(76338),S=e(17628),O=e(76746),n=e(62086),Z=(0,P.Pi)(function(){var c=(0,a.et)();(0,h.useEffect)(function(){R(c)},[]);var t=["zh-cn","en-us","ko-kr"];return(0,h.useEffect)(function(){t.includes(l.lU.getDesignerLanguage())||l.lU.setDesignerLanguage("zh-cn")},[]),(0,n.jsxs)(L.Z,{style:{marginRight:10},children:[(0,n.jsx)(S.ZP,{href:"https://designable-fusion.formilyjs.org",children:"Alibaba Fusion"}),(0,n.jsx)(O.ZP.Group,{value:l.lU.getDesignerLanguage(),optionType:"button",options:[{label:"English",value:"en-us"},{label:"\u7B80\u4F53\u4E2D\u6587",value:"zh-cn"},{label:"\uD55C\uAD6D\uC5B4",value:"ko-kr"}],onChange:function(i){l.lU.setDesignerLanguage(i.target.value)}}),(0,n.jsxs)(S.ZP,{href:"https://github.com/pindjs/designable",target:"_blank",children:[(0,n.jsx)(A.Z,{}),"Github"]}),(0,n.jsx)(S.ZP,{onClick:function(){F(c)},children:(0,n.jsx)(a.yE,{children:"Save"})}),(0,n.jsx)(S.ZP,{type:"primary",onClick:function(){F(c)},children:(0,n.jsx)(a.yE,{children:"Publish"})})]})}),U={dark:"//img.alicdn.com/imgextra/i2/O1CN01NTUDi81fHLQvZCPnc_!!6000000003981-55-tps-1141-150.svg",light:"//img.alicdn.com/imgextra/i2/O1CN01Kq3OHU1fph6LGqjIz_!!6000000004056-55-tps-1141-150.svg"},M=function(){var t=U[(0,a.Fg)()];return(0,n.jsx)("div",{style:{display:"flex",alignItems:"center",fontSize:14},children:(0,n.jsx)("img",{src:t,style:{margin:"12px 8px",height:18,width:"auto"}})})},b=e(87205),j=e(52405),W=function(t){var s=function(o){if(!o)return"";var v=m()({},o.props);return o.depth!==0&&(v.name=o.props.name||o.id),"".concat(Object.keys(v).map(function(d){if(d==="x-designable-id"||d==="x-designable-source-name"||d==="_isJSONSchemaObject"||d==="version"||d==="type")return"";var x=v[d];return(0,b.Uk)(x)&&(0,b.xb)(x)?"":typeof x=="string"?"".concat(d,'="').concat(x,'"'):"".concat(d,"={").concat(JSON.stringify(x),"}")}).join(" "))},i=function(o){return o?o.children.map(function(v){return p(v)}).join(""):""},u=function(o){return o.props.type==="string"?"SchemaField.String":o.props.type==="number"?"SchemaField.Number":o.props.type==="boolean"?"SchemaField.Boolean":o.props.type==="date"?"SchemaField.Date":o.props.type==="datetime"?"SchemaField.DateTime":o.props.type==="array"?"SchemaField.Array":o.props.type==="object"?"SchemaField.Object":o.props.type==="void"?"SchemaField.Void":"SchemaField.Markup"},p=function(o){return o?"<".concat(u(o)," ").concat(s(o)," ").concat(o.children.length?">".concat(i(o),"</").concat(u(o),">"):"/>"):""},y=t.find(function(f){return f.componentName==="Form"||f.componentName==="Root"});return`import React, { useMemo } from 'react'
import { createForm } from '@formily/core'
import { createSchemaField } from '@formily/react'
import {
  Form,
  FormItem,
  DatePicker,
  Checkbox,
  Cascader,
  Editable,
  Input,
  NumberPicker,
  Switch,
  Password,
  PreviewText,
  Radio,
  Reset,
  Select,
  Space,
  Submit,
  TimePicker,
  Transfer,
  TreeSelect,
  Upload,
  FormGrid,
  FormLayout,
  FormTab,
  FormCollapse,
  ArrayTable,
  ArrayCards,
} from '@formily/antd-v5'
import { Card, Slider, Rate } from 'antd'

const Text: React.FC<{
  value?: string
  content?: string
  mode?: 'normal' | 'h1' | 'h2' | 'h3' | 'p'
}> = ({ value, mode, content, ...props }) => {
  const tagName = mode === 'normal' || !mode ? 'div' : mode
  return React.createElement(tagName, props, value || content)
}

const SchemaField = createSchemaField({
  components: {
    Space,
    FormGrid,
    FormLayout,
    FormTab,
    FormCollapse,
    ArrayTable,
    ArrayCards,
    FormItem,
    DatePicker,
    Checkbox,
    Cascader,
    Editable,
    Input,
    Text,
    NumberPicker,
    Switch,
    Password,
    PreviewText,
    Radio,
    Reset,
    Select,
    Submit,
    TimePicker,
    Transfer,
    TreeSelect,
    Upload,
    Card,
    Slider,
    Rate,
  },
})

export default ()=>{
  const form = useMemo(() => createForm(), [])

  return <Form form={form} `.concat(s(y),`>
    <SchemaField>
      `).concat(i(y),`
    </SchemaField>
  </Form>
}
  
`)},G=function(t){return(0,n.jsx)(j.kI,m()(m()({},t),{},{options:{readOnly:!0},value:W(t.tree),language:"typescript"}))},J=e(11998),B=e(12342),z=e.n(B),r=e(33900),V=e(17123),k=e(81919),K=e(41593),Q=["value","mode","content"],Y=function(t){var s=t.value,i=t.mode,u=t.content,p=z()(t,Q),y=i==="normal"||!i?"div":i;return h.createElement(y,p,s||u)},I=e(67198),H=I.Z.ErrorBoundary,X=(0,P.cA)({components:C}),$=function(t){var s=(0,h.useMemo)(function(){return(0,J.Np)()},[]),i=(0,g.Q)(t.tree),u=i.form,p=i.schema;return(0,n.jsx)(H,{children:(0,n.jsx)(r.l0,m()(m()({},u),{},{form:s,children:(0,n.jsx)(X,{schema:p})}))})},w=function(t){return(0,n.jsx)(j.kI,m()(m()({},t),{},{value:JSON.stringify((0,g.Q)(t.tree),null,2),onChange:function(i){var u;(u=t.onChange)===null||u===void 0||u.call(t,(0,g.I)(JSON.parse(i)))},language:"json"}))},E=e(3185);(0,j.GJ)("//unpkg.com");var q=I.Z.ErrorBoundary;l.lU.registerDesignerLocales({"zh-CN":{sources:{Inputs:"\u8F93\u5165\u63A7\u4EF6",Layouts:"\u5E03\u5C40\u7EC4\u4EF6",Arrays:"\u81EA\u589E\u7EC4\u4EF6",Displays:"\u5C55\u793A\u7EC4\u4EF6"}},"en-US":{sources:{Inputs:"Inputs",Layouts:"Layouts",Arrays:"Arrays",Displays:"Displays"}},"ko-KR":{sources:{Inputs:"\uC785\uB825",Layouts:"\uB808\uC774\uC544\uC6C3",Arrays:"\uBC30\uC5F4",Displays:"\uB514\uC2A4\uD50C\uB808\uC774"}}});var _=function(){var t=(0,h.useMemo)(function(){return(0,l.vP)({shortcuts:[new l.z9({codes:[[l.VD.Meta,l.VD.S],[l.VD.Control,l.VD.S]],handler:function(i){F(i.engine)}})],rootComponentName:"Form"})},[]);return(0,n.jsx)(a.lg,{engine:t,children:(0,n.jsxs)(a.ZE,{logo:(0,n.jsx)(M,{}),actions:(0,n.jsx)(Z,{}),children:[(0,n.jsxs)(a.qi,{children:[(0,n.jsx)(a.qi.Item,{title:"panels.Component",icon:"Component",children:(0,n.jsx)(a.kv,{sources:Object.values(m()({},E.YI))})}),(0,n.jsx)(a.qi.Item,{title:"panels.OutlinedTree",icon:"Outline",children:(0,n.jsx)(a.Ri,{})}),(0,n.jsx)(a.qi.Item,{title:"panels.History",icon:"History",children:(0,n.jsx)(a.Je,{})})]}),(0,n.jsx)(a.j$,{id:"form",children:(0,n.jsx)(a.qs,{children:(0,n.jsxs)(q,{children:[(0,n.jsxs)(a.T0,{children:[(0,n.jsx)(a.hL,{}),(0,n.jsx)(a.cl,{use:["DESIGNABLE","JSONTREE","MARKUP","PREVIEW"]})]}),(0,n.jsxs)(a.Im,{style:{height:"100%"},children:[(0,n.jsx)(a.Rf,{type:"DESIGNABLE",children:function(){return(0,n.jsx)(a.wY,{components:m()({},E.YI)})}}),(0,n.jsx)(a.Rf,{type:"JSONTREE",scrollable:!1,children:function(i,u){return(0,n.jsx)(w,{tree:i,onChange:u})}}),(0,n.jsx)(a.Rf,{type:"MARKUP",scrollable:!1,children:function(i){return(0,n.jsx)(G,{tree:i})}}),(0,n.jsx)(a.Rf,{type:"PREVIEW",children:function(i){return(0,n.jsx)($,{tree:i})}})]})]})})}),(0,n.jsx)(a.fQ,{title:"panels.PropertySettings",children:(0,n.jsx)(j.lB,{uploadAction:"https://www.mocky.io/v2/5cc8019d300000980a055e76"})})]})})},nn=_,en=e(95442),rn=function(){return(0,n.jsx)(en.Z,{children:(0,n.jsx)(nn,{})})}}}]);
