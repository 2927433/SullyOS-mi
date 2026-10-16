import {getSoloDiaryGuide} from '../../utils/soloDiaryGuide';
import {DIARY_LANGUAGES,diaryTranslationLanguage} from '../../utils/soloDiaryLanguage';
import {readDiaryRuntimeStatus,SOLO_DIARY_STATUS,SOLO_DIARY_CHECK} from '../../utils/soloDiaryAutomation';
import SoloDiaryLibrary from './SoloDiaryLibrary';
import {DB} from '../../utils/db';
import {getScheduleDateKey} from '../../utils/scheduleTime';
import {soloDiaryKey} from '../../utils/soloDiary';
import React,{useEffect,useState} from 'react';
import './soloDiary.css';
import {useOS} from '../../context/OSContext';
import type {CharacterProfile} from '../../types';
import {readSoloDiarySettings,saveSoloDiarySettings,readSoloDiaries,generateSoloDiary,translateSoloDiary,diaryDateAt,SOLO_DIARY_EVENT,type SoloDiaryEntry,type SoloDiaryRule} from '../../utils/soloDiary';
import Modal from '../os/Modal';

export default function SoloDiaryPanel({char}:{char:CharacterProfile}){
 const {apiConfig,apiPresets,userProfile,addToast}=useOS();
 const [open,setOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[settings,setSettings]=useState(readSoloDiarySettings),[entries,setEntries]=useState<SoloDiaryEntry[]>([]),[busy,setBusy]=useState(false),[models,setModels]=useState<string[]>([]),[loadingModels,setLoadingModels]=useState(false);
 const [runtime,setRuntime]=useState(()=>readDiaryRuntimeStatus(char.id));
 useEffect(()=>{const update=()=>setRuntime(readDiaryRuntimeStatus(char.id));window.addEventListener(SOLO_DIARY_STATUS,update);return()=>window.removeEventListener(SOLO_DIARY_STATUS,update);},[char.id]);
 const rule:SoloDiaryRule=settings.rules[char.id]||{enabled:false,endTime:'23:00',enabledAt:Date.now()};
 const refresh=()=>{void readSoloDiaries(char.id).then(list=>setEntries(Object.values(list).sort((a,b)=>b.date.localeCompare(a.date)))).catch(()=>addToast('角色日记读取失败','error'));};
 useEffect(()=>{refresh();window.addEventListener(SOLO_DIARY_EVENT,refresh);return()=>window.removeEventListener(SOLO_DIARY_EVENT,refresh);},[char.id]);
 const save=(next:typeof settings)=>setSettings(next);
 const effective=settings.api||apiConfig;
 const generate=async(date:string,retry=false)=>{setBusy(true);try{await generateSoloDiary(char,userProfile,apiConfig,date,retry);refresh();}catch(e){addToast(e instanceof Error?e.message:'生成失败','error');}finally{setBusy(false);}};
 return <section className="solo-diary-panel" style={{background:'#ffffffb3',border:'1px solid #e9deca',borderRadius:18,padding:16,marginBottom:20,color:'#554735'}}>
  <button onClick={()=>setOpen(v=>!v)} style={{fontWeight:700,width:'100%',textAlign:'left'}}>TA 的日记 · {char.name}　›</button>
  <p style={{fontSize:12,lineHeight:1.7,marginTop:8}}>日历查看 · 历史搜索 · 独立阅读</p>
  <p style={{fontSize:12,opacity:.6,marginTop:8}}>{entries.filter(e=>e.status==='done').length} 篇日记 · 点击上方打开日记本</p>
  <button onClick={()=>{setSettings(readSoloDiarySettings());setSettingsOpen(true);}} style={{fontSize:12,textDecoration:'underline',padding:'8px 0'}}>日记 API 与自动写作设置</button>
  {open&&<SoloDiaryLibrary characterName={char.name} entries={entries} today={getScheduleDateKey(char)} closingDate={diaryDateAt(char,rule.endTime)} busy={busy} onGenerate={generate} onTranslate={async date=>{setBusy(true);try{await translateSoloDiary(char.id,date,apiConfig);refresh();}catch{addToast('翻译未完成；未自动重试，原文保留','error');}finally{setBusy(false);}}} translationLanguage={diaryTranslationLanguage(settings.translationLanguage)} onClose={()=>setOpen(false)} onDelete={async date=>{await DB.mutateAsset(soloDiaryKey(char.id),raw=>{const all=JSON.parse(raw||'{}');all[date]={date,status:'deleted',startedAt:all[date]?.startedAt||Date.now()};return JSON.stringify(all);});refresh();}}/>}

  <div style={{fontSize:11,lineHeight:1.8,color:'#8b7c67',marginTop:8}}>{rule.enabled?('收尾 '+rule.endTime+'（角色当地） · '+(runtime?.message||'自动写作已开启，等待下一次检查')):'自动写作未开启'}{runtime&&rule.enabled&&<span> · 检查于 {new Date(runtime.checkedAt).toLocaleTimeString()}</span>}<button style={{display:'block',textDecoration:'underline'}} onClick={()=>window.dispatchEvent(new Event(SOLO_DIARY_CHECK))}>立即检查自动日记（到期才生成）</button></div>
  <Modal isOpen={settingsOpen} title="日记 · API 与自动写作" onClose={()=>{setSettings(readSoloDiarySettings());setSettingsOpen(false);}}><div className="solo-diary-settings" style={{display:'grid',gap:14,fontSize:13}}>
   <p>仅用于“TA 的日记”，原交换日记的 API 和流程保留。API 配置由所有角色的独立日记共用，日记内容按角色隔离。</p>
   <button onClick={()=>save({...settings,api:null})} style={{textAlign:'left',padding:10,border:'1px solid #ddd',borderRadius:10}}>跟随全局 API {settings.api?'':'✓'}</button>
   {apiPresets.map(preset=><button key={preset.id} onClick={()=>{setModels([]);save({...settings,api:{...preset.config}});}} style={{textAlign:'left',padding:10,border:'1px solid #ddd',borderRadius:10}}>{preset.name} · {preset.config.model}</button>)}
   <label><input type="checkbox" checked={!!settings.api} onChange={e=>save({...settings,api:e.target.checked?{...apiConfig}:null})}/> 使用独立 API（可选择预设后修改）</label>
   {settings.api&&<>{(['baseUrl','apiKey','model'] as const).map(key=><label key={key}>{({baseUrl:'API 地址（包含 /v1）',apiKey:'API Key',model:'模型 ID'})[key]}<input aria-label={'日记 '+key} type={key==='apiKey'?'password':'text'} value={settings.api![key]} onChange={e=>save({...settings,api:{...settings.api!,[key]:e.target.value}})} style={{display:'block',width:'100%',padding:10,border:'1px solid #ddd',borderRadius:10}}/></label>)}</>}
   <button disabled={loadingModels} onClick={async()=>{setLoadingModels(true);try{const r=await fetch(effective.baseUrl.replace(/\/+$/,'')+'/models',{headers:{Authorization:'Bearer '+effective.apiKey}});if(!r.ok)throw Error();const data=await r.json();setModels((data.data||[]).map((m:any)=>m.id).filter((id:any)=>typeof id==='string'));}catch{addToast('模型列表读取失败，可手动填写模型 ID','error');}finally{setLoadingModels(false);}}}>{loadingModels?'正在读取模型…':'读取可用模型（不生成内容）'}</button>
   {models.length>0&&<select aria-label="日记模型选择" value={effective.model} onChange={e=>save({...settings,api:{...effective,model:e.target.value}})}><option value={effective.model}>{effective.model}</option>{models.filter(m=>m!==effective.model).map(m=><option key={m}>{m}</option>)}</select>}
   <label>译文语言（原文仍跟随角色）<select aria-label="日记译文语言" value={diaryTranslationLanguage(settings.translationLanguage)} onChange={e=>save({...settings,translationLanguage:e.target.value})}>{Object.entries(DIARY_LANGUAGES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><p style={{fontSize:11}}>新日记一次请求同时生成原文和译文，阅读时切换，不会重复调用 API。旧日记可单独补译，原文不会重写。</p>
   <label>日记写作规范（可编辑）<textarea aria-label="日记写作规范" rows={12} maxLength={20000} value={rule.writingGuide??getSoloDiaryGuide(settings)} onChange={e=>save({...settings,rules:{...settings.rules,[char.id]:{...rule,writingGuide:e.target.value}}})} style={{display:'block',width:'100%',padding:12,border:'1px solid #ddd',borderRadius:12,fontSize:13,lineHeight:1.8,resize:'vertical'}}/></label><button onClick={()=>save({...settings,rules:{...settings.rules,[char.id]:{...rule,writingGuide:undefined}}})}>恢复内置写作规范</button><p style={{fontSize:11}}>规范按当前角色保存，用于以后生成的独立日记；已有文章保留。可调整生活与互动的比重，双语输出格式由程序保留。</p>
   <hr/><label><input type="checkbox" checked={rule.enabled} onChange={e=>save({...settings,rules:{...settings.rules,[char.id]:{...rule,enabled:e.target.checked,enabledAt:e.target.checked?Date.now():rule.enabledAt}}})}/> 为 {char.name} 每天自动写一篇</label>
   <label>一天收尾时间（角色当地时间）<input type="time" value={rule.endTime} onChange={e=>{if(e.target.value)save({...settings,rules:{...settings.rules,[char.id]:{...rule,endTime:e.target.value}}});}} style={{display:'block',padding:8}}/></label>
   <p style={{lineHeight:1.8,color:'#746957'}}>到点在后台安静写作，无需打开日记页面；每天一次，不弹聊天。默认关闭，开启后会调用所选 API，可能计费。网页被 iOS 冻结或关闭时不能准时执行，重新打开后补写最近一个收尾日，不批量补写旧日期。失败不自动重复请求。这里的收尾时间由你设置，不从聊天台词猜测角色是否已睡。</p>
   <button onClick={()=>{try{saveSoloDiarySettings(settings);setSettingsOpen(false);addToast('日记设置已保存','success');}catch{addToast('日记设置保存失败','error');}}} style={{padding:12,borderRadius:12,background:'#8c724f',color:'#fff'}}>保存设置</button>
  </div></Modal>
 </section>;
}
