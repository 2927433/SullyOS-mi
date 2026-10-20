import type {APIConfig,CharacterProfile,UserProfile} from '../types';
import { DB } from './db';
import { ContextBuilder } from './context';
import { extractContent,safeResponseJson } from './safeApi';
import { SHIJI_ORDERS,type ShijiApi,type ShijiItem,type ShijiLine,type ShijiMode,type ShijiOrder } from './shijiTypes';
export {shijiMoney} from './shijiTypes';
const text=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
export function parseShijiCatalog(raw:string,mode:ShijiMode):ShijiItem[]{
 const cleaned=raw.replace(/<think>[\s\S]*?<\/think>/gi,'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');let data:any;
 try{data=JSON.parse(cleaned);}catch{throw new Error('模型没有返回有效商品 JSON，旧列表已保留，可手动重试');}
 const rows=Array.isArray(data)?data:data?.items;if(!Array.isArray(rows)||!rows.length)throw new Error('未找到商品，请调整关键词重试');
 const seen=new Set<string>(),items:ShijiItem[]=[];
 for(const row of rows.slice(0,20)){
  const name=text(row?.name,60),price=String(row?.price ?? '');
  if(!name || !/^\d{1,6}(?:\.\d{1,2})?$/.test(price))continue;
  const priceCents=Math.round(Number(price)*100);if(priceCents<1||priceCents>99999999||seen.has(name))continue;
  seen.add(name);items.push({id:crypto.randomUUID(),name,priceCents,mode,description:text(row.description,240),shop:text(row.shop,40)||'拾集小店',category:text(row.category,20)|| (mode==='food'?'餐食':'好物'),emoji:text(row.emoji,8)||(mode==='food'?'🍱':'🎁')});
 }
 if(!items.length)throw new Error('商品名称或价格格式无效，没有替换旧列表');return items;
}
export function resolveShijiApi(global:APIConfig,app?:ShijiApi):APIConfig {
 const api=app?.enabled?app:global;
 if(!api?.baseUrl.trim() || !api.apiKey.trim() || !api.model.trim())throw new Error(app?.enabled?'请完整填写拾集独立 API 地址、Key 和模型':'请先在系统设置中配置全局文本 API');
 const url=new URL(api.baseUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('API 地址格式不正确');
 return {baseUrl:api.baseUrl.trim().replace(/\/+$/,''),apiKey:api.apiKey.trim(),model:api.model.trim()} as APIConfig;
}
export async function generateShijiCatalog(input:{mode:ShijiMode;query:string;api:APIConfig;char?:CharacterProfile;user:UserProfile;previous?:string[];signal?:AbortSignal}):Promise<ShijiItem[]> {
 const {mode,api,char,user}=input;
 const rules=`你是拾集的${mode==='food'?'外卖菜单':'购物商品'}生成器。根据用户搜索生成 8 个不同选项，不搜索真实库存，不索要地址、手机号、付款信息，不声称实际配送。商品名称、介绍和店名保持自然，不添加“虚拟商品”“角色扮演道具”或应用实现说明；不在商品文案中打破当前世界观。只输出 JSON：{"items":[{"name":"商品名","description":"规格/口味与简短介绍","shop":"店名","category":"分类","emoji":"一个相关emoji","price":29.9}]}。price 为人民币元，0.01–999999.99，最多两位小数。输出商品，不输出角色对白或思考。若给出角色资料，只用于匹配品味，不代替用户下单。`;
 const task=[{role:'system',content:rules},{role:'user',content:`搜索：${input.query.trim().slice(0,300)|| (mode==='food'?'今天吃点什么':'日常好物推荐')}。请换一批，避免重复这些名称：${(input.previous || []).slice(0,20).join('、')}`}];
 const messages=char?await ContextBuilder.buildCharacterRequest({char,user},task):task;
 input.signal?.throwIfAborted();
 const response=await fetch(api.baseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+api.apiKey},body:JSON.stringify({model:api.model,messages,stream:false,temperature:0.85,max_tokens:3000}),signal:input.signal?AbortSignal.any([input.signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000)});
 if(!response.ok)throw new Error(`商品请求失败（HTTP ${response.status}），未自动重试`);
 return parseShijiCatalog(String(extractContent(await safeResponseJson(response))||''),mode);
}
export function makeShijiOrder(lines:ShijiLine[],mode:ShijiMode,recipient:{id:string;name:string}|undefined,note=''):ShijiOrder {
 if(!lines.length||lines.length>20)throw new Error('每单请选择 1–20 种商品');
 if(mode==='food'&&!recipient)throw new Error('请先选择外卖送给哪位角色');
 for(const line of lines)if(line.item.mode!==mode||!line.item.name||!Number.isInteger(line.item.priceCents)||line.item.priceCents<1||line.item.priceCents>99999999||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99)throw new Error('商品价格、数量或类型无效');
 const totalCents=lines.reduce((sum,line)=>sum+line.item.priceCents*line.quantity,0);
 return {id:crypto.randomUUID(),createdAt:Date.now(),mode,lines:structuredClone(lines),totalCents,recipientId:recipient?.id || '',recipientName:recipient?.name || '我自己',note:note.trim().slice(0,500)};
}
export async function loadShijiOrders():Promise<ShijiOrder[]>{const raw=await DB.getAssetRaw(SHIJI_ORDERS);if(raw===null)return [];if(!Array.isArray(raw))throw new Error('拾集订单资料格式异常，没有覆盖原数据');return raw.sort((a,b)=>b.createdAt-a.createdAt);}
export async function commitShijiOrder(order:ShijiOrder,share=false):Promise<ShijiOrder>{
 // Keep order economics validated even when called outside the UI.
 const valid=makeShijiOrder(order.lines,order.mode,order.recipientId?{id:order.recipientId,name:order.recipientName}:undefined,order.note);
 if(valid.totalCents!==order.totalCents)throw new Error('订单总额不一致，请重新确认');
 if(order.paymentRequest && (!order.paymentRequest.payerId||!order.paymentRequest.payerName))throw new Error('请选择代付角色');
 if(order.paymentRequest && !(await DB.getAllCharacters()).some(c=>c.id===order.paymentRequest!.payerId))throw new Error('代付角色已不存在');
 if(share&&!order.recipientId&&!order.paymentRequest?.payerId)throw new Error('请先选择接收订单的角色');
 if(order.recipientId && !(await DB.getAllCharacters()).some(c=>c.id===order.recipientId))throw new Error('该角色已不存在，请重新选择');
 return DB.commitShijiOrder(order,share);
}

