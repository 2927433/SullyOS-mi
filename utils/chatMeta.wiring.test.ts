// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';import{createRoot}from'react-dom/client';
import {DB} from './db';import{useChatAI}from'../hooks/useChatAI';import{safeFetchJson}from'./safeApi';
import{META_SPARK_PROMPT,META_QUIET_PROMPT}from'./chatMeta';
vi.mock('../context/MusicContext',()=>({useMusic:()=>({}),loadMusicHooks:()=>null}));
vi.mock('./keepAlive',()=>({KeepAlive:{start:vi.fn(),stop:vi.fn()}}));
vi.mock('./safeApi',async original=>({...await original<typeof import('./safeApi')>(),safeFetchJson:vi.fn()}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>vi.restoreAllMocks());
it('adds a one-turn meta opportunity to the actual chat request and a quiet boundary after it',async()=>{
 const char={id:'meta-wiring',name:'侦探',chatMeta:{enabled:true,probability:2},emotionConfig:{enabled:false}}as any;
 await DB.saveCharacter(char);await DB.deleteAsset('chat_meta_turns_v1_'+char.id);
 const api={baseUrl:'https://mock.invalid/v1',apiKey:'mock',model:'demo',stream:false};
 let hook:ReturnType<typeof useChatAI>;
 function Probe(){hook=useChatAI({char,apiConfig:api as any,userProfile:{name:'用户'}as any,groups:[],emojis:[],categories:[],realtimeConfig:{}as any,addToast:vi.fn(),setMessages:vi.fn(),updateCharacter:vi.fn(),updateUserProfile:vi.fn()});return null;}
 const root=createRoot(document.createElement('div'));
 vi.mocked(safeFetchJson).mockRejectedValue(new Error('captured without network'));
 vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(Math,'random').mockReturnValue(0);
 try{await act(async()=>root.render(createElement(Probe)));
  const capture=async()=>{vi.mocked(safeFetchJson).mockClear();await act(async()=>{await hook.triggerAI(await DB.getRecentMessagesByCharId(char.id,200));});expect(safeFetchJson).toHaveBeenCalled();return JSON.parse(vi.mocked(safeFetchJson).mock.calls[0][1]!.body as string);};
  await DB.saveMessage({charId:char.id,role:'user',type:'text',content:'今天窗外下雨。'}as any);
  const first=await capture();expect(first.messages).toContainEqual({role:'system',content:META_SPARK_PROMPT});
  expect((await capture()).messages).toContainEqual({role:'system',content:META_SPARK_PROMPT});
  await DB.saveMessage({charId:char.id,role:'user',type:'text',content:'你吃饭了吗？'}as any);
  expect((await capture()).messages).toContainEqual({role:'system',content:META_QUIET_PROMPT});
 }finally{act(()=>root.unmount());}
});
