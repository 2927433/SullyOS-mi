import {DB} from './db';
import {HEALTH_METRICS,type HealthShortcutData} from './healthShortcut';
export const HEALTH_DATA_CHANGED='user-health-data-changed';
export async function buildHealthSummary():Promise<string>{
 const data=await DB.getAssetRaw('health_shortcut_snapshot_v1') as HealthShortcutData|null;
 if(!data?.metrics)return '- 健康：尚无接收数据，不可推测实时状态。';
 const values=Object.entries(data.metrics).filter(([key,value])=>HEALTH_METRICS[key] && typeof value==='number' && Number.isFinite(value));
 return '- 健康快照：数据日期 '+data.date+'；接收于 '+new Date(data.receivedAt).toLocaleString()+'。'+values.map(([key,value])=>HEALTH_METRICS[key].label+' '+value+' '+HEALTH_METRICS[key].unit).join('；')+'。这是用户已接收的记录，不代表今天或实时测量；不要声称直接监测手表或给出诊断，不需按运动目标催促用户。';
}
