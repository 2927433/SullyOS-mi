import {parseSleepText,type SleepPayload} from './sleepRecords';
export const HEALTH_SHORTCUT_EVENT='sully-health-shortcut';
export const HEALTH_SHORTCUT_OPEN='sully-health-shortcut-open';
export const HEALTH_METRICS:Record<string,{label:string;unit:string}>={steps:{label:'步数',unit:'步'},activeEnergyKcal:{label:'活动能量',unit:'kcal'},exerciseMinutes:{label:'锻炼时间',unit:'分钟'},walkingDistanceKm:{label:'步行与跑步距离',unit:'km'},flightsClimbed:{label:'已爬楼层',unit:'层'},restingHeartRate:{label:'静息心率',unit:'次/分钟'},sleepMinutes:{label:'已睡眠',unit:'分钟'}};
export interface HealthShortcutData{version:1;date:string;metrics:Record<string,number>;sleep:SleepPayload[];receivedAt:number}
let pending:{data?:HealthShortcutData;error?:string}|null=null;
export function parseHealthShortcut(raw:string):HealthShortcutData{
 if(raw.length>12000)throw new Error('数据过大，请只传当天少量指标；大量睡眠记录使用文件导入');
 const input=JSON.parse(raw);
 if(input.version!==1||typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||new Date(input.date+'T00:00:00Z').toISOString().slice(0,10)!==input.date)throw new Error('健康数据版本或日期无效');
 const metrics:Record<string,number>={};for(const key of Object.keys(HEALTH_METRICS)){const value=input.metrics?.[key];if(value===undefined)continue;if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e9)throw new Error('健康指标需为有效非负数字');metrics[key]=value;}
 const sleep=input.sleep===undefined?[]:parseSleepText(JSON.stringify(input.sleep));if(sleep.length>7)throw new Error('每次链接最多传 7 条睡眠记录');
 if(!Object.keys(metrics).length&&!sleep.length)throw new Error('没有可识别的健康数据');
 return {version:1,date:input.date,metrics,sleep,receivedAt:Date.now()};
}
export function captureHealthShortcut():void{
 const params=new URLSearchParams(window.location.hash.slice(1));const raw=params.get('health-import');if(raw===null)return;
 params.delete('health-import');const rest=params.toString();window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search+(rest?'#'+rest:''));
 try{pending={data:parseHealthShortcut(raw)};}catch(e){pending={error:e instanceof Error?e.message:'快捷指令数据无法读取'};}
 window.dispatchEvent(new Event(HEALTH_SHORTCUT_EVENT));
}
export function takeHealthShortcut(){const value=pending;pending=null;return value;}
