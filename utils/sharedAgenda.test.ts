import {describe,it,expect} from 'vitest';
import type {Task} from '../types';
import {renderSharedAgenda,upcomingAgenda} from './sharedAgenda';
const now=new Date(2026,9,19,10),event:Task={id:'shared',kind:'personal',title:'补考科目一',deadline:'2026-10-21',plannedTime:'09:00',supervisorId:'',supervisorIds:[],tone:'gentle',isCompleted:false,createdAt:1};
describe('shared user agenda context',()=>{
 it('provides the same user facts without another characters identity',()=>{const output=renderSharedAgenda([{...event,supervisorIds:['SECRET_CHAR']}],now);expect(output).toContain('补考科目一');expect(output).toContain('2天后');expect(output).toContain('用户当地今天是 2026-10-19');expect(output).not.toContain('SECRET_CHAR');});
 it('does not share private supervised wishes through this common block',()=>{expect(renderSharedAgenda([{...event,kind:'wish',title:'PRIVATE_WISH'}],now)).toBe('');});
 it('highlights upcoming dates without timers and skips completed events in the upcoming list',()=>{const entries=[{...event,deadline:'2026-10-18'},{...event,id:'today',deadline:'2026-10-19'},{...event,id:'three',deadline:'2026-10-22'},{...event,deadline:'2026-10-23'},{...event,isCompleted:true},{...event,deadline:'bad'}];expect(upcomingAgenda(entries,now).map(e=>e.id)).toEqual(['today','three']);});
 it('keeps completed facts available and labels them honestly rather than repeating pending tasks',()=>{const output=renderSharedAgenda([{...event,deadline:'2026-10-01',isCompleted:true}],now);expect(output).toContain('用户已标记完成');expect(output).toContain('补考科目一');});
 it('reads edits and deletes from each current snapshot without creating chat history or memory copies',()=>{expect(renderSharedAgenda([{...event,title:'更新后的安排'}],now)).toContain('更新后的安排');expect(renderSharedAgenda([],now)).toBe('');expect(renderSharedAgenda([{...event,deadline:'2026-10-18'}],now)).toContain('日期已过');});
});
