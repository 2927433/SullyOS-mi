// @vitest-environment jsdom
import {describe,expect,it} from 'vitest';
import {parseHealthTransfer} from './healthTransfer';
import {captureHealthShortcut,takeHealthShortcut,parseHealthShortcut} from './healthShortcut';
describe('Shortcuts literal plus timezone offsets',()=>{
 const raw=JSON.stringify({version:1,date:'2026-10-16',metrics:{steps:106,restingHeartRate:81},sleepSamples:[{stage:'核心睡眠',start:'2026-10-16T12:53:05+08:00',end:'2026-10-16T12:59:06+08:00'},{stage:'深度睡眠',start:'2026-10-16T12:59:06+08:00',end:'2026-10-16T13:05:38+08:00'}]});
 const shortcutEncoded=encodeURIComponent(raw).replaceAll('%2B','+');
 it('reproduces why form decoding broke the screenshot sample',()=>{const broken=new URLSearchParams('health-import='+shortcutEncoded).get('health-import')!;expect(broken).toContain('12:53:05 08:00');expect(()=>parseHealthShortcut(broken)).toThrow('睡眠时间无效');});
 it('accepts raw JSON, correctly encoded offsets and literal-plus shortcut links without changing instants',()=>{for(const input of[raw,'https://example.com/#health-import='+encodeURIComponent(raw),'https://example.com/#health-import='+shortcutEncoded,shortcutEncoded]){const data=parseHealthTransfer(input);expect(data.sleep[0].start).toBe('2026-10-16T04:53:05.000Z');expect(data.sleep[0].coreMinutes).toBe(6);expect(data.sleep[0].deepMinutes).toBe(7);expect(data.metrics.steps).toBe(106);}});
 it('also fixes the automatic address-bar receiver and removes imported health data from the URL',()=>{window.history.replaceState(null,'','#health-import='+shortcutEncoded+'&view=health');captureHealthShortcut();const pending=takeHealthShortcut();expect(pending?.error).toBeUndefined();expect(pending?.data?.sleep[0].start).toBe('2026-10-16T04:53:05.000Z');expect(window.location.hash).not.toContain('sleepSamples');expect(window.location.hash).toContain('view=health');});
});
