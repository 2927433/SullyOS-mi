import {parseHealthShortcut,type HealthShortcutData} from './healthShortcut';
import {readHealthFragment} from './healthFragment';
/** Accept a direct JSON payload or an existing shortcut URL, without navigating to it. */
export function parseHealthTransfer(text:string):HealthShortcutData{
 const raw=text.trim();
 if(!raw)throw new Error('请粘贴健康 JSON，或选择快捷指令导出的 JSON 文件');
 if(raw.length>750000)throw new Error('导入内容过大，请仅传当天指标');
 if(raw.startsWith('{'))return parseHealthShortcut(raw);
 if(/^https?:\/\//i.test(raw) || raw.startsWith('#health-import=')){
  const hash=raw.startsWith('#')?raw:new URL(raw).hash;
  const value=readHealthFragment(hash);
  if(value===null)throw new Error('链接中没有 health-import 数据，请改为复制未编码的 JSON');
  return parseHealthShortcut(value);
 }
 if(/^%7b/i.test(raw)){try{return parseHealthShortcut(decodeURIComponent(raw));}catch(e){if(e instanceof URIError)throw new Error('URL 编码数据不完整');throw e;}}
 throw new Error('请粘贴完整 JSON；不要粘贴“字典”等变量名称');
}
export function serializeHealthTransfer(data:HealthShortcutData):string{
 return JSON.stringify({version:1,date:data.date,metrics:data.metrics,...(data.sleep.length?{sleep:data.sleep}:{})});
}
