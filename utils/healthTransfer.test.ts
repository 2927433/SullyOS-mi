import {describe,it,expect} from 'vitest';
import {parseHealthTransfer,serializeHealthTransfer} from './healthTransfer';
describe('跨隔离存储的健康数据手动传递',()=>{
 const json='{"version":1,"date":"2026-10-16","metrics":{"steps":2042,"restingHeartRate":61}}';
 it('支持原始 JSON、编码 JSON、完整旧链接，无需打开链接',()=>{
  for(const text of [json,encodeURIComponent(json),'https://example.com/phone/#health-import='+encodeURIComponent(json)]){
   expect(parseHealthTransfer(text).metrics).toEqual({steps:2042,restingHeartRate:61});
  }
 });
 it('只导出健康字段，不传输其他存档，往返保存日期',()=>{
  const source={...parseHealthTransfer(json),characters:[{name:'不该复制'}]};
  const exported=serializeHealthTransfer(source);expect(exported).not.toContain('不该复制');expect(parseHealthTransfer(exported).date).toBe('2026-10-16');
 });
 it('拒绝空值、错版本、负数与过大内容，不接受整个应用备份',()=>{
  for(const text of ['',json.replace('"version":1','"version":2'),json.replace('2042','-1'),'x'.repeat(100001),'{"characters":[]}'])expect(()=>parseHealthTransfer(text)).toThrow();
 });
});
