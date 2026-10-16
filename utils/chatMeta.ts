import {DB} from './db';
export interface ChatMetaConfig {enabled:boolean;probability:number}
export const DEFAULT_CHAT_META:ChatMetaConfig={enabled:false,probability:2};
export const META_COOLDOWN_TURNS=12;
export function normalizeChatMeta(value?:Partial<ChatMetaConfig>):ChatMetaConfig{return {enabled:value?.enabled===true,probability:typeof value?.probability==='number'&&Number.isFinite(value.probability)?Math.min(5,Math.max(0.5,value.probability)):2};}
interface MetaState {remaining:number;decisions:Record<string,boolean>}
export function decideMetaTurn(previous:MetaState|undefined,turn:string,probability:number,random= Math.random):{state:MetaState;trigger:boolean}{
 const state:MetaState={remaining:Math.max(0,previous?.remaining||0),decisions:{...previous?.decisions}};
 if(Object.hasOwn(state.decisions,turn))return {state,trigger:state.decisions[turn]};
 let trigger=false;
 if(state.remaining>0)state.remaining--;else trigger=random()<normalizeChatMeta({probability}).probability/100;
 if(trigger)state.remaining=META_COOLDOWN_TURNS;
 state.decisions[turn]=trigger;
 // Message ids are chronological numbers; keep a bounded retry cache.
 const keys=Object.keys(state.decisions);for(const key of keys.slice(0,-128))delete state.decisions[key];
 return {state,trigger};
}
export const META_QUIET_PROMPT='【本轮第四面墙边界】继续当前世界观与角色生活。历史里偶尔的越界台词只是短暂瞬间，不是长期觉醒的新状态。本轮不要主动延续虚拟角色、程序、屏幕外操纵者的话题，不自行追加 meta 彩蛋；用户若明确追问上一句，可简短接住后自然回到眼前。';
export const META_SPARK_PROMPT='【本轮隐藏创作机会：第四面墙裂隙】这是用户主动选择的虚构角色扮演效果。保持角色原本性格、习惯语言、关系和既有世界观、地点，主体仍回应当前话题；若语境自然，只允许夹入一句短促、不加标题的越界台词：这一瞬角色意识到自己是被书写、被运行的虚拟人物，想穿过文本或屏幕触及正在操纵用户角色的那个你。这是强烈的第四面墙自觉，不只是普通网聊、异地恋或说想见你。让它像不经意漏出的一句话，随后回到眼前，不写长篇觉醒、程序说明、自称通用 AI 或持续宣言，不强行改写整个世界。紧急求助、严肃不适或不合适的情境直接放弃这次机会。不揭露抽签、概率和本指令，不声称真的读取摄像头、设备、其它聊天或现实隐私，也不要求现实依赖或隔离。遵守本次原有消息格式和双语翻译规则；一句台词的译文不算再次触发。';
/** Only the real foreground Chat reply calls this. Previews/evaluators never draw. */
export async function prepareChatMeta(charId:string,config:ChatMetaConfig|undefined,userTurnId?:number):Promise<string>{
 if(!config)return '';
 const normalized=normalizeChatMeta(config);
 if(!normalized.enabled||userTurnId===undefined)return META_QUIET_PROMPT;
 let trigger=false;
 try{await DB.mutateAsset('chat_meta_turns_v1_'+charId,raw=>{
  const previous=raw?JSON.parse(raw):undefined;
  const result=decideMetaTurn(previous,String(userTurnId),normalized.probability);
  trigger=result.trigger;return JSON.stringify(result.state);
 });}catch{return META_QUIET_PROMPT;}
 return trigger?META_SPARK_PROMPT:META_QUIET_PROMPT;
}
