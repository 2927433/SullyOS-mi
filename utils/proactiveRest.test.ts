import { describe, expect, it } from 'vitest';
import { proactiveRestReason } from './proactiveRest';
import type { CharacterProfile, Message } from '../types';
const char={id:'test',customTimezoneEnabled:true,customTimezone:'Asia/Shanghai'} as CharacterProfile;
const at=new Date('2026-10-16T06:00:00Z'); // 14:00 Shanghai
const reply=(content:string,hours=1,role='assistant')=>({role,type:'text',content,timestamp:at.getTime()-hours*3600000} as Message);
describe('主动消息 1.0 休息闸门',()=>{
 it('默认凌晨暂停，早八点恢复',()=>{
  expect(proactiveRestReason(char,[],[],new Date('2026-10-15T19:00:00Z'))).toBeTruthy();
  expect(proactiveRestReason(char,[],[],new Date('2026-10-16T00:00:00Z'))).toBeNull();
 });
 it('独立角色时区，支持白天休息和禁用',()=>{
  const config={enabled:true,intervalMinutes:60,quietStart:'13:00',quietEnd:'15:00'};
  expect(proactiveRestReason({...char,proactiveConfig:config},[],[],at)).toBeTruthy();
  expect(proactiveRestReason({...char,proactiveConfig:{...config,quietEnabled:false}},[],[],at)).toBeNull();
  expect(proactiveRestReason({...char,customTimezone:'America/New_York'},[],[],at)).toBeTruthy();
 });
 it('去睡觉暂停，醒来或八小时后解除，不把用户睡眠当角色睡眠',()=>{
  for(const text of ['我先睡了，明天聊。','我去睡觉了','我要睡了，晚安。'])expect(proactiveRestReason(char,[reply(text)],[],at)).toBeTruthy();
  expect(proactiveRestReason(char,[reply('我先睡了',9)],[],at)).toBeNull();
  expect(proactiveRestReason(char,[reply('我先睡了',2),reply('我刚醒了')],[],at)).toBeNull();
  expect(proactiveRestReason(char,[reply('我先睡了',1,'user')],[],at)).toBeNull();
  expect(proactiveRestReason(char,[reply('我睡不着，不睡了')],[],at)).toBeNull();
  expect(proactiveRestReason(char,[reply('晚安，祝你睡得好')],[],at)).toBeNull();
 });
 it('只看当前日程活动，睡前准备不误判；可以关闭睡眠判断',()=>{
  const slots=[{startTime:'12:00',activity:'午睡'},{startTime:'15:00',activity:'起床'}];
  expect(proactiveRestReason(char,[],slots,at)).toBeTruthy();
  expect(proactiveRestReason(char,[],[{startTime:'12:00',activity:'睡前准备'}],at)).toBeNull();
  expect(proactiveRestReason({...char,proactiveConfig:{enabled:true,intervalMinutes:60,respectSleep:false}},[reply('我先睡了')],slots,at)).toBeNull();
 });
});
