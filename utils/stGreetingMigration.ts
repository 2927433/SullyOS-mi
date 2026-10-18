import type {CharacterProfile} from '../types';
/** Match only section labels emitted by our first ST importer; preserve prose elsewhere. */
export function separateStGreetings<T extends Pick<CharacterProfile,'systemPrompt'>&{stGreetingReference?:string[]}>(char:T):T&{stGreetingReference?:string[]}{
 const prompt=char.systemPrompt||'';
 if(!prompt.includes('[原卡开场白（仅供参考，不是已发生的对话）]')&&!prompt.includes('[备选开场白（仅供参考）]')&&!char.stGreetingReference)return char;
 const saved:string[]=[];
 const clean=prompt.replace(/\[(?:原卡开场白（仅供参考，不是已发生的对话）|备选开场白（仅供参考）)\]\n([\s\S]*?)(?=\n\n\[(?:原卡后置补充要求|备选开场白（仅供参考）)\]|$)/g,(_,body:string)=>{if(body.trim())saved.push(body.trim());return '';}).replace(/\n{3,}/g,'\n\n').trim();
 const out={...char,systemPrompt:clean};delete out.stGreetingReference;return out;
}
