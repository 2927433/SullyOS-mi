import {File as NodeFile} from 'node:buffer';
import {beforeEach,describe,expect,it} from 'vitest';
import {DB} from './db';
import {readPeriodHealthFile,storePeriodHealthRanges} from './periodHealth';
import {buildLifeRecordInjection,computePeriodStatus} from './lifeRecords';
import {healthSleepSummary} from './userHealth';
const char={id:'health-test',name:'角色',lifeRecordEnabled:true,lifeRecordHealthEnabled:true} as any;
beforeEach(async()=>{await DB.deleteAsset('health_shortcut_snapshot_v1');await DB.saveLifeRecordSettings({id:'main'});for(const record of await DB.getAllLifeRecords())await DB.deleteLifeRecord(record.id);});
describe('健康显示与角色读取',()=>{
 it('睡眠详细记录优先，两个模块同时开启只注入一次，原始汇总不覆盖编辑记录',async()=>{
  const snapshot={date:'2026-01-02',receivedAt:Date.now(),metrics:{steps:2042,sleepMinutes:426},sleep:[]};
  await DB.saveAssetRaw('health_shortcut_snapshot_v1',snapshot);
  const record={id:'sleep-edited',module:'sleep' as const,kind:'session',date:'2026-01-02',timestamp:1,recordedBy:'user',reviewStatus:'confirmed' as const,payload:{start:'2026-01-01T15:00:00Z',end:'2026-01-01T23:00:00Z',durationMinutes:480,source:'手动记录'}};
  await DB.saveLifeRecord(record);
  expect(healthSleepSummary([record],snapshot as any)).toContain('8小时0分钟');
  const prompt=await buildLifeRecordInjection({...char,lifeRecordSleepEnabled:true},'用户',{forFirePack:false});
  expect(prompt.match(/8小时0分钟/g)).toHaveLength(1);
  expect(prompt).not.toContain('426');
  expect(healthSleepSummary([],snapshot as any)).toContain('仅总时长');
 });
 it('健康开关默认关，开启后普通及后台上下文得到日期和指标',async()=>{await DB.saveAssetRaw('health_shortcut_snapshot_v1',{date:'2026-01-02',receivedAt:Date.now(),metrics:{steps:2042,restingHeartRate:61},sleep:[]});expect(await buildLifeRecordInjection({...char,lifeRecordHealthEnabled:undefined},'用户',{forFirePack:false})).not.toContain('2042');for(const forFirePack of [false,true]){const prompt=await buildLifeRecordInjection(char,'用户',{forFirePack});expect(prompt).toContain('2026-01-02');expect(prompt).toContain('2042');expect(prompt).toContain('静息心率 61');expect(prompt).toContain('不代表今天或实时');}});
 it('全局隐藏健康模块阻断读取',async()=>{await DB.saveAssetRaw('health_shortcut_snapshot_v1',{date:'2026-01-02',receivedAt:Date.now(),metrics:{steps:2345}});await DB.saveLifeRecordSettings({id:'main',hiddenModules:['health']});expect(await buildLifeRecordInjection(char,'用户',{forFirePack:false})).not.toContain('2345');});
});
describe('经期导入与外部预测',()=>{
 it('外部预测不需要历史，区间到期即停止，关闭模式不推算',()=>{const settings={id:'main',periodPredictionMode:'external' as const,periodPrediction:{start:'2026-01-12',end:'2026-01-16',updatedAt:1}};const status=computePeriodStatus([],settings,'2026-01-10');expect(status.nextPredicted).toBe('2026-01-12');expect(status.predictionEnd).toBe('2026-01-16');expect(status.ovulationDate).toBeUndefined();expect(computePeriodStatus([],settings,'2026-01-17').nextPredicted).toBeUndefined();expect(computePeriodStatus([],{...settings,periodPredictionMode:'off'},'2026-01-10').nextPredicted).toBeUndefined();});
 it('XML只提取流量记录，合并连续日期并跳过无出血',async()=>{const make=(day:string,value='Light')=>`<Record type="HKCategoryTypeIdentifierMenstrualFlow" value="HKCategoryValueMenstrualFlow${value}" sourceName="健康" startDate="2026-01-${day} 12:00:00 +0800" endDate="2026-01-${day} 13:00:00 +0800"/>`;const xml='<HealthData>'+make('01')+make('02')+make('03','None')+make('05')+'<Record type="HKQuantityTypeIdentifierHeartRate" value="60"/></HealthData>';const rows=await readPeriodHealthFile(new NodeFile([xml],'export.xml') as any);expect(rows).toHaveLength(2);expect(rows[0].start).toBe(rows[0].end.replace(/02$/,'01'));expect(rows[0].source).toBe('健康');});
 it('导入经期去重，不覆盖已存在记录',async()=>{const rows=[{start:'2026-01-01',end:'2026-01-05',source:'健康'}];expect((await storePeriodHealthRanges(rows)).added).toBe(2);expect((await storePeriodHealthRanges(rows)).added).toBe(0);expect((await DB.getAllLifeRecords()).filter(r=>r.module==='period')).toHaveLength(2);});
 it('关闭均值模式不会保留旧的排卵期估算',()=>{const record={id:'start',module:'period' as const,kind:'start',date:'2026-01-01',timestamp:1,payload:{},recordedBy:'user',reviewStatus:'confirmed' as const};const status=computePeriodStatus([record],{id:'main',periodPredictionMode:'off'},'2026-01-15');expect(status.nextPredicted).toBeUndefined();expect(status.ovulationDate).toBeUndefined();});
});
