import { defaultNaiState, emptyNaiCharacter, normalizeNaiState, type NaiState, type NaiVibeGroup, type NaiReference } from './nai';
import { exportNaiPortableLibrary, importNaiPortableLibrary, addNaiReference } from './naiReferences';

const models: Record<string,string> = { v4full:'nai-diffusion-4-full', v4curated:'nai-diffusion-4-curated-preview', 'v4-5full':'nai-diffusion-4-5-full', 'v4-5curated':'nai-diffusion-4-5-curated' };
const validBase64 = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
const scalar = (value: unknown, fallback = 1) => value === undefined ? fallback : typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : (() => { throw new Error('Vibe 参数需在 0–1 之间'); })();
export function applyNaiVibeGroup(state: NaiState, charId: string, group: NaiVibeGroup): NaiState {
 const references = structuredClone(group.references);
 if(charId) return { ...state, characters: { ...state.characters, [charId]: { ...(state.characters[charId] || emptyNaiCharacter()), referenceMode:'vibe',references } } };
 return {...state,referenceMode:'vibe',references};
}
export async function exportNaiVibeGroups(groups: NaiVibeGroup[]): Promise<string> {
 const state = defaultNaiState(); state.vibeGroups = groups;
 return JSON.stringify({ ...JSON.parse(await exportNaiPortableLibrary(state)), identifier:'sullyos-vibe-groups' },null,2);
}
export async function importNaiVibeGroups(text: string, category = ''): Promise<NaiVibeGroup[]> {
 const data=JSON.parse(text);
 if(data.identifier==='sullyos-vibe-groups') {
  const restored=await importNaiPortableLibrary(text,defaultNaiState());
  if(!restored.vibeGroups?.length) throw new Error('文件里没有 Vibe 组合');
  return restored.vibeGroups.map(group=>({...group,id:crypto.randomUUID(),category:category.trim() || group.category}));
 }
 const vibes = data.identifier==='novelai-vibe-transfer-bundle' ? data.vibes : data.identifier==='novelai-vibe-transfer' ? [data] : null;
 if(data.version!==1 || !Array.isArray(vibes) || !vibes.length || vibes.length>4) throw new Error('请选择 NAI Vibe / Vibe Bundle 或本工具组合文件；每组支持 1–4 个 Vibe');
 // Validate every item before storing any images or changing the saved library.
 const parsed=vibes.map(vibe=>{
  if(vibe.version!==1 || !['image','encoding'].includes(vibe.type)) throw new Error('不支持此 Vibe 类型或版本');
  if(vibe.importInfo?.mask) throw new Error('暂不支持带信息提取蒙版的 Vibe，请导出不带蒙版的组合');
  const strength=scalar(vibe.importInfo?.strength), informationExtracted=scalar(vibe.importInfo?.information_extracted);
  const encodings: NonNullable<NaiReference['vibeEncodings']>=[];
  if(vibe.type==='encoding') {
   for(const [key,entries] of Object.entries(vibe.encodings || {})) for(const entry of Object.values(entries as object) as any[]) {
    if(!models[key]) continue;
    if(!validBase64(entry.encoding)) throw new Error('Vibe 编码数据无效');
    if(entry.params?.mask) continue;
    encodings.push({model:models[key],data:entry.encoding,informationExtracted:entry.params ? scalar(entry.params.information_extracted) : undefined});
   }
   if(!encodings.length) throw new Error('编码包没有可用的 V4 / V4.5 编码；请导出支持这些模型的 Vibe');
  } else if(!validBase64(String(vibe.image || '').replace(/^data:image\/[a-z]+;base64,/,''))) throw new Error('Vibe 原始图片数据无效');
  return {vibe,strength,informationExtracted,encodings};
 });
 const references:NaiReference[]=[];
 for(const {vibe,strength,informationExtracted,encodings} of parsed) {
  let ref:NaiReference={id:crypto.randomUUID(),name:vibe.name || '导入 Vibe',imageToken:'',enabled:true,kind:'style',strength,fidelity:1,informationExtracted};
  if(vibe.type==='encoding') ref={...ref,encodingOnly:true,vibeEncodings:encodings};
  else {
   const bytes=Uint8Array.from(atob(vibe.image.replace(/^data:image\/[a-z]+;base64,/,'')),char=>char.charCodeAt(0));
   const mime=bytes[0]===0xff && bytes[1]===0xd8 ? 'image/jpeg' : bytes[0]===0x52 && bytes[1]===0x49 ? 'image/webp' : 'image/png';
   ref={...await addNaiReference(new File([bytes],ref.name,{type:mime})),name:ref.name,kind:'style',strength,informationExtracted};
  }
  references.push(ref);
 }
 const group={id:crypto.randomUUID(),name:typeof data.name==='string' ? data.name : vibes.length===1 ? references[0].name : '导入的 Vibe 组',category:category.trim() || '导入',references};
 normalizeNaiState({...defaultNaiState(),vibeGroups:[group]});
 return [group];
}

