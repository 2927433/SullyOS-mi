import type { LifeRecord } from '../types';
import { getLocalDateKey } from './localDate';
export interface SleepPayload { start: string; end: string; durationMinutes: number; note?: string; source: string; coreMinutes?: number; deepMinutes?: number; remMinutes?: number; awakeMinutes?: number }
const isoTime = (input: string): string => {
 const text=String(input).trim().replace(/ (\d\d:\d\d:\d\d) ([+-]\d\d)(\d\d)$/, 'T$1$2:$3');
 // Explicit local ISO dates are accepted for manual input; never locale-ambiguous dates.
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) throw new Error('时间请使用完整日期与时间，例如 2026-10-16T23:30:00+08:00');
 if(new Date(text.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==text.slice(0,10)) throw new Error('睡眠日期无效');
 const time=new Date(text);if(!Number.isFinite(time.getTime()))throw new Error('睡眠时间无效');return time.toISOString();
};
export function sleepPayload(start: string,end:string,note='',source='手动记录'): SleepPayload {
 const a=isoTime(start),b=isoTime(end),minutes=(Date.parse(b)-Date.parse(a))/60000;
 if(minutes<=0 || minutes>24*60)throw new Error('结束时间需晚于开始时间，每次睡眠不超过 24 小时');
 if(Date.parse(b)>Date.now()+60000)throw new Error('不能记录尚未结束的睡眠');
 return {start:a,end:b,durationMinutes:Math.round(minutes),source:source.slice(0,120),note:note.slice(0,1000)};
}
export const sleepDate=(payload: Pick<SleepPayload,'end'>)=>getLocalDateKey(new Date(payload.end));
export const SLEEP_STAGE_LABELS={coreMinutes:'核心睡眠',deepMinutes:'深度睡眠',remMinutes:'快速动眼（REM）',awakeMinutes:'清醒'} as const;
export const SLEEP_ANALYSIS_GUIDE='睡眠解读：可结合总时长、记录中的清醒时长、近几次规律和用户醒后体感讨论睡得如何。手表分期是估算；缺失阶段不等于 0，不凭一次深睡或 REM 比例判定疾病或绝对好坏，不编造 Apple 睡眠评分。全天心率样本均值 / 极值不是睡眠心率，不能混用。没有实时手表权限，用户询问时再据已记录数据分析，不必每轮播报。';
export function sleepStageSummary(p:Record<string,any>):string{
 const values=Object.entries(SLEEP_STAGE_LABELS).map(([key,label])=>`${label}：${typeof p[key]==='number'?p[key]+' 分钟':'未导入'}`);
 const sum=['coreMinutes','deepMinutes','remMinutes'].reduce((n,k)=>n+(typeof p[k]==='number'?p[k]:0),0);
 return values.join('；')+(sum>p.durationMinutes+2?'；分期合计超过总睡眠，可能有来源重叠，请核对，暂不据此评价质量':'');
}
export const sleepSummary=(p:Record<string,any>,includeStages=true)=>`睡眠 · ${Math.floor(p.durationMinutes/60)}小时${Math.round(p.durationMinutes%60)}分钟（${new Date(p.start).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}—${new Date(p.end).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}）`+(includeStages?'；'+sleepStageSummary(p):'');
export const sameSleep=(a:Record<string,any>,b:Record<string,any>)=>a.start===b.start && a.end===b.end;
interface Sample {start:number;end:number;stage:string;source:string}
function unionMinutes(samples:Sample[]):number {let total=0,end=-Infinity;for(const s of [...samples].sort((a,b)=>a.start-b.start)){total+=Math.max(0,s.end-Math.max(end,s.start));end=Math.max(end,s.end);}return Math.round(total/60000);}
function fromSamples(samples:Sample[]):SleepPayload[] {
 const groups=new Map<string,Sample[]>();
 for(const s of samples){if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.end<=s.start || s.end-s.start>86400000 || s.end>Date.now()+60000)throw new Error('导入数据含无效或未来的睡眠时段');if(s.stage==='inbed')continue;const key=s.source;groups.set(key,[...(groups.get(key)||[]),s]);}
 const sessions:Sample[][]=[];
 for(const rows of groups.values()){
  let current:Sample[]=[],lastEnd=-Infinity;
  for(const row of rows.sort((a,b)=>a.start-b.start)){if(current.length && row.start-lastEnd>2*3600000){sessions.push(current);current=[];lastEnd=-Infinity;}current.push(row);lastEnd=Math.max(lastEnd,row.end);}if(current.length)sessions.push(current);
 }
 const result:SleepPayload[]=[];
 for(const group of sessions){
 const asleep=group.filter(s=>/^asleep/.test(s.stage));if(!asleep.length)continue;
 const start=asleep.reduce((n,s)=>Math.min(n,s.start),Infinity),end=group.reduce((n,s)=>Math.max(n,s.end),-Infinity);
 const payload=sleepPayload(new Date(start).toISOString(),new Date(end).toISOString(),'从健康睡眠分段导入',group[0].source);payload.durationMinutes=unionMinutes(asleep);
 for(const [stage,key] of [['asleepcore','coreMinutes'],['asleepdeep','deepMinutes'],['asleeprem','remMinutes'],['awake','awakeMinutes']] as const){const rows=group.filter(s=>s.stage===stage&&s.end>start).map(s=>({...s,start:Math.max(start,s.start)}));if(rows.length)payload[key]=unionMinutes(rows);}
 result.push(payload);
 }return result;
}
export function parseSleepSamples(value:unknown):SleepPayload[]{
 if(!Array.isArray(value)||value.length>2000)throw new Error('sleepSamples 需要是最多 2000 条的睡眠分段列表');
 if(!value.length)return [];
 const samples=value.map(row=>{
  if(!row||typeof row!=='object')throw new Error('睡眠分段需为字典');
  const raw=String(row.stage??row.value??'').trim();const text=raw.replace(/HKCategoryValueSleepAnalysis/gi,'').toLowerCase().replace(/\s+/g,'');
  const numeric=['inbed','asleepunspecified','awake','asleepcore','asleepdeep','asleeprem'];
  let stage=/^[0-5]$/.test(text)?numeric[Number(text)]:/core|核心/.test(text)?'asleepcore':/deep|深度|深睡/.test(text)?'asleepdeep':/rem|快速动眼|快速眼动/.test(text)?'asleeprem':/awake|清醒/.test(text)?'awake':/inbed|卧床|在床/.test(text)?'inbed':/asleep|睡眠|已睡/.test(text)?'asleepunspecified':'';
  if(!stage)throw new Error('无法识别睡眠阶段：'+raw.slice(0,60)+'。请选择健康样本的值，不要传持续时间。');
  return {stage,start:Date.parse(isoTime(row.start??row.startDate??'')),end:Date.parse(isoTime(row.end??row.endDate??'')),source:typeof row.source==='string'?row.source.slice(0,120):'健康快捷指令（未区分来源）'};
 });
 const result=fromSamples(samples);if(!result.length)throw new Error('没有已睡眠分段，卧床和清醒不能代替睡眠');return result;
}
function csvRows(text:string):string[][] {const rows:string[][]=[];let row:string[]=[],field='',quote=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote && text[i+1]==='"'){field+='"';i++;}else quote=!quote;}else if(!quote && (c===',' || c==='\n' || c==='\r')){row.push(field);field='';if(c!==','){if(c==='\r' && text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}}else field+=c;}if(quote)throw new Error('CSV 引号未闭合');row.push(field);if(row.some(Boolean))rows.push(row);return rows;}
export function parseSleepText(text:string):SleepPayload[] {
 let rows:any[];
 if(text.trim().startsWith('[') || text.trim().startsWith('{')){const value=JSON.parse(text);if(value.sleepSamples!==undefined)return parseSleepSamples(value.sleepSamples);rows=Array.isArray(value)?value:value.records;if(!Array.isArray(rows))throw new Error('JSON 需为记录数组或包含 records / sleepSamples 数组');}
 else{const [header,...data]=csvRows(text.replace(/^\uFEFF/,''));if(!header)throw new Error('文件为空');rows=data.map(row=>Object.fromEntries(header.map((key,i)=>[key.trim(),row[i] || ''])));}
 if(rows.length>5000)throw new Error('每次最多导入 5000 条');
 const result=rows.map(row=>{
 const p=sleepPayload(row.start || row.startDate || '',row.end || row.endDate || '',row.note || '',row.source || '文件导入');
 const span=p.durationMinutes;
 // Exported totals may exclude awake intervals; preserve only bounded valid totals.
 for(const key of ['durationMinutes','coreMinutes','deepMinutes','remMinutes','awakeMinutes'] as const){if(row[key]!==undefined && row[key]!==''){const n=Number(row[key]);if(!Number.isFinite(n)||n<0||n>span)throw new Error('睡眠分钟数不能超出记录时段');p[key]=Math.round(n);}}
 if(!p.durationMinutes)throw new Error('睡眠时长需大于零');return p;
 });
 if(!result.length)throw new Error('未找到睡眠记录');return result;
}
/** Stream the Health XML so non-sleep health data never needs to enter the app database. */
export async function readSleepFile(file:File):Promise<SleepPayload[]> {
 if(!/\.xml$/i.test(file.name)){if(file.size>25*1024*1024)throw new Error('JSON / CSV 过大，请按日期分批导入');return parseSleepText(await file.text());}
 const reader=file.stream().getReader(),decoder=new TextDecoder();let buffer='';const samples:Sample[]=[];
 const consume=()=>{let match:RegExpExecArray|null;const re=/<Record\b[^>]*>/g;let end=0;while((match=re.exec(buffer))){end=re.lastIndex;if(!match[0].includes('HKCategoryTypeIdentifierSleepAnalysis'))continue;const attrs=Object.fromEntries([...match[0].matchAll(/(\w+)="([^"]*)"/g)].map(m=>[m[1],m[2].replace(/&quot;/g,'"').replace(/&amp;/g,'&')]));const stage=String(attrs.value).replace('HKCategoryValueSleepAnalysis','').toLowerCase();if(!['asleep','asleepunspecified','asleepcore','asleepdeep','asleeprem','awake','inbed'].includes(stage))continue;samples.push({start:Date.parse(isoTime(attrs.startDate)),end:Date.parse(isoTime(attrs.endDate)),source:attrs.sourceName || 'Apple 健康',stage});if(samples.length>150000)throw new Error('睡眠分段过多，请分批导入');}buffer=buffer.slice(end);if(buffer.length>65536)buffer=buffer.slice(Math.max(buffer.lastIndexOf('<Record'),buffer.length-65536));};
 try{while(true){const part=await reader.read();if(part.done)break;buffer+=decoder.decode(part.value,{stream:true});consume();}buffer+=decoder.decode();consume();}finally{await reader.cancel();reader.releaseLock();}
 const result=fromSamples(samples);if(!result.length)throw new Error('XML 中未找到已睡眠数据（仅卧床记录不算实际睡眠）');return result;
}
export function sleepRecord(payload:SleepPayload):LifeRecord{return {id:crypto.randomUUID(),module:'sleep',kind:'session',date:sleepDate(payload),timestamp:Date.now(),payload,recordedBy:'user',reviewStatus:'confirmed'};}
