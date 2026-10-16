import {describe,it,expect} from 'vitest';
import {sparkSpacePosts,resolveSpaceAuthor,sparkInteractions,sparkFriendDraft,sparkFriendLikes,parseSparkFriends,sparkFriendContext} from './sparkSpaces';
import type {CharacterProfile,SocialPost} from '../types';
const a={id:'a',name:'甲',sparkFriends:[{name:'原作好友',description:'青梅竹马，语气直接'}]} as CharacterProfile;
const b={id:'b',name:'乙',systemPrompt:'另一个世界的秘密'} as CharacterProfile;
describe('Spark 独立空间及社交网',()=>{
 it('独立空间不接收其他空间或旧记录，空空间只展示旧记录',()=>{
  const posts=[{id:'a1',sparkScopeCharId:'a'},{id:'b1',sparkScopeCharId:'b'},{id:'legacy'}] as SocialPost[];
  expect(sparkSpacePosts(posts,'a').map(p=>p.id)).toEqual(['a1']);expect(sparkSpacePosts(posts,'').map(p=>p.id)).toEqual(['legacy']);
 });
 it('只认当前角色账号或已确认的朋友，不将另一张角色卡补成参与者',()=>{
  expect(resolveSpaceAuthor({author:'乙',charId:'b'},a,{},[])).toBeNull();
  expect(resolveSpaceAuthor({author:'陌生朋友'},a,{},[])).toBeNull();
  expect(resolveSpaceAuthor({author:'原作好友',charId:'b'},a,{},[])).toBeNull();
  expect(resolveSpaceAuthor({author:'原作好友'},a,{},[])?.friend?.name).toBe('原作好友');
  expect(resolveSpaceAuthor({author:'甲',charId:'a'},a,{},[])?.character).toBe(a);
  expect(sparkFriendContext(a)).not.toContain(b.systemPrompt);
 });
 it('朋友评论及点赞严格按名单，不代替用户，重复点赞不累计',()=>{
  const items=[{author:'原作好友',content:'这个很像你。'},{author:'路人',content:'凭空加入'},{author:'用户',content:'代替用户'}];
  expect(sparkInteractions(items,a,{},['用户'])).toHaveLength(1);
  expect(sparkFriendLikes(['原作好友','原作好友','路人'],a)).toEqual(['原作好友']);
 });
 it('提取需要逐字证据，手动名单校验重复',()=>{
  const source='原作好友是甲的青梅竹马。';
  expect(sparkFriendDraft([{name:'原作好友',description:'青梅竹马',evidence:source},{name:'杜撰',evidence:'杜撰是朋友'}],source)).toBe('原作好友|青梅竹马');
  expect(()=>parseSparkFriends('小明|朋友\n小明|同伴')).toThrow();
 });
});
