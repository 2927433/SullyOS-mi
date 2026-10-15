export type ShijiMode='goods'|'food';
export interface ShijiItem {id:string;name:string;description:string;shop:string;category:string;emoji:string;priceCents:number;mode:ShijiMode}
export interface ShijiLine {item:ShijiItem;quantity:number}
export interface ShijiOrder {id:string;createdAt:number;mode:ShijiMode;lines:ShijiLine[];totalCents:number;recipientId:string;recipientName:string;note:string;sharedMessageId?:number}
export interface ShijiApi {enabled:boolean;baseUrl:string;apiKey:string;model:string}
export const SHIJI_ORDERS='shiji_orders_v1';

export const shijiMoney=(cents:number)=>'¥'+(cents/100).toFixed(2);
