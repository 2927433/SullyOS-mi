import React, { useRef, useState } from 'react';
import { type NaiState, type NaiVibeGroup } from '../../utils/nai';
import { applyNaiVibeGroup, exportNaiVibeGroups, importNaiVibeGroups } from '../../utils/naiVibeGroups';
import { shareOrDownloadBlob } from '../../utils/shareExport';
import NaiReferencePanel from './NaiReferencePanel';

export default function NaiVibeGroups({state,charId,disabled,onChange,onError}: {state:NaiState;charId:string;disabled:boolean;onChange:(state:NaiState)=>void;onError:(message:string)=>void}) {
 const [category,setCategory]=useState('');
 const [editing,setEditing]=useState<NaiVibeGroup>({id:'',name:'',category:'',references:[]});
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const input=useRef<HTMLInputElement>(null);
 const groups=state.vibeGroups || [];
 const busy=disabled || working;
 const run=async(task:()=>Promise<void>)=>{setWorking(true);try{await task();}catch(e){onError(e instanceof Error?e.message:'Vibe 操作失败');}finally{setWorking(false);}};
 return <><section className="nai-card"><h3>Vibe 组合资料库</h3>
 <p className="nai-note">按分类保存，每组 1–4 个参考。导入后可编辑名称、分类和强度，应用到角色后仍需保存顶部设置。应用组合会替换该角色当前参考列表，不影响其他角色。</p>
 <label>Vibe 分类<select value={category} disabled={busy} onChange={e=>setCategory(e.target.value)}><option value="">全部分类</option>{[...new Set(groups.map(g=>g.category || '未分类'))].map(c=><option key={c}>{c}</option>)}</select></label>
 <div className="nai-row"><button disabled={busy} onClick={()=>setEditing({id:'',name:'',category:category || '',references:[]})}>新建 Vibe 组合</button><button disabled={busy} onClick={()=>input.current?.click()}>导入 Vibe / 组合包</button><button disabled={busy || !groups.length} onClick={()=>void run(async()=>{await shareOrDownloadBlob({blob:new Blob([await exportNaiVibeGroups(category ? groups.filter(g=>(g.category || '未分类')===category) : groups)],{type:'application/json'}),fileName:'SullyOS-Vibe-groups.json',preferDownloadOnWeb:true});})}>导出当前分类</button></div>
 <input hidden ref={input} type="file" accept=".json,.naiv4vibe,.naiv4vibebundle,application/json" multiple onChange={e=>{const files=Array.from(e.target.files || []);e.target.value='';void run(async()=>{const added:NaiVibeGroup[]=[];for(const file of files) added.push(...await importNaiVibeGroups(await file.text(),category));onChange({...state,vibeGroups:[...groups,...added]});setNotice('已导入 '+added.length+' 个组合，请点顶部保存设置。');});}} />
 {notice && <p role="status" className="nai-note">{notice}</p>}
 {groups.filter(g=>!category || (g.category || '未分类')===category).map(group=><div key={group.id} className="nai-reference"><strong>{group.category || '未分类'} / {group.name}</strong><span>{group.references.length} 个 Vibe</span><div className="nai-row"><button disabled={busy} onClick={()=>setEditing(structuredClone(group))}>编辑组合</button><button disabled={busy} onClick={()=>{onChange(applyNaiVibeGroup(state,charId,group));setNotice('已应用到'+(charId?'当前角色':'独立生图')+'，请点顶部保存设置。');}}>应用组合</button><button disabled={busy} onClick={()=>void run(async()=>{await shareOrDownloadBlob({blob:new Blob([await exportNaiVibeGroups([group])],{type:'application/json'}),fileName:'SullyOS-Vibe-group.json',preferDownloadOnWeb:true});})}>导出组合</button><button disabled={busy} onClick={()=>{if(!window.confirm('删除这个 Vibe 组合？已应用到角色的参考不受影响。'))return;onChange({...state,vibeGroups:groups.filter(g=>g.id!==group.id)});if(editing.id===group.id)setEditing({id:'',name:'',category:'',references:[]});}}>删除组合</button></div></div>)}
 </section><section className="nai-card"><h3>Vibe 组合编辑</h3><label>Vibe 组合名称<input disabled={busy} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} /></label><label>Vibe 组合分类<input disabled={busy} value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})} placeholder="例如柔光、厚涂、角色风格" /></label>
 <div className="nai-row"><button disabled={busy} onClick={()=>{const owner=charId?state.characters[charId]:state;const refs=owner?.references || [];if(!refs.length || refs.length>4){onError('当前参考列表需有 1–4 个参考，才能存为组合');return;}setEditing({...editing,references:structuredClone(refs)});}}>读取当前参考列表</button><button disabled={busy || !editing.name.trim()} onClick={()=>{if(!editing.references.length || editing.references.length>4){onError('每个 Vibe 组合需包含 1–4 个参考');return;}const group={...editing,name:editing.name.trim(),id:editing.id || crypto.randomUUID()};onChange({...state,vibeGroups:[...groups.filter(g=>g.id!==group.id),structuredClone(group)]});setEditing(group);setNotice('组合已加入资料库，请点顶部保存设置。');}}>保存 Vibe 组合</button></div></section>
 <NaiReferencePanel state={{...state,vibeGroups:[],references:editing.references,referenceMode:'vibe'}} charId="" disabled={busy} onChange={next=>setEditing({...editing,references:next.references || []})} onError={onError} vibeOnly />
 </>;
}
