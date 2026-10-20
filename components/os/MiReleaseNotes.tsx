import React from 'react';
import Modal from './Modal';
import {APP_VERSION,BUILD_LABEL,BUILD_TIME_LABEL} from '../../utils/buildInfo';
import {MI_RELEASE_ID,MI_RELEASE_ITEMS,MI_RELEASE_TITLE} from '../../utils/miRelease';
import {useOS} from '../../context/OSContext';
import {AppID} from '../../types';
export default function MiReleaseNotes({onClose,onNavigate}:{onClose:()=>void;onNavigate?:()=>void}){
 const {openApp}=useOS();
 return <Modal isOpen title="二改更新公告" onClose={onClose}><div style={{fontFamily:'system-ui',color:'#514c43',fontSize:13,lineHeight:1.8}}>
  <p style={{fontSize:11,color:'#a18450',letterSpacing:2}}>当前页面运行版本 · {MI_RELEASE_ID}</p><h3 style={{fontSize:20,fontWeight:600,margin:'6px 0 14px'}}>{MI_RELEASE_TITLE}</h3>
  <div style={{background:'#f4f0e8',borderRadius:14,padding:14,overflowWrap:'anywhere',fontSize:12}}><strong>{APP_VERSION}</strong><p>构建：{BUILD_LABEL}<br/>构建时间：{BUILD_TIME_LABEL}</p></div>
  {MI_RELEASE_ITEMS.map(([title,body])=><section key={title} style={{margin:'18px 0'}}><strong>{title}</strong><p style={{color:'#8b8375',marginTop:5}}>{body}</p></section>)}
  <p style={{fontSize:11,color:'#a1988a'}}>这表示你当前实际加载的页面版本，不代表远程没有更新。若预期版本未出现，请到设置中“检查网页更新”，按提示刷新；不需要清除站点数据。</p>
  <button onClick={()=>{openApp(AppID.Songwriting);(onNavigate||onClose)();}} style={{width:'100%',padding:12,borderRadius:12,background:'#8e7550',color:'white',marginTop:14}}>打开拾集</button>
  <button onClick={onClose} style={{width:'100%',padding:12,borderRadius:12,background:'#f4f0e8',marginTop:8}}>知道了</button>
 </div></Modal>;
}
