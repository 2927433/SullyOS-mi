import {useEffect,useRef} from 'react';
import {useOS} from '../../context/OSContext';
import {readSoloDiarySettings,diaryDateAt,generateSoloDiary,readSoloDiaries,SOLO_DIARY_EVENT} from '../../utils/soloDiary';
import {diaryAutomationState,writeDiaryRuntimeStatus,SOLO_DIARY_CHECK} from '../../utils/soloDiaryAutomation';

/** Global local runner: independent of whether the journal App is open. */
export default function SoloDiaryRuntime(){
 const os=useOS(),latest=useRef(os);latest.current=os;
 useEffect(()=>{
  let busy=false,disposed=false;
  const tick=async()=>{if(busy||disposed||!latest.current.isDataLoaded||latest.current.isLocked)return;busy=true;
   try{const settings=readSoloDiarySettings();for(const char of latest.current.characters){
    if(disposed)break;const rule=settings.rules[char.id];if(!rule?.enabled)continue;
    try{const state=diaryAutomationState(char,rule,await readSoloDiaries(char.id));writeDiaryRuntimeStatus(char.id,state.message);
     if(!state.due||!state.date)continue;
     const activeSettings=readSoloDiarySettings();if(!activeSettings.rules[char.id]?.enabled)continue;
     const api=activeSettings.api||latest.current.apiConfig;
     if(!api.baseUrl||!api.model){writeDiaryRuntimeStatus(char.id,'无法生成：日记 API 缺少地址或模型，请保存完整配置');continue;}
     await generateSoloDiary(char,latest.current.userProfile,latest.current.apiConfig,state.date);
     writeDiaryRuntimeStatus(char.id,diaryAutomationState(char,rule,await readSoloDiaries(char.id)).message);
    }catch{writeDiaryRuntimeStatus(char.id,'自动写作未完成：请查看当天日记状态与 API 配置；未自动重试失败请求');}
   }}finally{busy=false;}};
  const interval=setInterval(()=>void tick(),60000),onVisible=()=>{if(!document.hidden)void tick();};
  void tick();window.addEventListener(SOLO_DIARY_EVENT,onVisible);window.addEventListener(SOLO_DIARY_CHECK,onVisible);window.addEventListener('focus',onVisible);window.addEventListener('online',onVisible);document.addEventListener('visibilitychange',onVisible);
  return()=>{disposed=true;clearInterval(interval);window.removeEventListener(SOLO_DIARY_EVENT,onVisible);window.removeEventListener(SOLO_DIARY_CHECK,onVisible);window.removeEventListener('focus',onVisible);window.removeEventListener('online',onVisible);document.removeEventListener('visibilitychange',onVisible);};
 },[]);return null;
}
