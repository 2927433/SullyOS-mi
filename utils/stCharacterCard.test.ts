import {readFileSync} from 'node:fs';
import {File} from 'node:buffer';
import {describe,it,expect} from 'vitest';
import {convertStCard,extractStPng,readCharacterImport} from './stCharacterCard';
const png=new Uint8Array(readFileSync(new URL('../assets/icon.png',import.meta.url)));
function chunk(key:string,raw:any){
 const data=new TextEncoder().encode(key+'\0'+Buffer.from(JSON.stringify(raw)).toString('base64'));
 const b=new Uint8Array(data.length+12),v=new DataView(b.buffer);v.setUint32(0,data.length);b.set(new TextEncoder().encode('tEXt'),4);b.set(data,8);
 let crc=0xffffffff;for(const c of b.subarray(4,b.length-4)){crc^=c;for(let i=0;i<8;i++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}v.setUint32(b.length-4,(crc^0xffffffff)>>>0);return b;
}
function card(...chunks:Uint8Array[]){const b=new Uint8Array(png.length+chunks.reduce((n,c)=>n+c.length,0));b.set(png.subarray(0,-12));let p=png.length-12;for(const c of chunks){b.set(c,p);p+=c.length;}b.set(png.subarray(-12),p);return b;}
describe('ST character import',()=>{
 it('reads UTF-8 v2/v3 PNG data, prioritizing v3',()=>{
  expect(extractStPng(card(chunk('chara',{name:'旧'}),chunk('ccv3',{spec:'chara_card_v3',data:{name:'新 🌙'}})))).toMatchObject({data:{name:'新 🌙'}});
 });
 it('rejects screenshots, corrupted CRC and duplicate payloads',()=>{
  expect(()=>extractStPng(png)).toThrow('没有 ST 人设数据');const b=card(chunk('chara',{name:'A'}));b[b.length-17]^=1;expect(()=>extractStPng(b)).toThrow('校验');
  expect(()=>extractStPng(card(chunk('chara',{}),chunk('chara',{})))).toThrow('重复');
 });
 it('maps character prose without importing account settings or executing extensions',()=>{
  const out=convertStCard({spec:'chara_card_v2',data:{name:'角色',description:'人设',personality:'性格',scenario:'背景',first_mes:'你好',mes_example:'示例',creator_notes:'作者说明',extensions:{scripts:['BAD'],apiKey:'SECRET'}}},'data:image/png;base64,abc');
  expect(out.name).toBe('角色');expect(out.systemPrompt).toContain('性格');expect(out.systemPrompt).toContain('不是聊天记录');expect(out.avatar).toContain('data:image');expect(JSON.stringify(out)).not.toMatch(/SECRET|BAD/);
 });
 it('creates grouped bound lore with fresh IDs and preserves triggering/disabled/depth fields',()=>{
  const raw={spec:'chara_card_v3',data:{name:'A',character_book:{name:'世界',entries:[{id:1,keys:['纽约'],secondary_keys:['夜'],content:'设定',enabled:false,insertion_order:12,extensions:{position:4,depth:3,role:1}}]}}};
  const a=convertStCard(raw).mountedWorldbooks!,b=convertStCard(raw).mountedWorldbooks!;
  expect(a[0]).toMatchObject({category:'A · 世界',key:['纽约'],keysecondary:['夜'],disable:true,order:12,position:4,depth:3,role:1});expect(a[0].id).not.toBe(b[0].id);
 });
 it('accepts legacy JSON and keeps native Sully JSON intact',async()=>{
  const file=(raw:any)=>new File([JSON.stringify(raw)],'card.json') as unknown as globalThis.File;
  expect((await readCharacterImport(file({name:'Legacy',description:'角色'}))).name).toBe('Legacy');
  const native={type:'sully_character_card',name:'Native',systemPrompt:'原设定'};expect(await readCharacterImport(file(native))).toEqual(native);
 });
});
