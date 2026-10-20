import {shijiMoney,type ShijiOrder} from './shijiTypes';
/** One narrative representation for new shares and existing order-card history. */
export function formatShijiOrderForContext(order:ShijiOrder,viewerId?:string):string{
 const recipient=order.recipientId&&order.recipientId===viewerId?`你（${order.recipientName}）`:order.recipientName;
 const lines=Array.isArray(order.lines)?order.lines.slice(0,20).map(line=>`${line.item?.name} ×${line.quantity} ${shijiMoney(line.item?.priceCents*line.quantity)}`).join('\n'):'';
 const payment=order.paymentRequest?`[拾集代付请求] 请${order.paymentRequest.payerId===viewerId?'你':order.paymentRequest.payerName}帮我代付这份订单，可以同意或拒绝。这是代付请求，不代表已经付款。\n`:'';
 return payment+`[拾集${order.mode==='food'?'外卖':'购物'}订单]\n收件人：${recipient}\n${lines}\n合计：${shijiMoney(order.totalCents)}${order.note?'\n留言：'+order.note:''}\n[订单状态：${order.paymentRequest?'待确认代付':'已创建'}。按你们既有世界观，把这份${order.mode==='food'?'点餐':'送礼'}当作日常互动，直接接住用户的心意；收件人写你自己的名字就是送给你。已创建不等于已经送达，不编造已签收、吃完或付款。不要解释应用实现，不借此展开跨次元话题，也不沿用旧消息里的系统化订单说明。]`;
}
