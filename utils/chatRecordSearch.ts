import type {Message} from '../types';
import {isVisibleChatMessage} from './chatMessageVisibility';
import {normalizeMessageContent} from './messageFormat';
export type ChatSearchCategory='all'|'date'|'voice'|'links'|'cards'|'images';
export interface ChatSearchFilter{query:string;category:ChatSearchCategory;from?:string;until?:string;hideSystemLogs?:boolean}
export function chatSearchText(message:Message):string{
 const content=normalizeMessageContent(message,'角色','我');
 const note=typeof message.metadata?.note==='string'?message.metadata.note:'';
 return (content+' '+note).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/(?:data:[^\s]+|blobref:[^\s]+)/g,'[附件]').replace(/\s+/g,' ').slice(0,50000).trim();
}
export function matchesChatSearch(message:Message,charId:string,filter:ChatSearchFilter):boolean{
 if(message.charId!==charId||!isVisibleChatMessage(message,filter.hideSystemLogs))return false;
 const from=filter.from?new Date(filter.from+'T00:00:00').getTime():-Infinity;
 const until=filter.until?new Date(filter.until+'T00:00:00').getTime():Infinity;
 const end=Number.isFinite(until)?new Date(new Date(until).setDate(new Date(until).getDate()+1)).getTime():Infinity;
 if(message.timestamp<from||message.timestamp>=end)return false;
 if(filter.category==='voice'&&message.type!=='voice')return false;
 if(filter.category==='images'&&!['image','emoji'].includes(message.type))return false;
 const card=message.type.endsWith('_card')||!!message.metadata?.shijiOrder;
 if(filter.category==='cards'&&!card)return false;
 if(filter.category==='links'){const linkText=(['text','webpage_card'].includes(message.type)?message.content:'')+' '+String(message.metadata?.publicUrl||'')+' '+String(message.metadata?.url||'');if(!/https?:\/\//i.test(linkText))return false;}
 const terms=filter.query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 const text=chatSearchText(message).normalize('NFKC').toLocaleLowerCase();return terms.every(term=>text.includes(term));
}
export const chatSearchLabel=(message:Message)=>message.metadata?.shijiOrder?'拾集订单':({voice:'语音',image:'图片',emoji:'表情',music_card:'音乐',life_card:'生活记录',html_card:'HTML 卡片',xhs_card:'小红书',webpage_card:'网页',news_card:'资讯',transfer:'转账'} as Record<string,string>)[message.type]||(message.type.endsWith('_card')?'卡片':'消息');
