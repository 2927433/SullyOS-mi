import type {CharacterProfile} from '../types';
import type {SoloDiaryRule,SoloDiaryEntry} from './soloDiary';
import {diaryDateAt} from './soloDiary';
import {getScheduleDateKey,getScheduleWallClock} from './scheduleTime';
export const SOLO_DIARY_CHECK='solo-diary-check-now';
export const SOLO_DIARY_STATUS='solo-diary-runtime-status';
export function diaryAutomationState(char:CharacterProfile,rule:SoloDiaryRule|undefined,records:Record<string,SoloDiaryEntry>,base=new Date()){
 const wall=getScheduleWallClock(char,base),clock=String(wall.getHours()).padStart(2,'0')+':'+String(wall.getMinutes()).padStart(2,'0');
 if(!rule?.enabled)return {due:false,message:'自动写作未开启',clock};
 const date=diaryDateAt(char,rule.endTime,base);
 if(date<getScheduleDateKey(char,new Date(rule.enabledAt)))return {due:false,date,clock,message:`角色当地 ${clock}，尚未到开启后的首个收尾日；设定收尾 ${rule.endTime}`};
 const entry=records[date];
 if(entry)return {due:false,date,clock,message:entry.status==='done'?`${date} 已写好，不重复生成`:entry.status==='deleted'?`${date} 已删除，不自动重建`:entry.status==='error'?`${date} 生成失败，请打开该日期查看并手动重试`:`${date} 请求已发出；中断时需检查接口日志后确认`};
 return {due:true,date,clock,message:`角色当地 ${clock}，准备补写 ${date}（收尾 ${rule.endTime}）`};
}
export function writeDiaryRuntimeStatus(id:string,message:string){try{localStorage.setItem('solo_diary_runtime_'+id,JSON.stringify({message,checkedAt:Date.now()}));window.dispatchEvent(new Event(SOLO_DIARY_STATUS));}catch{}}
export function readDiaryRuntimeStatus(id:string):{message:string;checkedAt:number}|null{try{return JSON.parse(localStorage.getItem('solo_diary_runtime_'+id)||'null');}catch{return null;}}
