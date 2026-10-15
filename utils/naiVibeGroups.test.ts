import { describe, expect, it } from 'vitest';
import { applyNaiVibeGroup, exportNaiVibeGroups, importNaiVibeGroups } from './naiVibeGroups';
import { attachNaiReferences } from './naiReferences';
import { buildNaiRequest, defaultNaiState, normalizeNaiState } from './nai';
const official = () => ({ identifier:'novelai-vibe-transfer-bundle', version:1, vibes:[{identifier:'novelai-vibe-transfer',version:1,type:'encoding',name:'柔光',encodings:{'v4-5full':{unknown:{encoding:btoa('encoded-test')}}},importInfo:{model:'nai-diffusion-4-5-full',strength:0.6,information_extracted:0.7}}] });
describe('Vibe 分组资料库',()=>{
 it('导入 NAI Bundle，保留强度、分类和编码',async()=>{
  const [group]=await importNaiVibeGroups(JSON.stringify(official()),'漫画');
  expect(group.category).toBe('漫画'); expect(group.references[0].strength).toBe(0.6);expect(group.references[0].encodingOnly).toBe(true);
 });
 it('应用到一个角色不覆盖外观、不改变另一角色或原组合',async()=>{
  const [group]=await importNaiVibeGroups(JSON.stringify(official()));const state=defaultNaiState();state.characters.a={positive:'black hair',negative:'',presetId:'p',auto:true};state.characters.b={positive:'white hair',negative:'',presetId:'',auto:false};
  const next=applyNaiVibeGroup(state,'a',group);next.characters.a.references![0].strength=0.1;
  expect(next.characters.a.positive).toBe('black hair'); expect(next.characters.a.auto).toBe(true);expect(next.characters.b).toEqual(state.characters.b);expect(group.references[0].strength).toBe(0.6);
 });
 it('编码 Vibe 直接请求，无需上传原图重新编码；不匹配模型时阻止',async()=>{
  const [group]=await importNaiVibeGroups(JSON.stringify(official()));let state=applyNaiVibeGroup(defaultNaiState(),'',group);state.model='nai-diffusion-4-5-full';
  const encoder=async()=>{throw new Error('must not re-encode');};
  const request=buildNaiRequest(state,'','garden','',()=>1);const prepared=await attachNaiReferences(state,request,'',encoder);
  expect(prepared.parameters.reference_image_multiple).toEqual([btoa('encoded-test')]);
  await expect(attachNaiReferences(state,{...request,model:'nai-diffusion-4-5-curated'},'',encoder)).rejects.toThrow('不支持当前模型');
 });
 it('组合导出再导入保留编码及分类，不导出密钥，生成新的组合 ID',async()=>{
  const [group]=await importNaiVibeGroups(JSON.stringify(official()),'厚涂');const text=await exportNaiVibeGroups([group]);const [restored]=await importNaiVibeGroups(text);
  expect(restored.category).toBe('厚涂');expect(restored.references[0].vibeEncodings).toEqual(group.references[0].vibeEncodings);expect(restored.id).not.toBe(group.id);expect(text).not.toContain('apiKey');
 });
 it('空组合、超四参考和错误格式均拒绝导入',async()=>{
  const data=official();data.vibes=Array(5).fill(data.vibes[0]);await expect(importNaiVibeGroups(JSON.stringify(data))).rejects.toThrow('1–4');
  await expect(importNaiVibeGroups('{}')).rejects.toThrow('请选择');
  expect(()=>normalizeNaiState({...defaultNaiState(),vibeGroups:[{id:'x',name:'空组',category:'',references:[]}]})).toThrow('1–4');
 });
 it('遇到不支持的蒙版或编码模型不悄悄丢弃',async()=>{
  const data=official() as any;data.vibes[0].importInfo.mask='mask';await expect(importNaiVibeGroups(JSON.stringify(data))).rejects.toThrow('蒙版');delete data.vibes[0].importInfo.mask;data.vibes[0].encodings={v5full:{unknown:{encoding:btoa('x')}}};await expect(importNaiVibeGroups(JSON.stringify(data))).rejects.toThrow('V4 / V4.5');
 });
});
