import {afterEach,describe,it,expect,vi} from 'vitest';
import {normalizeGptImage,gptImageConnection,requestGptImage} from './gptImage';
import {defaultNaiState,buildNaiRequest,exportNaiLibrary,importNaiLibrary,naiSceneInstruction} from './nai';
import {generateNaiImages} from './naiService';
afterEach(()=>vi.restoreAllMocks());
const settings=()=>({...normalizeGptImage(null),official:{apiKey:'test-gpt-key',model:'gpt-image-1'}});
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFh0AAAAASUVORK5CYII=';
describe('GPT 文生图接入',()=>{
 it('官方和第三方使用各自的 Key 和地址，可填完整端点',()=>{
  const s=settings();s.compatible={apiKey:'third-key',model:'custom-model',baseUrl:'https://example.com/v1/images/generations'};
  expect(gptImageConnection(s).apiKey).toBe('test-gpt-key');
  expect(gptImageConnection({...s,mode:'compatible'})).toMatchObject({apiKey:'third-key',endpoint:'https://example.com/v1/images/generations',model:'custom-model'});
 });
 it('返回原始图片，不发送 NAI 参数，失败不重试或回退',async()=>{
  const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({data:[{b64_json:png}]})));
  const result=await requestGptImage(settings(),'园中的白猫');expect(result.blob.type).toBe('image/png');
  const body=JSON.parse(fetcher.mock.calls[0][1]!.body as string);expect(body.n).toBe(1);expect(body).not.toHaveProperty('sampler');
  fetcher.mockResolvedValue(new Response(JSON.stringify({error:{message:'test-gpt-key'}}),{status:429}));
  await expect(requestGptImage(settings(),'猫')).rejects.toThrow('已隐藏密钥');expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('GPT 共用聊天和相册管线，但不会编码 / 发送 NAI 参考图，资料库导出不含 Key',async()=>{
  const s=defaultNaiState();s.provider='gpt';s.gptImage=settings();s.references=[{id:'ref',name:'test',imageToken:'never-read',enabled:true,kind:'style',strength:1,fidelity:1,informationExtracted:1}];s.referenceMode='vibe';
  s.model='invalid NAI display name';s.parameters.width=-1;s.parameters.noise_schedule='native';
  const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({data:[{b64_json:png}]})));
  const images=await generateNaiImages(s,buildNaiRequest(s,'','a garden'),undefined,{useSavedReferences:true});
  expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][0]).toBe('https://api.openai.com/v1/images/generations');expect(images[0].provider).toBe('gpt');
  expect(images[0].request.parameters).not.toHaveProperty('seed');expect(exportNaiLibrary(s)).not.toContain('test-gpt-key');expect(importNaiLibrary(exportNaiLibrary(s),s).gptImage?.official.apiKey).toBe('test-gpt-key');
  s.characters.a={positive:'fixed hair',negative:'',presetId:'',auto:true};expect(naiSceneInstruction(s,'a')).not.toBe('');
 });
});
