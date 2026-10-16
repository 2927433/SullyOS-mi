export const DIARY_LANGUAGES:Record<string,string>={'zh-CN':'中文',en:'English',ja:'日本語',ko:'한국어',fr:'Français',de:'Deutsch',es:'Español',pt:'Português'};
export function diaryTranslationLanguage(value:unknown){return typeof value==='string'&&Object.hasOwn(DIARY_LANGUAGES,value)?value:'zh-CN';}
export function parseBilingualDiary(raw:string):{text:string;language?:string;translation?:string;translationLanguage?:string}{
 const clean=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 try{const data=JSON.parse(clean);if(typeof data.text==='string'&&data.text.trim())return {text:data.text.trim(),language:typeof data.language==='string'?data.language:undefined,translation:typeof data.translation==='string'&&data.translation.trim()?data.translation.trim():undefined,translationLanguage:diaryTranslationLanguage(data.translationLanguage)};}catch{}
 // Preserve a plain-text reply from a model that ignored the JSON instruction.
 return {text:raw.trim()};
}
