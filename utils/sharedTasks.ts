import type {Task} from '../types';
export const taskSupervisorIds=(task:Task):string[]=>[...new Set((task.supervisorIds??[task.supervisorId]).filter(Boolean))];
export const taskKind=(task:Task)=>task.kind||'wish';
/** Export only this character's task facts; no supervisor list or other character names. */
export function renderSupervisedTasks(tasks:Task[],charId:string):string{
 const own=tasks.filter(t=>taskKind(t)!=='personal'&&!t.isCompleted&&taskSupervisorIds(t).includes(charId));
 if(!own.length)return '';
 return '\n[用户交给你关注的目标]\n'+own.slice(0,30).map(t=>`${taskKind(t)==='wish'?'心愿':'规划任务'}：${t.title}${t.deadline?'；用户当地日期：'+t.deadline:''}${t.plannedTime?'；用户当地时间：'+t.plannedTime:''}`).join('\n')+'\n自然地关心进展，不声称已完成，不虚构其他监督者或共同监督。日期时间是用户的日程，不是你的作息。\n';
}
