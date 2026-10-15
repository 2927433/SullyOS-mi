import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ContextBuilder} from './context';
import {commitShijiOrder,generateShijiCatalog,loadShijiOrders,makeShijiOrder,parseShijiCatalog,resolveShijiApi} from './shiji';
import {DB} from './db';
import {SHIJI_ORDERS} from './shijiTypes';
vi.mock('./context',()=>({ContextBuilder:{buildCharacterRequest:vi.fn(async(_ctx,messages)=>[{role:'system',content:'bound worldbook'},...messages])}}));
const api={baseUrl:'https://model.example/v1',apiKey:'placeholder',model:'model'} as any;
const char={id:'shiji-test-char',name:'角色甲'} as any;
const items=()=>parseShijiCatalog(JSON.stringify({items:[{name:'热汤面',price:18.9,emoji:'🍜',shop:'巷口面馆',description:'热汤鲜面'}]}),'food');
beforeEach(async()=>{vi.restoreAllMocks();vi.mocked(ContextBuilder.buildCharacterRequest).mockClear();await DB.deleteAsset(SHIJI_ORDERS);await DB.saveCharacter(char);});
describe('拾集商品与订单',()=>{
 it('价格转换为整数分，过滤非法价格和重复商品',()=>{
  const result=parseShijiCatalog(JSON.stringify({items:[{name:'杯子',price:19.9},{name:'杯子',price:20},{name:'坏价格',price:-3},{name:'超出精度',price:'1.001'}]}),'goods');expect(result).toHaveLength(1);expect(result[0].priceCents).toBe(1990);
 });
 it('订单总额精确，外卖必须指定角色，拒绝异常数量',()=>{
  const item=items()[0];expect(makeShijiOrder([{item,quantity:3}],'food',char).totalCents).toBe(5670);
  expect(()=>makeShijiOrder([{item,quantity:1}],'food',undefined)).toThrow('哪位角色');expect(()=>makeShijiOrder([{item,quantity:0}],'food',char)).toThrow('无效');
 });
 it('独立 API 采用完整凭据，不会从全局偷偷填 Key',()=>{expect(()=>resolveShijiApi(api,{enabled:true,baseUrl:'https://other/v1',apiKey:'',model:'x'})).toThrow('完整填写');expect(resolveShijiApi(api).apiKey).toBe(api.apiKey);});
 it('为角色生成菜单走已有世界书管线，仅调用文本 API',async()=>{
  const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({items:[{name:'热汤面',price:18.9}]})}}]})));
  await generateShijiCatalog({mode:'food',query:'热汤',api,char,user:{} as any});expect(ContextBuilder.buildCharacterRequest).toHaveBeenCalledOnce();expect(fetcher.mock.calls[0][0]).toBe(api.baseUrl+'/chat/completions');expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).messages[0].content).toBe('bound worldbook');
 });
 it('接口失败不自动重试，也不创建订单',async()=>{
  const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('server error',{status:503}));await expect(generateShijiCatalog({mode:'food',query:'',api,user:{} as any})).rejects.toThrow('503');expect(fetcher).toHaveBeenCalledOnce();expect(await loadShijiOrders()).toHaveLength(0);
 });
 it('订单和聊天原子保存；并发重复分享也只写一条消息',async()=>{
  const order=makeShijiOrder([{item:items()[0],quantity:2}],'food',char,'少辣');
  const saved=await Promise.all([commitShijiOrder(order,true),commitShijiOrder(order,true)]);expect(saved[0].sharedMessageId).toBe(saved[1].sharedMessageId);expect(await loadShijiOrders()).toHaveLength(1);
  const msgs=(await DB.getMessagesByCharId(char.id)).filter(m=>m.metadata?.shijiOrder?.id===order.id);expect(msgs).toHaveLength(1);expect(msgs[0].content).toContain('少辣');expect(msgs[0].content).toContain('¥37.80');
 });
 it('先下单后分享复用同一订单，自己购物不能无目标分享',async()=>{
  const item={...items()[0],mode:'goods' as const};const order=makeShijiOrder([{item,quantity:1}],'goods',char);await commitShijiOrder(order,false);const saved=await commitShijiOrder(order,true);expect(saved.sharedMessageId).toBeDefined();expect(await loadShijiOrders()).toHaveLength(1);
  await expect(commitShijiOrder(makeShijiOrder([{item,quantity:1}],'goods',undefined),true)).rejects.toThrow('选择');
 });
 it('资料异常则事务取消，不出现已分享却没订单的半成功状态',async()=>{
  await DB.saveAssetRaw(SHIJI_ORDERS,'bad data');const order=makeShijiOrder([{item:items()[0],quantity:1}],'food',char);await expect(commitShijiOrder(order,true)).rejects.toThrow();const msgs=(await DB.getMessagesByCharId(char.id)).filter(m=>m.metadata?.shijiOrder?.id===order.id);expect(msgs).toHaveLength(0);expect(await DB.getAssetRaw(SHIJI_ORDERS)).toBe('bad data');
 });
});
