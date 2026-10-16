import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('./context',()=>({ContextBuilder:{buildCharacterRequest:vi.fn(async(_char:any,messages:any)=>messages)}}));
vi.mock('./chatContextRange',()=>({loadCharacterContextMessages:vi.fn(async()=>[])}));
import {DB} from './db';
import {diaryDateAt,generateSoloDiary,readSoloDiaries,soloDiaryKey,soloDiaryPrompt} from './soloDiary';
import {BUILTIN_WHITEBOX_PRESETS} from './builtinWhitebox';
const char={id:'solo-test',name:'角色',customTimezoneEnabled:true,customTimezone:'America/New_York'} as any;
const user={name:'我'} as any,api={baseUrl:'https://mock.invalid/v1',apiKey:'TEST_ONLY',model:'diary-model'} as any;
beforeEach(async()=>{await DB.deleteAsset(soloDiaryKey(char.id));vi.restoreAllMocks();vi.spyOn(DB,'getAllCharacters').mockResolvedValue([char]);});
describe('independent daily diary',()=>{
 it('uses character timezone and rolls before the configured closing time',()=>{
  expect(diaryDateAt(char,'23:00',new Date('2026-10-17T02:59:00Z'))).toBe('2026-10-15');
  expect(diaryDateAt(char,'23:00',new Date('2026-10-17T03:00:00Z'))).toBe('2026-10-16');
 });
 it('atomically allows only one paid request for concurrent same-character same-day attempts',async()=>{
  const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:'今天的私人日记。'}}]})));
  await Promise.all([generateSoloDiary(char,user,api,'2026-10-16'),generateSoloDiary(char,user,api,'2026-10-16')]);
  expect(fetcher).toHaveBeenCalledTimes(1);expect((await readSoloDiaries(char.id))['2026-10-16'].text).toBe('今天的私人日记。');
  expect(await readSoloDiaries('another-char')).toEqual({});
 });
 it('persists failed requests and does not automatically reissue a charged/uncertain request',async()=>{
  const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{}',{status:500}));
  await expect(generateSoloDiary(char,user,api,'2026-10-16')).rejects.toThrow('HTTP 500');
  await generateSoloDiary(char,user,api,'2026-10-16');expect(fetcher).toHaveBeenCalledTimes(1);
  expect((await readSoloDiaries(char.id))['2026-10-16'].status).toBe('error');
 });
 it('does not require a user diary and distinguishes schedule plans from facts',()=>{
  const prompt=soloDiaryPrompt('2026-10-16','当天记录','晚间计划');expect(prompt).toContain('不需要用户先写日记');expect(prompt).toContain('日程是计划');
 });
 it('does not automatically recreate a deliberately deleted diary',async()=>{
  await DB.saveAsset(soloDiaryKey(char.id),JSON.stringify({'2026-10-16':{date:'2026-10-16',status:'deleted',startedAt:1}}));
  const fetcher=vi.spyOn(globalThis,'fetch');await generateSoloDiary(char,user,api,'2026-10-16');expect(fetcher).not.toHaveBeenCalled();
 });
 it('bundles glass as an optional preset without a quote rule',()=>{
  const glass=BUILTIN_WHITEBOX_PRESETS.find(p=>p.id==='builtin-clear-glass-bilingual')!.read();
  expect(glass.parts.css).toContain('border-left:0');expect(glass.parts.bubbles?.ai.textColor).toBe('#ffffff');
 });
});
