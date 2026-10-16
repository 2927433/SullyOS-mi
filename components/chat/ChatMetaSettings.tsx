import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocalBackHandler} from '../../hooks/useLocalBackHandler';
import {normalizeChatMeta,type ChatMetaConfig} from '../../utils/chatMeta';
export default function ChatMetaSettings({value,characterName,onSave,onClose}:{value?:ChatMetaConfig;characterName:string;onSave:(next:ChatMetaConfig)=>void;onClose:()=>void}){
 const [draft,setDraft]=useState(()=>normalizeChatMeta(value));
 const dialog=useRef<HTMLDivElement>(null);
 useLocalBackHandler(()=>{onClose();return true;},60);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();return()=>previous?.focus();},[]);
 return createPortal(<div className="fixed inset-0 z-[250] bg-black/35 flex items-end sm:items-center justify-center" onClick={onClose} style={{paddingBottom:'env(safe-area-inset-bottom)'}}>
  <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="chat-meta-title" tabIndex={-1} className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white text-slate-800 p-6 shadow-xl overflow-y-auto max-h-[85dvh]" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'){const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button,input:not(:disabled)')||[]);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
   <div className="text-xs tracking-widest text-indigo-400">BEYOND THE SCREEN</div><h2 id="chat-meta-title" className="text-xl font-bold mt-2">meta · 第四面墙</h2>
   <p className="text-sm text-slate-500 mt-3 leading-relaxed">偶尔有一句话，像是越过了故事，直接说给屏幕前的你。只影响 {characterName}，原有世界观与日常继续。</p>
   <label className="flex items-center justify-between gap-4 mt-6 min-h-11 font-bold">启用 meta<input aria-label="启用 meta" type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})} className="w-6 h-6 accent-indigo-500"/></label>
   <label className="block mt-6 text-sm font-bold" htmlFor="chat-meta-chance">meta 浓度 · {draft.probability}%</label>
   <input id="chat-meta-chance" aria-label="meta 触发概率" type="range" min="0.5" max="5" step="0.5" value={draft.probability} onChange={e=>setDraft({...draft,probability:Number(e.target.value)})} className="w-full my-3 accent-indigo-500 min-h-11"/>
   <div className="flex justify-between text-xs text-slate-400"><span>极轻 · 0.5%</span><span>偶现 · 5%</span></div>
   <p className="mt-5 rounded-2xl bg-indigo-50 p-4 text-sm leading-relaxed text-slate-600">每个新用户回合抽签一次，默认 2%，不保证聊够多少轮就出现。抽中后至少间隔 12 个新回合；同回合重新生成不重抽。抽中也只是一次创作机会，语境不适合时可以不说。</p>
   <p className="mt-4 text-xs text-slate-500 leading-relaxed">效果是短暂意识到自身虚拟身份、想触及故事外的你，最多一句，随后自然回到当前话题。沿用聊天模型与双语设置，不额外调用 API。目前用于小手机私聊的新回复。</p>
   <div className="flex gap-3 mt-6"><button className="flex-1 min-h-11 rounded-2xl bg-slate-100 font-bold" onClick={onClose}>取消</button><button className="flex-1 min-h-11 rounded-2xl bg-indigo-500 text-white font-bold" onClick={()=>onSave(draft)}>保存</button></div>
  </div>
 </div>,document.body);
}
