export const DIARY_LANGUAGES:Record<string,string>={'zh-CN':'中文',en:'English',ja:'日本語',ko:'한국어',fr:'Français',de:'Deutsch',es:'Español',pt:'Português'};
export function diaryTranslationLanguage(value:unknown){return typeof value==='string'&&Object.hasOwn(DIARY_LANGUAGES,value)?value:'zh-CN';}
export interface BilingualDiary {text:string;language?:string;translation?:string;translationLanguage?:string}
// Repair presentation errors only. Never invent truncated content.
function repairDiaryJson(text:string){
 let out='',inside=false,escaped=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(escaped){out+=ch;escaped=false;continue;}
  if(inside&&ch==='\\'){out+=ch;escaped=true;continue;}
  if(ch==='"'){
   if(!inside){inside=true;out+=ch;continue;}
   const tail=text.slice(i+1).trimStart();
   if(!tail||tail[0]==='}'||tail[0]===']'||tail[0]===':'||/^,\s*"[^"\\]*"\s*:/.test(tail)){inside=false;out+=ch;}
   else out+='\\"';
  }else if(inside&&ch==='\n')out+='\\n';
  else if(inside&&ch==='\r')out+='\\r';
  else if(inside&&ch==='\t')out+='\\t';
  else out+=ch;
 }
 return out;
}
export function tryParseBilingualDiary(raw:string):BilingualDiary|null{
 const clean=raw.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'');
 if(!clean.startsWith('{')||!clean.endsWith('}'))return null;
 for(let attempt=0;attempt<2;attempt++){
  const candidate=attempt===0?clean:repairDiaryJson(clean);
  try{const data=JSON.parse(candidate);if(data&&typeof data.text==='string'&&data.text.trim())return {text:data.text.trim(),language:typeof data.language==='string'?data.language:undefined,translation:typeof data.translation==='string'&&data.translation.trim()?data.translation.trim():undefined,translationLanguage:diaryTranslationLanguage(data.translationLanguage)};}catch{}
 }
 return null;
}
export function parseBilingualDiary(raw:string):BilingualDiary{return tryParseBilingualDiary(raw)||{text:raw.trim()};}
