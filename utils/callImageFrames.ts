import type {APIConfig,CharacterProfile,UserProfile} from '../types';
import {buildNaiRequest,getNaiSceneGuide,type NaiSceneDetails} from './nai';
import {loadNaiState,generateNaiImages,type NaiGeneratedImage} from './naiService';
import {draftNaiPrompt,resolveNaiPromptApi} from './naiPrompt';
export interface CallFrameBubble {id:string;role:string;text:string}
export const CALL_AUTO_FRAME_LIMIT=5;
export function hasCallVisualChange(text:string):boolean{
 return text.split(/[。！？.!?\n]/).some(line=>!/(明天|下次|打算|如果|假如|想象|不想|没有|没换|没有换|tomorrow|next time|would|if I|didn.t|haven.t)/i.test(line)&&/(换上|换了.{0,10}(衣|衫|外套|睡衣)|脱下.{0,10}(外套|大衣)|走到.{0,16}(窗|阳台|门|厨房|客厅)|来到.{0,16}(室|屋|楼|台|公园|街)|回到.{0,10}(家|房间|卧室)|灯光.{0,8}(暗|亮)|(?:I.ve |I have |I )?(?:changed into|put on|took off|stepped onto|moved to|walked into|came home|returned to my room))/i.test(line));
}
export function canAutoCallFrame({turns,elapsedMs,intervalMinutes,count,changed}:{turns:number;elapsedMs:number;intervalMinutes:number;count:number;changed:boolean}){
 return changed&&turns>=3&&elapsedMs>=Math.max(3,intervalMinutes)*60000&&count<CALL_AUTO_FRAME_LIMIT;
}
export function callFrameContext(bubbles:CallFrameBubble[]){return bubbles.filter(b=>b.role==='user'||b.role==='assistant').slice(-6).map(b=>b.role+': '+b.text.slice(0,2000)).join('\n');}
/** Uses the saved provider and prompt API; no camera, unrelated history or automatic retries. */
export async function generateCallFrame({char,user,api,bubbles,extra,direct,signal,previous}:{char:CharacterProfile;user:UserProfile;api:APIConfig;bubbles:CallFrameBubble[];extra:string;direct:boolean;signal:AbortSignal;previous?:string}):Promise<NaiGeneratedImage>{
 const check=()=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError');};check();
 const loaded=await loadNaiState();check();
 const profile=loaded.characters[char.id];
 if(!profile?.positive.trim())throw new Error('请先在聊天 + → 生图 → 角色外观，为当前角色填写固定外貌');
 const state={...loaded,characters:{...loaded.characters,[char.id]:{...profile,includeUser:false}},parameters:{...loaded.parameters,n_samples:1}};
 let scene=extra.trim(),details:NaiSceneDetails={photoType:'selfie',characters:[]};
 if(direct){if(!scene)throw new Error('直接提示词模式需要填写英文画面提示词');}
 else{
  const compiled=await draftNaiPrompt('上一张镜头的画面线索（只用于保持未改变内容，不代表新事件）：\n'+(previous?.slice(0,4000)||'暂无')+'\n本次视频通话文字（最新明确变化优先）：\n'+callFrameContext(bubbles),resolveNaiPromptApi(state,api),char,user,
   [state.sceneGuide,extra,'视频通话的角色单人镜头：只画当前角色，胸像或半身，镜头另一侧的用户不入画。photoType 必须为 selfie；固定外貌由程序追加。依据最近明确的角色地点、衣着、动作，保留没有变化的线索；用户的所在地不是角色所在地。不把比喻、假设、未来计划或用户自己的动作画成角色现实。没有明确场景则使用中性背景，不编造重大情节。只描述最终可见画面，不画界面、字幕或聊天气泡。'].filter(Boolean).join('\n'),signal,getNaiSceneGuide(state));
  check();scene=compiled.scene;details={...compiled.details,photoType:'selfie',characters:(compiled.details.characters||[]).filter(c=>c.id===char.id)};
 }
 const request=buildNaiRequest(state,char.id,scene,'',undefined,details);check();
 const images=await generateNaiImages(state,request,signal,{useSavedReferences:true,charId:char.id});check();
 if(!images[0])throw new Error('生图没有返回图片');return images[0];
}
