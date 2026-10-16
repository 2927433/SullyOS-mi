import {useEffect,useRef} from 'react';
import {useOS} from '../../context/OSContext';
import {readSoloDiarySettings,diaryDateAt,generateSoloDiary,SOLO_DIARY_EVENT} from '../../utils/soloDiary';
import {getScheduleDateKey} from '../../utils/scheduleTime';

/** Global local runner: independent of whether the journal App is open. */
export default function SoloDiaryRuntime(){
 const os=useOS(),latest=useRef(os);latest.current=os;
 useEffect(()=>{
  let busy=false,disposed=false;
  const tick=async()=>{if(busy||disposed||!latest.current.isDataLoaded||latest.current.isLocked)return;busy=true;
   try{const settings=readSoloDiarySettings();for(const char of latest.current.characters){
    if(disposed)break;const rule=settings.rules[char.id];if(!rule?.enabled)continue;
    const date=diaryDateAt(char,rule.endTime);
    if(date<getScheduleDateKey(char,new Date(rule.enabledAt)))continue;
    try{await generateSoloDiary(char,latest.current.userProfile,latest.current.apiConfig,date);}catch{/* Error is persisted and visible in the journal; no automatic retry. */}
   }}finally{busy=false;}};
  const interval=setInterval(()=>void tick(),60000),onVisible=()=>{if(!document.hidden)void tick();};
  void tick();window.addEventListener(SOLO_DIARY_EVENT,onVisible);document.addEventListener('visibilitychange',onVisible);
  return()=>{disposed=true;clearInterval(interval);window.removeEventListener(SOLO_DIARY_EVENT,onVisible);document.removeEventListener('visibilitychange',onVisible);};
 },[]);return null;
}
