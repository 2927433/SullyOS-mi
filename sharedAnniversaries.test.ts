import {describe,it,expect} from 'vitest';
import {DB} from './db';import{ChatParser}from'./chatParser';
import{validateAutomaticAnniversary,anniversaryOccurrence,renderAnniversaryContext,anniversaryDayLabel}from'./sharedAnniversaries';
describe('shared anniversary boundaries',()=>{
 it('rejects routines, vague legacy events and invalid dates while accepting substantive categories',()=>{
  expect(validateAutomaticAnniversary('第一次一起吃饭','2026-10-17','meeting','今天我们一起吃饭所以很感动')).toBeNull();
  expect(validateAutomaticAnniversary('Coffee together','2026-10-17','other','We had coffee and enjoyed it')).toBeNull();
  expect(validateAutomaticAnniversary('普通聊天','2026-10-17')).toBeNull();
  expect(validateAutomaticAnniversary('确认关系','2026-02-30','relationship','我们在今天正式确认了恋人关系')).toBeNull();
  expect(validateAutomaticAnniversary('确认关系','2026-10-17','relationship','很棒')).toBeNull();
  expect(validateAutomaticAnniversary('确认关系','2026-10-17','relationship','我们在今天正式确认了恋人关系')).toHaveProperty('category','relationship');
  expect(validateAutomaticAnniversary('第一次见面','2026-10-17')).toHaveProperty('category','meeting');
 });
 it('calculates annual remembrance without changing original dates or adding DST errors',()=>{const entry={id:'a',charId:'a',title:'初见',date:'2024-02-29',repeatYearly:true};expect(anniversaryOccurrence(entry,'2026-10-17')).toBe('2027-02-28');expect(entry.date).toBe('2024-02-29');expect(anniversaryOccurrence({...entry,date:'2026-10-16'},'2026-10-17')).toBe('2027-10-16');expect(anniversaryDayLabel({...entry,date:'2026-10-16'},'2026-10-17')).toBe('已走过 1 天');});
 it('includes only the current character records in generation context',()=>{const rows=[{id:'1',charId:'a',date:'2026-10-16',title:'属于A的初见'},{id:'2',charId:'b',date:'2026-10-16',title:'属于B的秘密'}];expect(renderAnniversaryContext(rows,'a')).toContain('属于A的初见');expect(renderAnniversaryContext(rows,'a')).not.toContain('属于B的秘密');expect(renderAnniversaryContext(rows,'c')).toBe('');});
 it('atomically deduplicates same character while keeping different character records',async()=>{const entry={id:'unique-one',charId:'unique-a',date:'2026-10-17',title:'确定恋爱关系',category:'relationship' as const};const results=await Promise.all([DB.saveAutomaticAnniversary(entry),DB.saveAutomaticAnniversary({...entry,id:'unique-two',title:'我们确认了关系'})]);expect(results.sort()).toEqual([false,true]);expect(await DB.saveAutomaticAnniversary({...entry,id:'unique-b',charId:'unique-b'})).toBe(true);});
 it('executes one validated event per response, strips invalid tags, and uses the actual speaker ownership',async()=>{const id='anni-parser';const output=await ChatParser.parseAndExecuteActions('今天值得记住。\n[[ACTION:ADD_EVENT|一起吃饭|2026-10-17|other|今天吃饭非常高兴而且很值得纪念]]\n[[ACTION:ADD_EVENT|我们确认关系|2026-10-17|relationship|今天双方明确答应成为恋人]]\n[[ACTION:ADD_EVENT|第一次见面|2026-10-16|meeting|昨天是双方确认过的初次见面]]',id,'角色',()=>{});expect(output).not.toContain('ADD_EVENT');const rows=(await DB.getAllAnniversaries()).filter(e=>e.charId===id);expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({title:'我们确认关系',source:'character',repeatYearly:true,category:'relationship',note:'今天双方明确答应成为恋人'});});
});

it('does not let a late anniversary thought overwrite edits or resurrect deletion',async()=>{const entry={id:'late-anni',charId:'late-char',date:'2026-10-17',title:'确认关系',note:'原备注'};await DB.saveAnniversary(entry);await DB.saveAnniversary({...entry,note:'用户已经补充的新备注'});expect(await DB.saveAnniversaryThought(entry,'迟到的想法')).toBeNull();expect((await DB.getAllAnniversaries()).find(e=>e.id===entry.id)?.note).toBe('用户已经补充的新备注');await DB.deleteAnniversary(entry.id);expect(await DB.saveAnniversaryThought(entry,'迟到的想法')).toBeNull();});

it('loads saved own anniversaries through the real character context pipeline',async()=>{const {ContextBuilder}=await import('./context');await DB.saveAnniversary({id:'context-anni-a',charId:'context-anni-a',date:'2026-10-16',title:'A独有的承诺'});await DB.saveAnniversary({id:'context-anni-b',charId:'context-anni-b',date:'2026-10-16',title:'B独有的秘密'});const messages=await ContextBuilder.buildCharacterRequest({char:{id:'context-anni-a',name:'A'}as any,user:{name:'用户'}as any},[{role:'user',content:'今天聊聊。'}]);const request=JSON.stringify(messages);expect(request).toContain('A独有的承诺');expect(request).not.toContain('B独有的秘密');});
