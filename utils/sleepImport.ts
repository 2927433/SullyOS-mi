import { DB } from './db';
import { sleepRecord, sameSleep, sleepSummary, type SleepPayload } from './sleepRecords';
import type { CharacterProfile } from '../types';
/** Explicit import action; never calls an LLM or invents a character reply. */
export async function storeSleepRecords(payloads:SleepPayload[], char?:CharacterProfile):Promise<{added:number;duplicates:number}> {
 if(char && (!char.lifeRecordEnabled || char.lifeRecordSleepEnabled!==true))throw new Error('请先在该角色设置开启生活记录总开关和睡眠记录');
 if(char && (await DB.getLifeRecordSettings())?.hiddenModules?.includes('sleep'))throw new Error('睡眠模块已隐藏，不能让角色代记');
 if(char && payloads.length>31)throw new Error('角色代记每次最多 31 条，请缩小导入日期范围');
 const existing=(await DB.getAllLifeRecords()).filter(r=>r.module==='sleep' && r.reviewStatus!=='rejected');let added=0,duplicates=0;
 for(const payload of payloads){
  if(existing.some(r=>sameSleep(r.payload,payload))){duplicates++;continue;}
  const record=sleepRecord(payload);
  if(char){record.recordedBy=char.id;record.recordedByName=char.name;record.reviewStatus='active';}
  await DB.saveLifeRecord(record);
  if(char){try{await DB.saveMessage({charId:char.id,role:'assistant',type:'life_card',content:`[生活记录：${sleepSummary(payload)}]`,metadata:{recordId:record.id,module:'sleep',kind:'session',summary:sleepSummary(payload),dateStr:record.date,recordedByName:char.name,reviewStatus:'active',sleepImported:true}});}catch(e){await DB.deleteLifeRecord(record.id);throw e;}}
  existing.push(record);added++;
 }
 return {added,duplicates};
}
