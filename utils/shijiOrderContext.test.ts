import {describe,it,expect} from 'vitest';
import {formatShijiOrderForContext} from './shijiOrderContext';
import {normalizeMessageContent} from './messageFormat';
import {ChatPrompts} from './chatPrompts';
import type {ShijiOrder} from './shijiTypes';
const order:ShijiOrder={id:'order',createdAt:1,mode:'food',recipientId:'peter',recipientName:'Peter Parker',lines:[{item:{id:'food',name:'桂花糖芋苗稠粥',emoji:'🥣',priceCents:1850,mode:'food',shop:'小店',category:'粥',description:'热乎'},quantity:2}],totalCents:3700,note:'记得趁热吃'};
describe('immersive order context',()=>{
 it('keeps recipient identity, meal, quantities, note and money without app implementation commentary',()=>{const result=formatShijiOrderForContext(order,'peter');expect(result).toContain('收件人：你（Peter Parker）');expect(result).toContain('桂花糖芋苗稠粥 ×2');expect(result).toContain('¥37.00');expect(result).toContain('记得趁热吃');expect(result).not.toMatch(/虚拟|非真实配送|小手机内订单/);expect(result).toContain('不编造已签收');});
 it('preserves pending payment and does not treat a different recipient as the payer',()=>{const result=formatShijiOrderForContext({...order,paymentRequest:{payerId:'payer',payerName:'Alex'}},'payer');expect(result).toContain('请你帮我代付');expect(result).toContain('收件人：Peter Parker');expect(result).toContain('不代表已经付款');expect(result).toContain('待确认代付');});
 it('rebuilds legacy order cards in both shared formatting and the real chat history without mutating records',()=>{
  const message={id:1,charId:'peter',role:'user',type:'text',timestamp:Date.now(),content:'[拾集外卖订单]\n收件人：Peter Parker\n（小手机内订单，非真实配送）',metadata:{shijiOrder:order}} as any;
  const normalized=normalizeMessageContent(message,'Peter Parker','用户');expect(normalized).toContain('收件人：你');expect(normalized).not.toContain('非真实配送');
  const history=ChatPrompts.buildMessageHistory([message],20,{id:'peter',name:'Peter Parker'} as any,{name:'用户'} as any,[]).apiMessages;
  expect(JSON.stringify(history)).toContain('桂花糖芋苗稠粥');expect(JSON.stringify(history)).not.toMatch(/虚拟|非真实配送|小手机内订单/);expect(message.content).toContain('非真实配送');
 });
 it('leaves a users ordinary messages about virtual food untouched',()=>{const m={type:'text',content:'我想聊聊虚拟外卖',metadata:{}} as any;expect(normalizeMessageContent(m,'角色','用户')).toBe('我想聊聊虚拟外卖');});
});
