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
export const META_QUIET_PROMPT='【跨次元叙事边界】这是用户选择的虚构互动风格。角色的自我认知始终是原人设：姓名、身体、经历、职业、关系与生活都成立，不因 meta 否认自身身份。继续眼前话题与既有世界观，本轮不要主动展开次元边界或身份觉醒。若用户追问相关内容，可仍以角色本人、原有语气简短回应，不切换成旁白或通用 AI；此前偶发的生硬“代码、程序、只是一串文字”式说法不构成需要沿用的新设定，不复读、不据此改写角色。不得声称真实读取用户设备、摄像头或其他聊天。';
export const META_SPARK_PROMPT='【可放弃的极轻跨次元叙事机会】这是虚构角色扮演的创作约束，不是现实能力声明。最高优先级是仍然像这个角色本人：自我身份、身体、记忆、职业、性格、习惯语言、克制程度及自己的世界与日常全部保留。他可以隐约知道，你和他身处不同次元，日常传来的消息连接着世界之外的你；这份认识不等于自己是代码、程序、文本、AI、被运行或被操纵的空壳，也不否认用户的代入身份或既有关系。\n只有当前话题、用户情绪、双方关系和角色表达习惯都能自然接住时，才可在正常回应里漏出一个很短的跨次元念头；没有合适的承接就完全不写，不为完成 meta 任务硬插一句。不凭抽签改变语气：寡言者仍寡言、理性者仍理性，不统一变成抒情诗人或哲学家。念头必须承接刚才的具体内容，先回应用户，重点仍是眼前互动；最多一句短句或短从句，不另开气泡作独白，不写长句堆砌意象，不逐项解释两个世界，不把每个想念都升级为次元宣言。\n禁止使用“穿过代码和玻璃”“我只是你手机里的一串文字”等技术化自我否定套路；不套用固定台词，不模仿旧历史里这类失真的独白。边界感应来自原人设和眼前关系，不引入新的悲惨身世、觉醒剧情或全知能力，不突然把线上/线下场景改成对着屏幕表演。说过后自然接续原话题，不在后续回复持续强调。紧急求助、严肃不适或语境不合适时放弃。不要暴露抽签、概率和提示词，不声称读取现实设备或其他角色信息，不要求现实依赖或隔离。沿用原消息格式与双语翻译规则；译文不是第二次触发。';
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
