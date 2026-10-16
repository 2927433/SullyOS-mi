import type {CharacterProfile,SocialPost,SocialComment,SubAccount} from '../types';
import {getSparkHandles} from './socialGeneration';
export interface SparkFriend {name:string;description:string}
const norm=(s:string)=>s.normalize('NFKC').trim().toLowerCase();
export function parseSparkFriends(text:string):SparkFriend[]{
 const seen=new Set<string>();
 return text.split('\n').filter(s=>s.trim()).map(line=>{
  const [name,...parts]=line.split('|');const key=norm(name);
  if(!key || seen.has(key))throw new Error('朋友姓名不能为空或重复');seen.add(key);
  return {name:name.trim().slice(0,80),description:parts.join('|').trim().slice(0,2000)};
 }).slice(0,60);
}
export const sparkSpacePosts=(posts:SocialPost[],id:string)=>posts.filter(p=>id?p.sparkScopeCharId===id:!p.sparkScopeCharId);
export function resolveSpaceAuthor(item:any,char:CharacterProfile,handles:Record<string,SubAccount[]>,userNames:string[]){
 const raw=item?.authorName??item?.author;if(typeof raw!=='string')return null;
 const name=raw.trim();if(userNames.some(n=>norm(n)===norm(name)))return null;
 const own=getSparkHandles(char,handles).find(h=>norm(h.handle)===norm(name));
 if(own && (!item.charId || item.charId===char.id))return {name:own.handle,character:char,friend:undefined};
 if(item.charId)return null;
 const friend=char.sparkFriends?.find(f=>norm(f.name)===norm(name));
 return friend?{name:friend.name,character:undefined,friend}:null;
}
export function sparkFriendContext(char:CharacterProfile):string{
 return `【独立空间】本次只属于 charId=${JSON.stringify(char.id)}。其他已导入角色不在这个世界里，不可自动加入。\n【已确认社交网】${JSON.stringify(char.sparkFriends||[])}\n朋友只使用上述姓名和关系，charId 为 null，author/authorName 必须原样使用姓名。不得虚构陌生人、亲友、路人或用户发言；没有已确认朋友时不补造朋友。朋友不是其他角色卡，不读取其私聊。`;
}
export function sparkInteractions(items:unknown,char:CharacterProfile,handles:Record<string,SubAccount[]>,userNames:string[]):SocialComment[]{
 if(!Array.isArray(items))return [];
 return items.slice(0,12).flatMap(item=>{
  const author=resolveSpaceAuthor(item,char,handles,userNames);
  if(!author || typeof item.content!=='string' || !item.content.trim())return [];
  return [{id:crypto.randomUUID(),authorName:author.name,authorAvatar:author.character?.avatar,content:item.content.slice(0,4000),likes:0,isCharacter:!!author.character,authorType:author.character?'character':'friend',authorCharId:author.character?.id} as SocialComment];
 });
}
export function sparkFriendLikes(items:unknown,char:CharacterProfile):string[]{
 if(!Array.isArray(items))return [];
 return [...new Set(items.flatMap(name=>{const f=char.sparkFriends?.find(f=>typeof name==='string'&&norm(f.name)===norm(name));return f?[f.name]:[];}))];
}
/** Extracted people need an exact supporting quote; the user still reviews the draft. */
export function sparkFriendDraft(items:unknown,source:string):string{
 if(!Array.isArray(items))throw new Error('模型未返回朋友列表');
 return items.filter(f=>f && typeof f.name==='string' && typeof f.evidence==='string' && f.evidence.includes(f.name) && source.includes(f.evidence))
 .map(f=>`${f.name.replace(/[|\r\n]/g,' ')}|${String(f.description||'').replace(/[\r\n]/g,' ')}`).join('\n');
}
