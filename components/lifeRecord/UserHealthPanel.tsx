import React,{useEffect,useState} from 'react';
import {DB} from '../../utils/db';
import {HEALTH_METRICS,type HealthShortcutData} from '../../utils/healthShortcut';
import {HEALTH_DATA_CHANGED,healthSleepSummary} from '../../utils/userHealth';
import type {LifeRecord} from '../../types';
import './userHealth.css';
export default function UserHealthPanel({onOpenSleep}:{onOpenSleep?:()=>void}){
 const [data,setData]=useState<HealthShortcutData|null>(null),[error,setError]=useState('');
 const [records,setRecords]=useState<LifeRecord[]>([]);
 const reload=async()=>{try{const [snapshot,entries]=await Promise.all([DB.getAssetRaw('health_shortcut_snapshot_v1'),DB.getAllLifeRecords()]);setData(snapshot);setRecords(entries);setError('');}catch{setError('健康记录读取失败，请重试');}};
 useEffect(()=>{void reload();window.addEventListener(HEALTH_DATA_CHANGED,reload);return()=>window.removeEventListener(HEALTH_DATA_CHANGED,reload);},[]);
 const groups=[['日常记录',['steps','walkingDistanceKm','flightsClimbed']],['心脏与生命体征',['restingHeartRate']],['其他已接收数据',['activeEnergyKcal','exerciseMinutes']]] as const;
 return <section className="user-health"><header><div><small>HEALTH SUMMARY</small><h2>健康</h2></div><button onClick={()=>void reload()} aria-label="刷新健康记录">↻</button></header><p className="user-health-date">{data?data.date+' · 接收于 '+new Date(data.receivedAt).toLocaleString():'还没有接收健康数据'}</p>{error&&<p role="alert">{error}</p>}{groups.map(([title,keys])=>{const present=keys.filter(key=>data?.metrics?.[key]!==undefined);return present.length?<section key={title}><h3>{title}</h3><div className="user-health-card">{present.map(key=><div key={key}><span>{HEALTH_METRICS[key].label}</span><strong>{data!.metrics[key].toLocaleString()} <small>{HEALTH_METRICS[key].unit}</small></strong></div>)}</div></section>:null;})}<section><h3>最近睡眠 · 与睡眠页同源</h3><div className="user-health-card"><div><span>{healthSleepSummary(records,data,1)}</span></div></div>{onOpenSleep&&<button className="user-health-sleep-link" onClick={onOpenSleep}>查看 / 编辑睡眠记录</button>}<p className="user-health-date">详细记录优先；只有总时长时显示带日期的快捷指令汇总。导入与编辑统一在“睡眠”页进行。</p></section><div className="user-health-help"><p>展示已接收的快照，不设置运动目标。没有传入的指标不显示，也不补成 0。</p><p>让 char 读取：角色设置 → 生活记录 → 开启总开关及“健康数据”。摘要会发送给你配置的模型；关闭开关即停止后续注入。</p><p>后台主动消息使用上次同步的快照，不代表网页直接连接手表。</p><button onClick={()=>window.dispatchEvent(new Event('sully-health-shortcut-open'))}>导入快捷指令健康数据</button></div></section>;
}
