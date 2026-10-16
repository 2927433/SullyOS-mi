export interface GptImageSettings {
 mode:'official'|'compatible';
 official:{apiKey:string;model:string};
 compatible:{apiKey:string;model:string;baseUrl:string};
 size:string;quality:string;
}
export function normalizeGptImage(value:any):GptImageSettings{
 const text=(v:unknown,fallback='')=>typeof v==='string'?v:fallback;
 return {mode:value?.mode==='compatible'?'compatible':'official',official:{apiKey:text(value?.official?.apiKey),model:text(value?.official?.model,'gpt-image-2.5-sunburst')},compatible:{apiKey:text(value?.compatible?.apiKey),model:text(value?.compatible?.model,'gpt-image-1'),baseUrl:text(value?.compatible?.baseUrl)},size:['auto','1024x1024','1024x1536','1536x1024'].includes(value?.size)?value.size:'auto',quality:['auto','low','medium','high'].includes(value?.quality)?value.quality:'auto'};
}
export function gptImageConnection(value:unknown){
 const settings=normalizeGptImage(value);const profile=settings[settings.mode];
 const raw=settings.mode==='official'?'https://api.openai.com/v1':settings.compatible.baseUrl.trim();
 if(!raw)throw new Error('请填写第三方 GPT 生图 API 地址');
 const url=new URL(raw);
 if(url.protocol!=='https:' || url.username || url.password || url.search || url.hash)throw new Error('GPT 生图地址需要是无账号和查询参数的 HTTPS 地址');
 const base=url.href.replace(/\/+$/,'');
 return {settings,apiKey:profile.apiKey.trim().replace(/^Bearer\s+/i,''),model:profile.model.trim(),endpoint:base.endsWith('/images/generations')?base:base+'/images/generations'};
}
export async function requestGptImage(value:GptImageSettings,prompt:string,signal?:AbortSignal):Promise<{blob:Blob;request:Record<string,unknown>}>{
 const {settings,apiKey,model,endpoint}=gptImageConnection(value);
 if(!apiKey || !model || !prompt.trim())throw new Error('请填写 GPT 生图 Key、模型和画面内容');
 const request={model,prompt,n:1,size:settings.size,quality:settings.quality};
 const timeoutSignal=AbortSignal.timeout(180000),requestSignal=signal?AbortSignal.any([signal,timeoutSignal]):timeoutSignal;
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+apiKey},body:JSON.stringify(request),signal:requestSignal});
  if(!response.ok){let detail='';try{const json=await response.json();detail=typeof json.error?.message==='string'?json.error.message:'';}catch{}
   detail=detail.split(apiKey).join('[已隐藏密钥]').replace(/Bearer\s+\S+/gi,'[已隐藏密钥]').slice(0,300);
   throw new Error(`GPT 生图失败（HTTP ${response.status}）${detail?'：'+detail:''}；未自动重试`);
  }
  const json=await response.json(),item=json.data?.[0];let blob:Blob;
  if(typeof item?.b64_json==='string'){
   if(item.b64_json.length>70*1024*1024)throw new Error('返回图片过大');
   const bytes=Uint8Array.from(atob(item.b64_json),c=>c.charCodeAt(0));
   const type=bytes[0]===137?'image/png':bytes[0]===255?'image/jpeg':bytes[0]===82?'image/webp':'';
   if(!type)throw new Error('返回数据不是支持的 PNG、JPEG 或 WebP 图片');
   blob=new Blob([bytes],{type});
  }else if(typeof item?.url==='string'){
   const url=new URL(item.url);if(url.protocol!=='https:' || url.username || url.password)throw new Error('图片链接无效');
   const downloaded=await fetch(url.href,{signal:requestSignal,credentials:'omit'});
   if(!downloaded.ok || !/^image\/(png|jpeg|webp)/.test(downloaded.headers.get('content-type')||''))throw new Error('图片已生成，但原图下载失败；请勿重复生成');
   blob=await downloaded.blob();
  }else throw new Error('接口未返回 data[0].b64_json 或图片 url；请核对第三方接口格式');
  if(!blob.size || blob.size>50*1024*1024)throw new Error('图片为空或超过 50 MB');
  return {blob,request};
 }catch(error){
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  if(timeoutSignal.aborted)throw new Error('GPT 生图等待超时，未自动重试。请求可能已计费，请检查后再决定重发');
  if(error instanceof TypeError)throw new Error('GPT 生图连接或图片下载失败，请检查地址、网络和跨域支持。未自动重试；已发出请求可能计费');
  throw error;
 }
}
