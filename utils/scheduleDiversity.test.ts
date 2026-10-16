import {afterEach,describe,it,expect,vi} from 'vitest';
import {DB} from './db';
import {previousScheduleKeys,loadScheduleDiversityHistory,buildScheduleDiversityPrompt} from './scheduleDiversity';
import type {CharacterProfile,DailySchedule} from '../types';
const char={id:'a',name:'甲'} as CharacterProfile;
const record=(date:string,charId='a',activity='上午上学、下午实验、晚上巡逻')=>({id:charId+'_'+date,charId,date,generatedAt:1,slots:[{startTime:'08:00',activity}]} as DailySchedule);
afterEach(()=>vi.restoreAllMocks());
describe('日程跨天多样性',()=>{
 it('按已经解析的角色本地日期计算近七天，跨月跨年正确',()=>{
  expect(previousScheduleKeys('2026-01-02').slice(0,3)).toEqual(['2026-01-01','2025-12-31','2025-12-30']);
 });
 it('只读取同一个角色，重生成时比较今日版本',async()=>{
  const get=vi.spyOn(DB,'getDailySchedule').mockImplementation(async(id,date)=>record(date,id));
  const history=await loadScheduleDiversityHistory('a','2026-10-16',true);expect(history).toHaveLength(8);
  expect(get.mock.calls.every(([id])=>id==='a')).toBe(true);expect(get.mock.calls[0]).toEqual(['a','2026-10-16']);
  expect(buildScheduleDiversityPrompt(char,'2026-10-16',history)).toContain('不当成已发生事实');
 });
 it('比较旧计划但保留固定职责，不能仅换词，也不跨角色或使用未来日程',()=>{
  const prompt=buildScheduleDiversityPrompt(char,'2026-10-16',[record('2026-10-15'),record('2026-10-15','b','另一个世界的秘密'),record('2026-10-17','a','未来剧透')]);
  expect(prompt).toContain('上午上学');expect(prompt).toContain('同义词');expect(prompt).toContain('固定职责可以重复');expect(prompt).not.toContain('另一个世界的秘密');expect(prompt).not.toContain('未来剧透');
 });
 it('意识系不引导虚构身体活动；没有历史也不编昨天',()=>{
  const prompt=buildScheduleDiversityPrompt({...char,scheduleStyle:'mindful'},'2026-10-16',[]);
  expect(prompt).toContain('不能编造物理活动');expect(prompt).toContain('不得编造昨天做过什么');
 });
});
