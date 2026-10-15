import {DB} from './db';
import {HEALTH_METRICS,type HealthShortcutData} from './healthShortcut';
import type {LifeRecord} from '../types';
import {sleepSummary} from './sleepRecords';
export const HEALTH_DATA_CHANGED='user-health-data-changed';
// Detailed sleep records are authoritative. Snapshot totals are a labelled fallback only.
export function healthSleepSummary(records:LifeRecord[],data:HealthShortcutData|null,limit=7):string{
 const recent=records.filter(r=>r.module==='sleep' && r.reviewStatus!=='rejected').sort((a,b)=>b.date.localeCompare(a.date)||b.timestamp-a.timestamp).slice(0,limit);
 if(recent.length)return recent.map(r=>r.date+' '+sleepSummary(r.payload)).join('；');
 const total=data?.metrics?.sleepMinutes;
 return typeof total==='number' && Number.isFinite(total) ? `${data!.date} 快捷指令汇总：已睡眠 ${total} 分钟（仅总时长，没有详细起止时间）` : '暂无睡眠记录';
}
export async function buildHealthSummary(includeSleep=true):Promise<string>{
 const data=await DB.getAssetRaw('health_shortcut_snapshot_v1') as HealthShortcutData|null;
 if(!data?.metrics)return '- 健康：尚无接收数据，不可推测实时状态。'+(includeSleep?'睡眠（与睡眠页同源）：'+healthSleepSummary(await DB.getAllLifeRecords(),null):'');
 const values=Object.entries(data.metrics).filter(([key,value])=>key!=='sleepMinutes' && HEALTH_METRICS[key] && typeof value==='number' && Number.isFinite(value));
 const sleep=includeSleep?'；睡眠（与睡眠页同源）：'+healthSleepSummary(await DB.getAllLifeRecords(),data):'';
 return '- 健康快照：数据日期 '+data.date+'；接收于 '+new Date(data.receivedAt).toLocaleString()+'。'+values.map(([key,value])=>HEALTH_METRICS[key].label+' '+value+' '+HEALTH_METRICS[key].unit).join('；')+sleep+'。这是用户已接收的记录，不代表今天或实时测量；不要声称直接监测手表或给出诊断，不需按运动目标催促用户。';
}
