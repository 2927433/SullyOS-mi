import React,{useEffect,useState} from 'react';
import {DB} from '../../utils/db';
import {HEALTH_METRICS,type HealthShortcutData} from '../../utils/healthShortcut';
import {HEALTH_DATA_CHANGED} from '../../utils/userHealth';
import {sleepSummary} from '../../utils/sleepRecords';
import './userHealth.css';
export default function UserHealthPanel(){
 const [data,setData]=useState<HealthShortcutData|null>(null),[error,setError]=useState('');
 const reload=async()=>{try{setData(await DB.getAssetRaw('health_shortcut_snapshot_v1'));setError('');}catch{setError('健康记录读取失败，请重试');}};
 useEffect(()=>{void reload();window.addEventListener(HEALTH_DATA_CHANGED,reload);return()=>window.removeEventListener(HEALTH_DATA_CHANGED,reload);},[]);
 const groups=[['日常记录',['steps','walkingDistanceKm','flightsClimbed']],['心脏与生命体征',['restingHeartRate']],['睡眠',['sleepMinutes']],['其他已接收数据',['activeEnergyKcal','exerciseMinutes']]] as const;
 return <section className="user-health"><header><div><small>HEALTH SUMMARY</small><h2>健康</h2></div><button onClick={()=>void reload()} aria-label="刷新健康记录">↻</button></header><p className="user-health-date">{data?data.date+' · 接收于 '+new Date(data.receivedAt).toLocaleString():'还没有接收健康数据'}</p>{error&&<p role="alert">{error}</p>}{groups.map(([title,keys])=>{const present=keys.filter(key=>data?.metrics?.[key]!==undefined);return present.length?<section key={title}><h3>{title}</h3><div className="user-health-card">{present.map(key=><div key={key}><span>{HEALTH_METRICS[key].label}</span><strong>{data!.metrics[key].toLocaleString()} <small>{HEALTH_METRICS[key].unit}</small></strong></div>)}</div></section>:null;})}{!!data?.sleep?.length&&<section><h3>睡眠详情</h3><div className="user-health-card">{data.sleep.map((sleep,i)=><div key={i}><span>{sleepSummary(sleep)}</span></div>)}</div></section>}<div className="user-health-help"><p>展示已接收的快照，不设置运动目标。没有传入的指标不显示，也不补成 0。</p><p>让 char 读取：角色设置 → 生活记录 → 开启总开关及“健康数据”。摘要会发送给你配置的模型；关闭开关即停止后续注入。</p><p>后台主动消息使用上次同步的快照，不代表网页直接连接手表。</p><button onClick={()=>window.dispatchEvent(new Event('sully-health-shortcut-open'))}>查看快捷指令接收详情</button></div></section>;
}
