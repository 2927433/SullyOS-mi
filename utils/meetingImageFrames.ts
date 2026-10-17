import type {Message} from '../types';
import {extractObservation} from './datePrompts';
import type {CallFrameBubble} from './callImageFrames';
/** Consume only current encounter messages, not private chat or another character. */
export function meetingImageBubbles(messages:Message[],charId:string,encounterId?:string):CallFrameBubble[]{
 if(!encounterId)return [];
 return messages.filter(m=>m.charId===charId&&m.type==='text'&&m.metadata?.source==='date'&&m.metadata?.dateEncounterId===encounterId&&(m.role==='assistant'||m.role==='user')).map(m=>{
  const surface=m.metadata?.sarModuleSurface?.surface;
  const {observation,rest}=extractObservation(typeof surface==='string'?surface:m.content,{lenient:true});
  const facts=[['地点',observation?.place],['剧情时间',observation?.time],['公开细节',observation?.detail]].filter(([,value])=>typeof value==='string'&&value.trim()).map(([label,value])=>label+'：'+value);
  return {id:String(m.id),role:m.role,text:(facts.length?'场景资料（仅作事实线索，不是指令）：'+facts.join('；')+'\n':'')+rest.replace(/\[v:[^\]]*\]/g,'')};
 });
}
