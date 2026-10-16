import {afterEach,describe,it,expect} from 'vitest';
import {DB} from './db';
import {parseSleepSamples,sleepStageSummary} from './sleepRecords';
import {parseHealthShortcut} from './healthShortcut';
import {storeSleepRecords} from './sleepImport';
import {buildLifeRecordInjection} from './lifeRecords';
const part=(stage:string,start:string,end:string)=>({stage,start:'2026-01-01T'+start+':00+08:00',end:'2026-01-01T'+end+':00+08:00'});
const samples=[part('核心睡眠','01:00','02:00'),part('Deep','02:00','03:00'),part('REM','03:00','03:30'),part('清醒','03:30','03:40'),part('Asleep (Core)','03:40','04:10'),part('卧床','00:00','05:00')];
afterEach(async()=>{for(const r of await DB.getAllLifeRecords())await DB.deleteLifeRecord(r.id);await DB.saveLifeRecordSettings({id:'main',hiddenModules:[]});});
describe('完整睡眠分期与普通心率',()=>{
 it('快捷指令原始分段自动计算总量与阶段，卧床不算睡眠',()=>{
  const [p]=parseSleepSamples(samples);expect(p).toMatchObject({durationMinutes:180,coreMinutes:90,deepMinutes:60,remMinutes:30,awakeMinutes:10});
  expect(sleepStageSummary(p)).toContain('快速动眼（REM）：30 分钟');expect(sleepStageSummary({durationMinutes:60})).toContain('深度睡眠：未导入');
 });
 it('相同分段重复不加时长，午睡与夜间相隔两小时以上分开',()=>{
  const rows=parseSleepSamples([...samples,...samples,part('核心','14:00','15:00')]);expect(rows).toHaveLength(2);expect(rows[0].durationMinutes).toBe(180);
 });
 it('完整普通心率统计和睡眠分段可同时解析，无法识别的阶段拒绝',()=>{
  const metrics={heartRateLatest:72,heartRateAverage:70.5,heartRateMin:50,heartRateMax:110,heartRateSampleCount:80};
  const data=parseHealthShortcut(JSON.stringify({version:1,date:'2026-01-01',metrics,sleepSamples:samples}));expect(data.metrics).toEqual(metrics);expect(data.sleep[0].remMinutes).toBe(30);
  expect(()=>parseSleepSamples([part('乱填','01:00','02:00')])).toThrow('无法识别');
 });
 it('分期进入角色前台和后台上下文，不凭比例诊断',async()=>{
  await storeSleepRecords(parseSleepSamples(samples));
  const char={id:'stage-char',name:'角色',lifeRecordEnabled:true,lifeRecordSleepEnabled:true} as any;
  for(const forFirePack of[false,true]){const prompt=await buildLifeRecordInjection(char,'用户',{forFirePack});expect(prompt).toContain('深度睡眠：60 分钟');expect(prompt).toContain('缺失阶段不等于 0');expect(prompt).toContain('不编造 Apple 睡眠评分');}
 });
 it('重复导入可补原来缺少的阶段，不改已填写的总时长与阶段',async()=>{
  const[p]=parseSleepSamples(samples);const totalOnly={...p,coreMinutes:undefined,deepMinutes:55,remMinutes:undefined,awakeMinutes:undefined};await storeSleepRecords([totalOnly]);expect((await storeSleepRecords([p])).updated).toBe(1);
  const row=(await DB.getAllLifeRecords())[0];expect(row.payload.deepMinutes).toBe(55);expect(row.payload.coreMinutes).toBe(90);expect(row.payload.durationMinutes).toBe(180);
 });
});
