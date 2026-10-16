import {describe,expect,it,vi} from 'vitest';
import {parseBilingualDiary} from './soloDiaryLanguage';
import {diaryAutomationState} from './soloDiaryAutomation';
import {translateSoloDiary,soloDiaryKey,generateSoloDiary} from './soloDiary';
import {DB} from './db';
describe('bilingual diary and automatic eligibility',()=>{
 it('stores two languages from one response and preserves legacy plain text',()=>{expect(parseBilingualDiary('```json\n{"text":"Rain stopped.","translation":"雨停了。","language":"en","translationLanguage":"zh-CN"}\n```')).toMatchObject({text:'Rain stopped.',translation:'雨停了。',language:'en'});expect(parseBilingualDiary('Old English diary.')).toEqual({text:'Old English diary.'});});
 it('uses the character timezone, shows why first-day pre-closing work is not due, and skips completed work',()=>{
  const char={customTimezoneEnabled:true,customTimezone:'America/New_York'} as any,rule={enabled:true,endTime:'23:00',enabledAt:Date.parse('2026-10-16T14:00:00Z')};
  expect(diaryAutomationState(char,rule,{},new Date('2026-10-16T15:00:00Z')).message).toContain('首个收尾日');
  expect(diaryAutomationState(char,rule,{},new Date('2026-10-17T03:00:00Z'))).toMatchObject({due:true,date:'2026-10-16'});
  expect(diaryAutomationState(char,rule,{'2026-10-16':{status:'done'}as any},new Date('2026-10-17T03:00:00Z')).due).toBe(false);
 });
 it('translates a legacy diary once without changing its original text or regenerating the day',async()=>{
  const id='legacy-translation-test',date='2026-10-16';await DB.saveAsset(soloDiaryKey(id),JSON.stringify({[date]:{date,status:'done',text:'Keep my original diary.',startedAt:1}}));
  const mock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:'保留我的原日记。'}}]})));
  try{await translateSoloDiary(id,date,{baseUrl:'https://mock.invalid/v1',apiKey:'mock',model:'translator'}as any);await translateSoloDiary(id,date,{baseUrl:'https://mock.invalid/v1',apiKey:'mock',model:'translator'}as any);const saved=JSON.parse((await DB.getAsset(soloDiaryKey(id)))!)[date];expect(saved.text).toBe('Keep my original diary.');expect(saved.translation).toBe('保留我的原日记。');expect(mock).toHaveBeenCalledTimes(1);}finally{mock.mockRestore();}
 });
});
