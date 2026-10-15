import { File as NodeFile } from 'node:buffer';
import { afterEach, describe, expect, it } from 'vitest';
import { readSleepFile, parseSleepText, sleepPayload, sleepDate } from './sleepRecords';
import { storeSleepRecords } from './sleepImport';
import { buildLifeRecordInjection, executeLifeDirectives, resolveLifeRecordCard } from './lifeRecords';
import { DB } from './db';
const start='2026-01-01T23:00:00+08:00',end='2026-01-02T07:00:00+08:00';
const char={id:'sleep-test-char',name:'测试角色',lifeRecordEnabled:true,lifeRecordSleepEnabled:true} as any;
afterEach(async()=>{for(const r of await DB.getAllLifeRecords())if(r.module==='sleep')await DB.deleteLifeRecord(r.id);await DB.saveLifeRecordSettings({id:'main',hiddenModules:[]});});
describe('睡眠记录导入与角色权限',()=>{
 it('跨午夜记录按醒来日期归档，拒绝倒序、无效日期和未来睡眠',()=>{
 const p=sleepPayload(start,end);expect(p.durationMinutes).toBe(480);expect(sleepDate(p)).toBe(sleepDate({end:new Date(end).toISOString()}));
 expect(()=>sleepPayload(end,start)).toThrow();expect(()=>sleepPayload('2026-02-30T00:00',end)).toThrow();expect(()=>sleepPayload(start,'2099-01-02T07:00')).toThrow();
 });
 it('CSV 引号备注与 JSON 分钟数能往返，拒绝超出时段的总量',()=>{
 const [row]=parseSleepText('start,end,note,source\n'+start+','+end+',"睡得好,很安稳",Apple Watch');expect(row.note).toContain(',');
 expect(parseSleepText(JSON.stringify({records:[{...row,durationMinutes:420,deepMinutes:50}]}))[0].deepMinutes).toBe(50);
 expect(()=>parseSleepText(JSON.stringify([{start,end,durationMinutes:99999}]))).toThrow();
 });
 it('Apple XML 只取睡眠，重叠分段不重复计时，跨午夜阶段归同一夜',async()=>{
 const record=(a:string,b:string,value:string)=>`<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Apple Watch" startDate="${a}" endDate="${b}" value="HKCategoryValueSleepAnalysis${value}"/>`;
 const xml='<HealthData>'+record('2026-01-01 23:00:00 +0800','2026-01-01 23:30:00 +0800','AsleepCore')+record('2026-01-01 23:30:00 +0800','2026-01-02 01:00:00 +0800','AsleepDeep')+record('2026-01-01 23:00:00 +0800','2026-01-02 01:00:00 +0800','Asleep')+record('2026-01-02 01:00:00 +0800','2026-01-02 01:30:00 +0800','Awake')+'<Record type="HKQuantityTypeIdentifierHeartRate" value="70"/></HealthData>';
 const rows=await readSleepFile(new NodeFile([xml],'export.xml') as any);expect(rows).toHaveLength(1);expect(rows[0].durationMinutes).toBe(120);expect(rows[0].coreMinutes).toBe(30);expect(rows[0].deepMinutes).toBe(90);expect(rows[0].awakeMinutes).toBe(30);
 });
 it('重复导入不覆盖原记录；角色代记保留睡眠阶段并生成可否决卡片',async()=>{
 const p={...sleepPayload(start,end),deepMinutes:60};expect((await storeSleepRecords([p],char)).added).toBe(1);expect((await storeSleepRecords([p],char)).duplicates).toBe(1);
 const row=(await DB.getAllLifeRecords()).find(r=>r.module==='sleep')!;expect(row.payload.deepMinutes).toBe(60);
 const cards=(await DB.getMessagesByCharId(char.id)).filter(m=>m.metadata?.recordId===row.id);expect(cards).toHaveLength(1);expect(cards[0].metadata.dateStr).toBe(row.date);
 await resolveLifeRecordCard(cards[0],'rejected');expect((await DB.getLifeRecordById(row.id))?.reviewStatus).toBe('rejected');
 });
 it('默认不向角色注入睡眠，显式开启后可读；隐藏阻断读写',async()=>{
 await storeSleepRecords([sleepPayload(start,end)]);
 expect(await buildLifeRecordInjection({...char,lifeRecordSleepEnabled:undefined},'用户',{forFirePack:false})).not.toContain('睡眠');
 expect(await buildLifeRecordInjection(char,'用户',{forFirePack:true})).toContain('2026-01-02');
 await DB.saveLifeRecordSettings({id:'main',hiddenModules:['sleep']});
 expect(await buildLifeRecordInjection(char,'用户',{forFirePack:false})).not.toContain('睡眠');
 await expect(storeSleepRecords([sleepPayload(start,end)],char)).rejects.toThrow('已隐藏');
 });
 it('聊天代记按实际醒来日期保存并去重；关闭睡眠开关时不能写入',async()=>{
 const tag=`[[LIFE:SLEEP|${start}|${end}|睡得不错]]`;
 await executeLifeDirectives(tag,char,()=>{});await executeLifeDirectives(tag,char,()=>{});expect((await DB.getAllLifeRecords()).filter(r=>r.module==='sleep')).toHaveLength(1);
 const row=(await DB.getAllLifeRecords()).find(r=>r.module==='sleep')!;expect(row.date).toBe(sleepDate(sleepPayload(start,end)));
 await DB.deleteLifeRecord(row.id);await executeLifeDirectives(tag,{...char,lifeRecordSleepEnabled:false},()=>{});expect((await DB.getAllLifeRecords()).filter(r=>r.module==='sleep')).toHaveLength(0);
 });
});
