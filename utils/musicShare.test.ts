import {beforeEach,describe,expect,it} from 'vitest';
import {DB} from './db';
import {shareMusicToCharacter} from './musicShare';
import {formatMessageForPrompt} from './messageFormat';
const charId='music-share-test';
const song={id:12345,name:'测试歌曲',artists:'测试歌手',album:'测试专辑',albumPic:'https://example.test/cover.jpg',duration:180000,fee:0} as any;
beforeEach(async()=>{await DB.saveCharacter({id:charId,name:'测试角色'} as any);});
describe('用户分享音乐',()=>{
 it('保存原生音乐卡片和可读歌曲信息，角色上下文保留留言',async()=>{
  const id=await shareMusicToCharacter(song,charId,'想和你聊聊这首的旋律',crypto.randomUUID());const message=(await DB.getMessagesByCharId(charId)).find(m=>m.id===id)!;
  expect(message.type).toBe('music_card');expect(message.role).toBe('user');expect(message.metadata.intent).toBe('share');expect(message.metadata.publicUrl).toBe('https://music.163.com/#/song?id=12345');
  const prompt=formatMessageForPrompt(message,'角色','用户');expect(prompt).toContain('测试歌曲');expect(prompt).toContain('测试专辑');expect(prompt).toContain('想和你聊聊');expect(prompt).not.toContain('决定和用户一起听');
 });
 it('同一次发送重试不会重复插入',async()=>{const delivery=crypto.randomUUID();const [a,b]=await Promise.all([shareMusicToCharacter(song,charId,'',delivery),shareMusicToCharacter(song,charId,'',delivery)]);expect(a).toBe(b);});
 it('无效目标或歌曲拒绝发送',async()=>{await expect(shareMusicToCharacter(song,'missing','',crypto.randomUUID())).rejects.toThrow('角色');await expect(shareMusicToCharacter({...song,name:''},charId,'',crypto.randomUUID())).rejects.toThrow('歌曲');});
 it('本地歌曲不会伪造网易云链接，也不分享私密音频请求或 Cookie',async()=>{
  const id=await shareMusicToCharacter({...song,local:true,localAssetKey:'private',url:'https://private?token=secret',cookie:'secret'},charId,'',crypto.randomUUID());const m=(await DB.getMessagesByCharId(charId)).find(row=>row.id===id)!;expect(m.metadata.publicUrl).toBe('');expect(JSON.stringify(m)).not.toContain('secret');expect(JSON.stringify(m)).not.toContain('private');
 });
});
