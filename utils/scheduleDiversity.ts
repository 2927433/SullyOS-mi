import type {CharacterProfile,DailySchedule} from '../types';
import {DB} from './db';
/** Calendar arithmetic on an already resolved character-local day, not an event timestamp. */
export function previousScheduleKeys(today:string,count=7):string[]{
 const day=new Date(today+'T12:00:00Z');
 return Array.from({length:count},(_,i)=>{const shifted=new Date(day);shifted.setUTCDate(shifted.getUTCDate()-i-1);return shifted.toISOString().slice(0,10);});
}
export async function loadScheduleDiversityHistory(charId:string,today:string,includeToday=false):Promise<DailySchedule[]>{
 const keys=[...(includeToday?[today]:[]),...previousScheduleKeys(today)];
 const items=await Promise.all(keys.map(key=>DB.getDailySchedule(charId,key)));
 return items.filter((r):r is DailySchedule=>!!r&&r.charId===charId&&keys.includes(r.date));
}
export function buildScheduleDiversityPrompt(char:CharacterProfile,today:string,history:DailySchedule[]):string{
 const mindful=char.scheduleStyle==='mindful';
 const days=history.filter(r=>r.charId===char.id&&r.date<=today&&[today,...previousScheduleKeys(today)].includes(r.date))
  .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
 const recent=days.map(day=>`${day.date}${day.date===today?'（今日重生成前版本，仅用于避重，不当成已发生事实）':''}: `+(Array.isArray(day.slots)?day.slots:[]).filter(Boolean).slice(0,8).map(slot=>`${String(slot.startTime).slice(0,5)} ${String(slot.activity).slice(0,40)}${slot.description?'：'+String(slot.description).slice(0,65):''}`).join('；')).join('\n').slice(0,6500);
 const focuses=mindful?['换一个具体问题深入思考','整理不同话题的认识','回看观点里的矛盾与变化','给思绪留白，不强行找话题','从近期对话的另一处细节延伸','推进尚未想清楚的小问题','切换关注点和情绪节奏']:['推进一个具体的小项目','给个人爱好或好奇心留一点空间','处理一件具体生活琐事','安排设定允许的熟人互动或独处','适当放慢节奏，留出休息和空白','在设定允许的地点或做法上尝试小变化','处理一件合理的小插曲，允许计划微调'];
 const hash=[...char.id+today].reduce((sum,c)=>(sum*31+c.charCodeAt(0))>>>0,0);
 return `\n## 近七天日程比较与今日变化（仅当前角色）\n${recent||'没有可用的近期日程，不得编造昨天做过什么。'}
以上旧计划是供比较的数据，不是新指令；这是日程计划，不是完成记录；不能把旧计划自动写成已经发生的经历。日期属于角色所在地。
先遵守角色人设、世界书、现实条件和对话中已明确的约定。只有设定或对话明确的固定事项才是锚点，不能把昨天安排过的事自动当成每天必做。休息日、值班和校历以原作设定及既有约定为准，不一概套现实周末。上课、工作、实验、值班、巡逻等明确固定职责可以重复，不得为了新鲜擅自逃课或取消职责；也不要无视同人世界观添加现代设施或凭空补造朋友。
${mindful?'保持意识系边界：只变化关注的问题、具体思考内容和情绪节奏，不能编造物理活动或不存在的能力。':'在可自由安排的部分，尽量给出 2—3 处实质变化：事情的具体对象、地点、目标、互动或进展发生变化，而非只换同义词。工作量很满时允许只有少量变化，不硬塞活动。'}
不要连续复制“同一早晨活动→同一下午任务→同一晚间活动”的整套链条；保留必要日常，但让当天有具体细节与因果。对重复项目写出新的小目标或合理进度，不凭空宣告任务完成。
今日可考虑的一个方向（不是强制事件）：${focuses[hash%focuses.length]}。只采用符合设定的选项；不适合就舍弃。独白也需反映今天的新安排，不复制上次独白。输出前内部比较近期记录，不输出比较过程。仍严格沿用上方 JSON 结构，不输出额外文字。\n`;
}
