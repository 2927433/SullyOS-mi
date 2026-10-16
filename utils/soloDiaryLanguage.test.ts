import {describe,expect,it,vi} from 'vitest';
import {parseBilingualDiary} from './soloDiaryLanguage';
import {diaryAutomationState} from './soloDiaryAutomation';
import {translateSoloDiary,soloDiaryKey,generateSoloDiary,readSoloDiaries} from './soloDiary';
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

describe('malformed diary recovery',()=>{
 const raw='\x60\x60\x60json\n{"language":"en","text":"Day one.\\n\\nA quiet evening.","translationLanguage":"zh-CN","translation":"第一天。\\n\\n写下了"仅自己可见"的文字。"}\n\x60\x60\x60';
 it('repairs inner quotes and decodes paragraph breaks without mixing languages',()=>{expect(parseBilingualDiary(raw)).toMatchObject({text:'Day one.\n\nA quiet evening.',translation:'第一天。\n\n写下了"仅自己可见"的文字。'});});
 it('recovers saved records with no API request and retains raw backup',async()=>{
  const id='malformed-diary-test',date='2026-10-16';await DB.saveAsset(soloDiaryKey(id),JSON.stringify({[date]:{date,status:'done',text:raw,startedAt:1}}));
  const mock=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('No network permitted'));
  try{const entries=await readSoloDiaries(id);expect(entries[date].translation).toContain('仅自己可见');expect(entries[date].rawStructuredResponse).toBe(raw);await translateSoloDiary(id,date,{baseUrl:'https://mock.invalid/v1',model:'unused'}as any);expect(mock).not.toHaveBeenCalled();expect(await readSoloDiaries(id)).toEqual(entries);}finally{mock.mockRestore();}
 });
});
