import {describe,expect,it} from 'vitest';
import {diaryMonthGrid,moveDiaryMonth,filterSoloDiaries} from './soloDiaryCalendar';
describe('private diary calendar',()=>{
 it('renders leap days and empty calendar cells without timezone conversion',()=>{const grid=diaryMonthGrid('2024-02');expect(grid.filter(Boolean)).toHaveLength(29);expect(grid[4]).toBe('2024-02-01');expect(grid).toContain('2024-02-29');expect(grid.length%7).toBe(0);});
 it('moves correctly across years',()=>{expect(moveDiaryMonth('2026-12',1)).toBe('2027-01');expect(moveDiaryMonth('2026-01',-1)).toBe('2025-12');});
 it('searches old body text across months without changing saved records',()=>{const entries=[{date:'2026-09-03',status:'done',text:'The window seat',startedAt:1},{date:'2026-10-16',status:'done',text:'今天的雨',startedAt:2}] as any;expect(filterSoloDiaries(entries,'WINDOW').map(e=>e.date)).toEqual(['2026-09-03']);expect(filterSoloDiaries(entries,'','2026-10')).toHaveLength(1);expect(entries).toHaveLength(2);});
});
