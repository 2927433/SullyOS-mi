import {describe,expect,it} from 'vitest';
import {DEFAULT_SOLO_DIARY_GUIDE,getSoloDiaryGuide} from './soloDiaryGuide';
import {soloDiaryPrompt} from './soloDiary';
describe('private diary writing guide',()=>{
 it('prioritizes own schedule over chat while keeping space for the user',()=>{const prompt=soloDiaryPrompt('2026-10-17','聊天资料','日程资料');expect(prompt.indexOf('日程资料')).toBeLessThan(prompt.indexOf('聊天资料'));expect(prompt).toContain('不要为了“独立”而刻意完全排除用户');expect(prompt).toContain('日程是计划');expect(prompt).toContain('translationLanguage');});
 it('uses edited content guidance without losing the bilingual response contract',()=>{const guide=getSoloDiaryGuide({writingGuide:'多写实验室工作和队友，少写咖啡。'});const prompt=soloDiaryPrompt('2026-10-17','','','zh-CN',guide,'昨天的个人生活');expect(prompt).toContain(guide);expect(prompt).toContain('昨天的个人生活');expect(prompt).toContain('"translation":"译文全文"');expect(getSoloDiaryGuide({writingGuide:'  '})).toBe(DEFAULT_SOLO_DIARY_GUIDE);});
});
