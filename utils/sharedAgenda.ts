import type {Task} from '../types';
import {getCalendarDayDifference,getLocalDateKey} from './localDate';
export const AGENDA_LEAD_DAYS=3;
export function agendaForCharacter(tasks:Task[],now=new Date()):Task[]{
 const today=getLocalDateKey(now);
 return tasks.filter(t=>t.kind==='personal'&&t.deadline&&getCalendarDayDifference(today,t.deadline)!==null)
  .sort((a,b)=>Number(a.isCompleted)-Number(b.isCompleted)||(a.deadline||'').localeCompare(b.deadline||'')||(a.plannedTime||'').localeCompare(b.plannedTime||''));
}
export function upcomingAgenda(tasks:Task[],now=new Date()):Task[]{
 const today=getLocalDateKey(now);
 return agendaForCharacter(tasks,now).filter(t=>{const days=getCalendarDayDifference(today,t.deadline!);return !t.isCompleted&&days!==null&&days>=0&&days<=AGENDA_LEAD_DAYS;});
}
export function agendaFact(t:Task,today:string):string{
 const days=getCalendarDayDifference(today,t.deadline!);
 const when=days===0?'今天':days===1?'明天':days!==null&&days>1?`${days}天后`:'日期已过，是否完成请以用户说明为准';
 return `${t.deadline}${t.plannedTime?' '+t.plannedTime:''}（用户当地，${when}）：${t.title}；${t.isCompleted?'用户已标记完成':'尚未标记完成，不等于没有做'}`;
}
/** All characters get the same user facts, but no audience list or other character identities. */
export function renderSharedAgenda(tasks:Task[],now=new Date()):string{
 const entries=agendaForCharacter(tasks,now);if(!entries.length)return '';
 const today=getLocalDateKey(now);
 const near=upcomingAgenda(entries,now),rest=entries.filter(t=>!near.includes(t));
 return `\n[用户告诉你的日期安排 · 岁时笺]\n用户当地今天是 ${today}。\n`+[...near,...rest].slice(0,30).map(t=>agendaFact(t,today)).join('\n')+'\n这些是用户自己的安排，不是你的日程。你可以在聊天合适时自然提起、关心准备与结果，临近三天时更留意；不必每轮复述。只以你自己的身份回应，不虚构其他角色、监督人、共同提醒或群体互动。过去日期不要称为即将到来；未打勾不能推断用户失败。\n';
}
