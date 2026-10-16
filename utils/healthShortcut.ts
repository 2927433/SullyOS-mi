import {parseSleepText,parseSleepSamples,type SleepPayload} from './sleepRecords';
import {readHealthFragment} from './healthFragment';
export const HEALTH_SHORTCUT_EVENT='sully-health-shortcut';
export const HEALTH_SHORTCUT_OPEN='sully-health-shortcut-open';
export const HEALTH_METRICS:Record<string,{label:string;unit:string}>={steps:{label:'步数',unit:'步'},activeEnergyKcal:{label:'活动能量',unit:'kcal'},exerciseMinutes:{label:'锻炼时间',unit:'分钟'},walkingDistanceKm:{label:'步行与跑步距离',unit:'km'},flightsClimbed:{label:'已爬楼层',unit:'层'},restingHeartRate:{label:'静息心率',unit:'次/分钟'},sleepMinutes:{label:'已睡眠',unit:'分钟'},heartRateLatest:{label:'最新采样心率',unit:'次/分钟'},heartRateAverage:{label:'心率样本均值',unit:'次/分钟'},heartRateMin:{label:'最低采样心率',unit:'次/分钟'},heartRateMax:{label:'最高采样心率',unit:'次/分钟'},heartRateSampleCount:{label:'心率样本数',unit:'条'}};
export interface HealthShortcutData{version:1;date:string;metrics:Record<string,number>;sleep:SleepPayload[];receivedAt:number}
let pending:{data?:HealthShortcutData;error?:string}|null=null;
export function parseHealthShortcut(raw:string):HealthShortcutData{
 if(raw.length>200000)throw new Error('健康数据过大，请分批导入；睡眠分段每次最多 2000 条');
 const input=JSON.parse(raw);
 if(input.version!==1||typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||new Date(input.date+'T00:00:00Z').toISOString().slice(0,10)!==input.date)throw new Error('健康数据版本或日期无效');
 const metrics:Record<string,number>={};for(const key of Object.keys(HEALTH_METRICS)){const value=input.metrics?.[key];if(value===undefined)continue;if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e9)throw new Error('健康指标需为有效非负数字');metrics[key]=value;}
 if(input.sleep!==undefined && input.sleepSamples!==undefined)throw new Error('sleep 与 sleepSamples 请选择一种，避免重复导入');
 const sleep=input.sleepSamples!==undefined?parseSleepSamples(input.sleepSamples):input.sleep===undefined?[]:parseSleepText(JSON.stringify(input.sleep));if(sleep.length>7)throw new Error('每次链接最多传 7 条睡眠记录');
 if(!Object.keys(metrics).length&&!sleep.length)throw new Error('没有可识别的健康数据');
 return {version:1,date:input.date,metrics,sleep,receivedAt:Date.now()};
}
export function captureHealthShortcut():void{
 const hash=window.location.hash;const params=new URLSearchParams(hash.slice(1));if(!params.has('health-import'))return;
 params.delete('health-import');const rest=params.toString();window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search+(rest?'#'+rest:''));
 try{pending={data:parseHealthShortcut(readHealthFragment(hash)!)};}catch(e){pending={error:e instanceof Error?e.message:'快捷指令数据无法读取'};}
 window.dispatchEvent(new Event(HEALTH_SHORTCUT_EVENT));
}
export function takeHealthShortcut(){const value=pending;pending=null;return value;}
