import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {DB} from './db';
import {matchesChatSearch,chatSearchText} from './chatRecordSearch';
import {parseHealthShortcut} from './healthShortcut';
import type {Message} from '../types';
const row=(overrides:Partial<Message>={}):Message=>({id:1,charId:'search-a',role:'user',type:'text',content:'今天吃拉面',timestamp:new Date('2026-01-02T12:00:00').getTime(),...overrides});
describe('聊天分类查询',()=>{
 it('只查询当前私聊，排除群聊及见面、通话等来源',()=>{const f={query:'',category:'all' as const};expect(matchesChatSearch(row(),'search-a',f)).toBe(true);for(const m of [row({charId:'b'}),row({groupId:'g'}),row({metadata:{source:'date'}}),row({metadata:{source:'call'}}),row({type:'secret_note'})])expect(matchesChatSearch(m,'search-a',f)).toBe(false);});
 it('语音包括用户文字语音，卡片包括购物订单，关键词命中音乐留言',()=>{expect(matchesChatSearch(row({type:'voice'}),'search-a',{query:'拉面',category:'voice'})).toBe(true);expect(matchesChatSearch(row({metadata:{shijiOrder:{}}}),'search-a',{query:'',category:'cards'})).toBe(true);const m=row({type:'music_card',metadata:{intent:'share',song:{name:'夜曲',artists:'歌手'},note:'旋律很温柔'}});expect(chatSearchText(m)).toContain('旋律很温柔');});
 it('日期按本地自然日包含结束日，多个关键词同时匹配',()=>{expect(matchesChatSearch(row(),'search-a',{query:'今天 拉面',category:'date',from:'2026-01-02',until:'2026-01-02'})).toBe(true);expect(matchesChatSearch(row(),'search-a',{query:'',category:'all',until:'2026-01-01'})).toBe(false);});
 it('链接与图片分类互不混淆',()=>{expect(matchesChatSearch(row({content:'看看 https://example.com'}),'search-a',{query:'',category:'links'})).toBe(true);expect(matchesChatSearch(row({type:'image'}),'search-a',{query:'',category:'images'})).toBe(true);expect(matchesChatSearch(row(),'search-a',{query:'',category:'cards'})).toBe(false);});
 it('数据库分页不会混入其他角色或群聊，不重复、不修改历史',async()=>{
 const ids:number[]=[];for(let i=0;i<5;i++){const {id,...value}=row({content:'分页'+i});ids.push(await DB.saveMessage(value));}const {id,...group}=row({groupId:'g'});await DB.saveMessage(group);
 const accept=(m:Message)=>matchesChatSearch(m,'search-a',{query:'分页',category:'all'});const first=await DB.searchPrivateMessagePage('search-a',accept,undefined,2);expect(first.messages.map(m=>m.id)).toEqual(ids.slice(-2).reverse());expect(first.hasMore).toBe(true);const next=await DB.searchPrivateMessagePage('search-a',accept,first.messages.at(-1)!.id,2);expect(next.messages.map(m=>m.id)).toEqual(ids.slice(1,3).reverse());expect(new Set([...first.messages,...next.messages].map(m=>m.id)).size).toBe(4);for(const id of ids)expect(await DB.getMessageById(id)).not.toBeNull();
 });
 it('取消的查询不会继续返回旧结果',async()=>{const controller=new AbortController();controller.abort();await expect(DB.searchPrivateMessagePage('search-a',()=>true,undefined,2,controller.signal)).rejects.toMatchObject({name:'AbortError'});});
});
describe('健康快捷指令数据',()=>{
 it('读取白名单指标，忽略额外字段，不把字符串当数字',()=>{const value=parseHealthShortcut(JSON.stringify({version:1,date:'2026-01-02',metrics:{steps:1234,token:'private'}}));expect(value.metrics).toEqual({steps:1234});expect(()=>parseHealthShortcut(JSON.stringify({version:1,date:'2026-01-02',metrics:{steps:'123'}}))).toThrow();});
 it('拒绝未知协议、无效日期与超长链接',()=>{for(const raw of [JSON.stringify({version:2,date:'2026-01-02',metrics:{steps:1}}),JSON.stringify({version:1,date:'2026-02-30',metrics:{steps:1}}),'x'.repeat(13000)])expect(()=>parseHealthShortcut(raw)).toThrow();});
});
