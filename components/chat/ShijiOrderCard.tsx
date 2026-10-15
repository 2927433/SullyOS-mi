import React from 'react';
import type {ShijiOrder} from '../../utils/shijiTypes';
import {shijiMoney} from '../../utils/shijiTypes';
export default function ShijiOrderCard({order}:{order:ShijiOrder}) {
 return <div className="w-64 max-w-full overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm text-slate-700"><div className="bg-orange-50 px-4 py-3 flex justify-between text-xs"><strong>拾集 · {order.mode==='food'?'外卖':'好物'}</strong><span>订单已创建</span></div><div className="p-4 space-y-2"><p className="text-xs text-slate-500">送给 {order.recipientName}</p>{Array.isArray(order.lines)&&order.lines.slice(0,20).map((line,i)=><div key={i} className="flex justify-between gap-2 text-sm"><span className="min-w-0 break-words">{line.item?.emoji} {line.item?.name} ×{line.quantity}</span><span className="shrink-0">{shijiMoney(line.item?.priceCents*line.quantity)}</span></div>)}{order.note&&<p className="text-xs break-words text-slate-500">留言：{order.note}</p>}<p className="border-t border-orange-100 pt-2 text-right font-bold">合计 {shijiMoney(order.totalCents)}</p><p className="text-[10px] text-slate-400">小手机内订单 · 非真实配送</p></div></div>;
}
