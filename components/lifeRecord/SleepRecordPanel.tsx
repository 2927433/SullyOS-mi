import React, { useMemo, useRef, useState } from 'react';
import type { LifeRecord } from '../../types';
import { useOS } from '../../context/OSContext';
import { readSleepFile, sleepPayload, sleepDate, sleepSummary, type SleepPayload } from '../../utils/sleepRecords';
import { storeSleepRecords } from '../../utils/sleepImport';
import { shareOrDownloadBlob } from '../../utils/shareExport';

export default function SleepRecordPanel({records,onReload,onRemove}:{records:LifeRecord[];onReload:()=>Promise<void>;onRemove:(record:LifeRecord)=>Promise<void>}) {
 const {characters}=useOS();const [start,setStart]=useState(''),[end,setEnd]=useState(''),[note,setNote]=useState('');
 const [preview,setPreview]=useState<SleepPayload[]>([]),[source,setSource]=useState(''),[from,setFrom]=useState(''),[until,setUntil]=useState(''),[charId,setCharId]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');const input=useRef<HTMLInputElement>(null);
 const entries=records.filter(r=>r.module==='sleep' && r.reviewStatus!=='rejected').sort((a,b)=>b.date.localeCompare(a.date)||b.timestamp-a.timestamp);
 const sources=[...new Set(preview.map(p=>p.source))];
 const filtered=useMemo(()=>preview.filter(p=>(!source || p.source===source)&&(!from || sleepDate(p)>=from)&&(!until || sleepDate(p)<=until)),[preview,source,from,until]);
 const eligible=characters.filter(c=>c.lifeRecordEnabled && c.lifeRecordSleepEnabled===true);
 const action=async(task:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await task();}catch(e){setError(e instanceof Error?e.message:'睡眠记录操作失败');}finally{setBusy(false);}};
 const save=async(items:SleepPayload[])=>{
  const char=charId?characters.find(c=>c.id===charId):undefined;if(charId&&!char)throw new Error('请选择有效角色');
  try{const result=await storeSleepRecords(items,char);setNotice(`已保存 ${result.added} 条，跳过 ${result.duplicates} 条重复记录。${char?'请到与该角色的聊天中确认或否决卡片。':''}`);}finally{await onReload();}
 };
 const inputClass='w-full min-w-0 rounded-xl border border-violet-200 bg-white p-2 text-sm';
 return <section className="space-y-4 text-sm" style={{color:'#514576'}}>
 <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3"><h3 className="font-bold">睡眠记录</h3><p className="text-xs leading-relaxed">保存已完成的睡眠，按醒来日期归档。Apple 健康数据需先导出文件；当前网页不会直接读取手表。</p>
 <label className="block">归档方式<select className={inputClass} disabled={busy} value={charId} onChange={e=>setCharId(e.target.value)}><option value="">我自己记录</option>{eligible.map(c=><option key={c.id} value={c.id}>让 {c.name} 代记（生成确认卡片）</option>)}</select></label>
 <p className="text-xs">让角色了解睡眠：在角色设置 → 生活记录，开启总开关及“睡眠记录”。它读取已导入摘要，不代表实时监测；关闭睡眠开关即可停止后续注入。</p>
 <label className="block">入睡时间<input className={inputClass} type="datetime-local" disabled={busy} value={start} onChange={e=>setStart(e.target.value)} /></label><label className="block">醒来时间<input className={inputClass} type="datetime-local" disabled={busy} value={end} onChange={e=>setEnd(e.target.value)} /></label><label className="block">睡眠备注<input className={inputClass} disabled={busy} value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} /></label>
 <button className="rounded-xl bg-violet-700 text-white p-2 disabled:opacity-50" disabled={busy||!start||!end} onClick={()=>void action(()=>save([sleepPayload(start,end,note)]))}>保存睡眠记录</button>
 </div>
 <div className="rounded-2xl border border-violet-200 bg-white p-4 space-y-3"><h3 className="font-bold">导入睡眠文件</h3><p className="text-xs leading-relaxed">支持 Apple 健康 export.xml、睡眠 JSON 和 CSV。健康导出 ZIP 请先解压，选择 export.xml。文件仅在本机解析，未确认前不写入记录。</p>
 <button className="rounded-xl border border-violet-300 p-2" disabled={busy} onClick={()=>input.current?.click()}>选择睡眠文件</button>
 <input hidden ref={input} type="file" accept=".xml,.csv,.json" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void action(async()=>{setPreview([]);const items=await readSleepFile(file);setPreview(items);setSource([...new Set(items.map(p=>p.source))].length===1?items[0].source:'');setFrom('');setUntil('');setNotice('已读取文件，请选择数据来源、日期范围并确认导入。');});}} />
 {!!preview.length && <><label className="block">睡眠数据来源<select className={inputClass} disabled={busy} value={source} onChange={e=>setSource(e.target.value)}><option value="">请选择一个来源，避免设备重复统计</option>{sources.map(s=><option key={s}>{s}</option>)}</select></label><label className="block">导入开始日期<input className={inputClass} disabled={busy} type="date" value={from} onChange={e=>setFrom(e.target.value)} /></label><label className="block">导入结束日期<input className={inputClass} disabled={busy} type="date" value={until} onChange={e=>setUntil(e.target.value)} /></label>
 <p>预览 {filtered.length} 条{from&&until&&from>until?'（日期范围无效）':''}</p>{filtered.slice(0,5).map((p,i)=><p className="text-xs" key={i}>{sleepDate(p)} · {sleepSummary(p)}</p>)}
 <button className="rounded-xl bg-violet-700 text-white p-2 disabled:opacity-50" disabled={busy||!source||!filtered.length} onClick={()=>void action(async()=>{await save(filtered);setPreview([]);})}>确认导入睡眠记录</button></>}
 <details><summary>JSON / CSV 格式示例</summary><pre className="whitespace-pre-wrap break-all text-xs p-2">{'[{"start":"2026-10-15T23:30:00+08:00","end":"2026-10-16T07:30:00+08:00","note":"睡得不错","source":"Apple Watch"}]\nCSV 表头：start,end,note,source\n可选分钟数：durationMinutes,coreMinutes,deepMinutes,remMinutes,awakeMinutes'}</pre><p className="text-xs">快捷指令可将健康睡眠数据导出为上述文件，再到这里导入；这不是自动同步。</p></details>
 </div>
 {busy && <p role="status">正在处理睡眠记录…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status">{notice}</p>}
 <div className="rounded-2xl border border-violet-200 bg-white p-4 space-y-3"><h3 className="font-bold">已记录的睡眠 · {entries.length} 条</h3><button className="rounded-xl border border-violet-300 p-2" disabled={busy||!entries.length} onClick={()=>void action(async()=>{await shareOrDownloadBlob({blob:new Blob([JSON.stringify({records:entries.map(r=>r.payload)},null,2)],{type:'application/json'}),fileName:'SullyOS-sleep-records.json',preferDownloadOnWeb:true});})}>导出睡眠记录</button>
 {!entries.length && <p className="text-xs">还没有记录。可以手动填写、导入文件，或在聊天中告诉角色明确的入睡和醒来时间。</p>}
 {entries.slice(0,60).map(record=><div className="border-t border-violet-100 pt-3 space-y-1" key={record.id}><strong>{record.date}</strong><p>{sleepSummary(record.payload)}</p><p className="text-xs">{record.payload.source}{record.recordedBy!=='user'?` · ${record.recordedByName || '角色'}代记` : ''}{record.reviewStatus==='active'?' · 待确认':''}</p>{(['coreMinutes','deepMinutes','remMinutes','awakeMinutes'] as const).some(k=>record.payload[k]!==undefined)&&<p className="text-xs">{(['coreMinutes','deepMinutes','remMinutes','awakeMinutes'] as const).filter(k=>record.payload[k]!==undefined).map(k=>`${({coreMinutes:'核心',deepMinutes:'深睡',remMinutes:'REM',awakeMinutes:'清醒'})[k]} ${record.payload[k]} 分钟`).join(' · ')}</p>}{record.payload.note && <p className="text-xs">{record.payload.note}</p>}<button className="text-xs underline" disabled={busy} onClick={()=>{if(window.confirm('删除这条睡眠记录？'))void action(()=>onRemove(record));}}>删除睡眠记录</button></div>)}{entries.length>60 && <p className="text-xs">显示最近 60 条；导出文件包含全部记录。</p>}
 </div></section>;
}
