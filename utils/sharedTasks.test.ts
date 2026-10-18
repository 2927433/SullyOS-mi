import {describe,it,expect} from 'vitest';
import {taskSupervisorIds,taskKind,renderSupervisedTasks} from './sharedTasks';
import {convertStCard} from './stCharacterCard';
import {separateStGreetings} from './stGreetingMigration';
const task={id:'1',title:'复习',supervisorId:'A',supervisorIds:['A','B','A'],isCompleted:false,createdAt:1,tone:'gentle' as const};
describe('independent supervision',()=>{
 it('keeps shared agenda separate from the supervisor-only block',()=>{expect(renderSupervisedTasks([{...task,kind:'personal',title:'PRIVATE_AGENDA'}],'A')).toBe('');});
 it('supports old tasks and deduplicates new supervisors',()=>{expect(taskSupervisorIds(task)).toEqual(['A','B']);expect(taskSupervisorIds({...task,supervisorIds:undefined})).toEqual(['A']);expect(taskKind(task)).toBe('wish');});
 it('only exposes assigned task facts, omitting other supervisor identities',()=>{const privateTask={...task,id:'private',title:'SECRET',supervisorIds:['C']};const a=renderSupervisedTasks([task,privateTask],'A');expect(a).toContain('复习');expect(a).not.toContain('SECRET');expect(a).not.toContain('supervisor');expect(renderSupervisedTasks([task],'C')).toBe('');expect(renderSupervisedTasks([{...task,isCompleted:true}],'A')).toBe('');});
 it('separates wishes and schedules without translating user time into character time',()=>{expect(renderSupervisedTasks([{...task,kind:'wish',deadline:'2026-10-21',plannedTime:'09:00'}],'B')).toContain('心愿：复习；用户当地日期：2026-10-21；用户当地时间：09:00');});
});
describe('ST greetings are archival data',()=>{
 it('never inserts first or alternate greetings into the core prompt',()=>{const c=convertStCard({name:'A',description:'PERSONA',first_mes:'FIRST_ONLY',alternate_greetings:['ALT_ONLY']});expect(c.systemPrompt).not.toMatch(/FIRST_ONLY|ALT_ONLY/);expect(c.stGreetingReference).toBeUndefined();});
 it('repairs the prior importer output once, preserving other character prose and post instructions',()=>{const c={systemPrompt:'[角色设定]\nPERSONA\n\n[原卡开场白（仅供参考，不是已发生的对话）]\nFIRST\n\n[备选开场白（仅供参考）]\nALT\n\n[原卡后置补充要求]\nRULE'};const repaired=separateStGreetings(c);expect(repaired.systemPrompt).not.toMatch(/FIRST|ALT/);expect(repaired.systemPrompt).toContain('RULE');expect(repaired.stGreetingReference).toBeUndefined();expect(separateStGreetings(repaired)).toEqual(repaired);expect(c.systemPrompt).toContain('FIRST');});
 it('does not alter unrelated hand written prompts',()=>{const c={systemPrompt:'Some unrelated 开场白'};expect(separateStGreetings(c)).toBe(c);});
});
