import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {APIConfig,CharacterProfile,UserProfile} from '../../types';
import {generateCallFrame,hasCallVisualChange,canAutoCallFrame,CALL_AUTO_FRAME_LIMIT,type CallFrameBubble} from '../../utils/callImageFrames';
import {saveNaiImageToAlbum} from '../../utils/naiService';
import {useLocalBackHandler} from '../../hooks/useLocalBackHandler';
import './callImageControls.css';
export interface CallImageControlsProps {char:CharacterProfile;user:UserProfile;api:APIConfig;bubbles:CallFrameBubble[];hasFrame:boolean;onFrame:(url:string)=>void;onRestore:()=>void}
export default function CallImageControls(props:CallImageControlsProps){
 const [busy,setBusy]=useState(false),[settings,setSettings]=useState(false),[automatic,setAutomatic]=useState(false),[interval,setIntervalMinutes]=useState(5),[extra,setExtra]=useState(''),[direct,setDirect]=useState(false),[notice,setNotice]=useState(''),[count,setCount]=useState(0);
 const previousScene=useRef('');
 const alive=useRef(true),inFlight=useRef(false),controller=useRef<AbortController|null>(null),urls=useRef<string[]>([]),generation=useRef(0),lastSeen=useRef(''),lastAttempt=useRef(Date.now()),baseTurn=useRef(0),autoCount=useRef(0),dialog=useRef<HTMLDivElement>(null),current=useRef(props);current.current=props;
 const turns=props.bubbles.filter(b=>b.role==='assistant').length;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;controller.current?.abort();urls.current.forEach(url=>URL.revokeObjectURL(url));};},[]);
 useLocalBackHandler(()=>{setSettings(false);return true;},60,settings);
 useEffect(()=>{if(!settings)return;const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();return()=>previous?.focus();},[settings]);
 const run=async(kind:'manual'|'auto')=>{
  if(inFlight.current)return;
  inFlight.current=true;const ticket=++generation.current,abort=new AbortController();controller.current=abort;setBusy(true);setNotice('正在整理并生成，上一张画面继续显示…');lastAttempt.current=Date.now();baseTurn.current=turns;
  const active=()=>alive.current&&ticket===generation.current&&!abort.signal.aborted;
  try{
   const image=await generateCallFrame({char:props.char,user:props.user,api:props.api,bubbles:props.bubbles,extra,direct,signal:abort.signal,previous:previousScene.current});if(!active())return;
   const url=URL.createObjectURL(image.blob);urls.current.push(url);
   await new Promise<void>((resolve,reject)=>{const preview=new Image();preview.onload=()=>resolve();preview.onerror=()=>reject(new Error('返回图片无法显示，原画面已保留'));preview.src=url;});if(!active())return;
   await saveNaiImageToAlbum(image,props.char.id);if(!active())return;
   previousScene.current=image.request?.input||'';current.current.onFrame(url);setNotice('画面已更新，并保存到当前角色相册');
   // The new URL is already decoded; keep the old one through React's next paint.
   const old=urls.current.filter(value=>value!==url);urls.current=[url];window.setTimeout(()=>old.forEach(value=>URL.revokeObjectURL(value)),1000);
   if(kind==='auto'&&autoCount.current>=CALL_AUTO_FRAME_LIMIT){setAutomatic(false);setNotice('本通自动更新已达 5 次，已暂停；仍可手动更新');}
  }catch(error){if(!alive.current)return;setAutomatic(false);setNotice(abort.signal.aborted?'已取消等待，原画面保留；已发出的请求可能仍计费':(error instanceof Error?error.message:'画面更新失败')+'；原画面保留，未自动重试');}
  finally{if(alive.current&&ticket===generation.current){inFlight.current=false;setBusy(false);controller.current=null;}}
 };
 useEffect(()=>{
  if(!automatic||direct||busy||document.visibilityState!=='visible')return;
  const last=props.bubbles[props.bubbles.length-1];
  if(!last||last.role!=='assistant'||last.id===lastSeen.current)return;
  lastSeen.current=last.id;
  if(!canAutoCallFrame({turns:turns-baseTurn.current,elapsedMs:Date.now()-lastAttempt.current,intervalMinutes:interval,count:autoCount.current,changed:hasCallVisualChange(last.text)}))return;
  autoCount.current++;setCount(autoCount.current);void run('auto');
 },[props.bubbles,automatic,direct,busy,interval]);
 const toggleAuto=(enabled:boolean)=>{if(enabled&&autoCount.current>=CALL_AUTO_FRAME_LIMIT){setNotice('本通自动尝试已达 5 次；请使用手动更新');return;}setAutomatic(enabled);if(enabled){baseTurn.current=turns;lastAttempt.current=Date.now();lastSeen.current=props.bubbles[props.bubbles.length-1]?.id||'';setNotice('自动已开启：至少 3 个新回复且间隔 '+interval+' 分钟，有画面变化才尝试');}};
 return <section className="call-image-controls" aria-label="视频生图控制"><div className="call-image-row"><button disabled={busy} onClick={()=>void run('manual')}>{busy?'更新中…':'更新画面'}</button><button onClick={()=>setSettings(true)}>镜头设置{automatic?' · 自动':''}</button>{props.hasFrame&&<button disabled={busy} onClick={()=>{current.current.onRestore();previousScene.current='';setAutomatic(false);setNotice('已恢复原模型／立绘，自动更新已关闭');}}>恢复原画面</button>}{busy&&<button onClick={()=>{setAutomatic(false);controller.current?.abort();}}>取消等待</button>}</div>{notice&&<p role="status">{notice}</p>}
 {settings&&createPortal(<div className="call-image-shade" onClick={()=>setSettings(false)}><div ref={dialog} className="call-image-sheet" role="dialog" aria-modal="true" aria-label="视频镜头生图设置" tabIndex={-1} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setSettings(false);}if(e.key==='Tab'){const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')||[]),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}><header><h3>视频镜头 · 生图</h3><button onClick={()=>setSettings(false)}>完成</button></header><div className="call-image-fields"><p>使用现有 NAI／GPT 生图服务及该角色的固定外貌、画师和参考设置。先到聊天 + → 生图 → 连接设置／角色外观配置。</p><label className="call-image-check"><input type="checkbox" disabled={busy||direct} checked={automatic} onChange={e=>toggleAuto(e.target.checked)}/>本次通话低频自动更新</label><label>最短自动间隔<select aria-label="自动画面间隔" disabled={busy} value={interval} onChange={e=>setIntervalMinutes(Number(e.target.value))}><option value={3}>3 分钟</option><option value={5}>5 分钟</option><option value={10}>10 分钟</option></select></label><p>还需至少 3 个新角色回复，并出现明确换地点、换衣等文字线索。每通最多自动尝试 5 次；失败即暂停，不挂机定时生图。已尝试 {count}／5 次。</p><label className="call-image-check"><input type="checkbox" disabled={busy} checked={direct} onChange={e=>{setDirect(e.target.checked);setAutomatic(false);}}/>直接使用英文提示词（仅手动，跳过整理）</label><label>{direct?'英文画面提示词':'画面补充要求（可留空）'}<textarea aria-label="镜头提示词" disabled={busy} rows={3} maxLength={2000} value={extra} onChange={e=>setExtra(e.target.value)} placeholder={direct?'solo, upper body, looking at viewer, warm light':'例如：保留深色衬衫，竖屏半身镜头'}/></label><p>整理模式通常每次调用一次文本 API＋一次生图 API；直接提示词只调用生图。可能收费。生成期间保持页面打开，取消不能保证服务端停止计费。</p><p>只读取本次通话最近的文字，不上传用户摄像头。成功图片保存该角色相册；画面只用于本通视频，不改陪伴桌面。自动开关每通默认关闭。</p></div></div></div>,document.body)}
 </section>;
}
