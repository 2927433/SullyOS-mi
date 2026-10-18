import type {CharacterExportData} from '../types';
import {isPng,pngHasShare,readShareText} from './pngShare';
import {parseStandardWorldbook,toMountedWorldbook} from './worldbook';

const text=(v:unknown)=>typeof v==='string'?v:'';
const strings=(v:unknown)=>Array.isArray(v)?v.filter((s):s is string=>typeof s==='string'):[];
/** Only map character text and lore. Never import extensions, scripts, regex or credentials. */
export function convertStCard(raw:any,avatar=''):CharacterExportData {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('无效的角色卡文件');
 if(raw.spec && !['chara_card_v2','chara_card_v3'].includes(raw.spec))throw new Error('暂不支持此角色卡版本');
 const d=raw.spec?raw.data:raw;
 if(!d||typeof d.name!=='string'||!d.name.trim()||(!raw.spec&&!['description','personality','first_mes','scenario','mes_example'].some(k=>typeof d[k]==='string')))throw new Error('不是受支持的 ST 角色卡');
 const sections=[['角色设定',d.description],['性格',d.personality],['初始场景（背景设定，不代表已经发生）',d.scenario],['角色补充指令',d.system_prompt],['示例对话（仅供风格参考，不是聊天记录）',d.mes_example],['原卡开场白（仅供参考，不是已发生的对话）',d.first_mes],['备选开场白（仅供参考）',strings(d.alternate_greetings).join('\n\n')],['原卡后置补充要求',d.post_history_instructions]];
 const book=d.character_book;
 const entries:any[]=Array.isArray(book?.entries)?book.entries:[];
 const category=`${d.name.trim()} · ${text(book?.name).trim()||'角色世界书'}`;
 const mapped=entries.map((e:any)=>{
  if(!e||typeof e!=='object')return null;
  const x=e.extensions&&typeof e.extensions==='object'?e.extensions:{};
  return {content:e.content,comment:e.comment||e.name,key:e.keys??e.key,keysecondary:e.secondary_keys??e.keysecondary,
   constant:e.constant,selective:e.selective,selectiveLogic:x.selectiveLogic??e.selectiveLogic,
   order:e.insertion_order??e.order,position:x.position??(e.position==='before_char'?0:e.position==='after_char'?1:e.position),
   disable:e.enabled===false||e.disable===true,probability:x.probability??e.probability,useProbability:x.useProbability??e.useProbability,
   depth:x.depth??e.depth,role:x.role??e.role,scanDepth:x.scan_depth??e.scan_depth,caseSensitive:e.case_sensitive??x.case_sensitive,
   matchWholeWords:x.match_whole_words,uid:e.id??e.uid};
 }).filter(e=>e&&typeof e.content==='string');
 const mounted=mapped.length?parseStandardWorldbook(JSON.stringify({entries:mapped}),category).map(toMountedWorldbook):[];
 return {type:'sully_character_card',version:1,name:d.name.trim(),avatar,
  systemPrompt:sections.filter(([,v])=>text(v).trim()).map(([label,v])=>`[${label}]\n${v}`).join('\n\n'),
  description:text(d.creator_notes),worldview:'',mountedWorldbooks:mounted,
 } as unknown as CharacterExportData;
}

/** ST's standard PNG uses base64 UTF-8 JSON in tEXt; ccv3 takes priority. */
export function extractStPng(bytes:Uint8Array):unknown {
 pngHasShare(bytes); // Reuse PNG size, CRC, bounds and IEND validation.
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),values=new Map<string,string>();
 for(let p=8;p<bytes.length;){
  const n=view.getUint32(p),kind=String.fromCharCode(...bytes.subarray(p+4,p+8));
  if(kind==='tEXt'){
   const data=bytes.subarray(p+8,p+8+n),zero=data.indexOf(0);
   if(zero>0){const key=new TextDecoder().decode(data.subarray(0,zero)).toLowerCase();
    if(key==='chara'||key==='ccv3'){
     if(values.has(key))throw new Error('角色卡包含重复的人设数据，请从 ST 重新导出');
     values.set(key,new TextDecoder().decode(data.subarray(zero+1)));
    }
   }
  }p+=n+12;
 }
 const encoded=values.get('ccv3')??values.get('chara');
 if(!encoded)throw new Error('图片没有 ST 人设数据。请选择从 ST 导出的原始 PNG 卡或 JSON；截图不能还原人设和世界书');
 if(encoded.length>16*1024*1024)throw new Error('角色卡人设数据过大，请精简后重新导入');
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))));}
 catch{throw new Error('ST 角色卡人设数据损坏，请重新导出原文件');}
}

export async function readCharacterImport(file:File):Promise<CharacterExportData>{
 if(file.size>96*1024*1024)throw new Error('角色卡文件过大');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(isPng(bytes)){
  if(pngHasShare(bytes))return JSON.parse(await readShareText(file,'character'));
  const raw=extractStPng(bytes);
  // Image goes through the existing blob asset migration at DB save; no remote fetch.
  const avatar=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('卡面读取失败'));r.readAsDataURL(file);});
  return convertStCard(raw,avatar);
 }
 const raw=JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/,''));
 return raw?.type==='sully_character_card'?raw:convertStCard(raw);
}
