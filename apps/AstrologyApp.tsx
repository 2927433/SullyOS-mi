import React, { useMemo, useState } from 'react';
import { useOS } from '../context/OSContext';
import { safeFetchJson } from '../utils/safeApi';
import { DB } from '../utils/db';
import { AppID } from '../types';

type Tab = 'tarot' | 'stars' | 'dream';
const tabs: { id: Tab; label: string; sub: string; icon: string }[] = [
  { id: 'tarot', label: '塔罗', sub: 'Tarot', icon: '✦' },
  { id: 'stars', label: '星测', sub: 'Stellar', icon: '☾' },
  { id: 'dream', label: '解梦馆', sub: 'Dreams', icon: '◌' },
];
const cards = [
  ['愚者', '新的旅程', '相信第一步的直觉。'], ['星星', '微光指引', '你正在慢慢靠近想要的答案。'],
  ['月亮', '未明之路', '先允许自己暂时看不清。'], ['太阳', '明亮时刻', '值得分享的好消息正在靠近。'],
  ['恋人', '彼此选择', '关系需要诚实，也需要空间。'], ['世界', '圆满收束', '一段旧章节即将合上。'],
];

const AstrologyApp: React.FC = () => {
  const { apiConfig, apiPresets, userProfile, closeApp, characters, openApp, setActiveCharacterId } = useOS();
  const [tab, setTab] = useState<Tab>('tarot');
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [dream, setDream] = useState('');
  const [card, setCard] = useState(cards[0]);
  const [tarotApi, setTarotApi] = useState(() => { try { return JSON.parse(localStorage.getItem('sullyos_mi_nuomi_tarot_api') || '{}'); } catch { return {}; } });
  const [showApi, setShowApi] = useState(false);
  const [deck, setDeck] = useState<number[]>([]);
  const [spread, setSpread] = useState<typeof cards>([]);
  const [question, setQuestion] = useState('');
  const [selectedChar, setSelectedChar] = useState('');
  const [followup, setFollowup] = useState('');
  const [sign, setSign] = useState('天蝎座');
  const [shareChar, setShareChar] = useState('');
  const [savedReadings, setSavedReadings] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('sullyos_mi_nuomi_tarot_history') || '[]'); } catch { return []; } });
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  const accent = tab === 'tarot' ? '#e8b86d' : tab === 'stars' ? '#9cb8ff' : '#c9a8ff';
  const title = useMemo(() => tabs.find(t => t.id === tab)!, [tab]);

  const ask = async (kind: Tab, input = '') => {
    setBusy(true); setResult('');
    const prompts: Record<Tab, string> = {
      tarot: `你是${selectedChar || '温柔而克制的角色'}，保持你的人设和说话方式。为${userProfile?.name || '我'}解读三张塔罗牌：${spread.map((c,i)=>`${['过去','现在','未来'][i]}：${c[0]}（${c[1]}）`).join('；')}。问题是：${question || '我现在最需要知道什么？'}。像私聊一样自然地回应，给出具体建议，不要说自己是AI，不作绝对预言。${followup ? `追问：${followup}` : ''}`,
      stars: `你是温柔的星象记录者。请为${sign}写一段${today}的今日运势，分为关系、行动、提醒三点，避免绝对化预测。`,
      dream: `你是谨慎的梦境记录者。分析下面的梦，只谈可能的情绪和象征，不作医学或预言判断：${input}`,
    };
    try {
      const activeApi = kind === 'tarot' && tarotApi.baseUrl ? tarotApi : apiConfig;
      if (!activeApi?.baseUrl || !activeApi?.apiKey || !activeApi?.model) throw new Error('未配置 API');
      const data = await safeFetchJson(`${activeApi.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeApi.apiKey}` },
        body: JSON.stringify({ model: activeApi.model, messages: [{ role: 'user', content: prompts[kind] }], temperature: .8, max_tokens: 700 }),
      });
      setResult(data?.choices?.[0]?.message?.content?.trim() || '暂时没有得到回应。');
    } catch (e: any) { setResult(`暂时无法连接解读 API：${e?.message || '请检查设置'}`); }
    finally { setBusy(false); }
  };

  const saveReading = () => {
    if (!result || spread.length !== 3) return;
    const item = { id: `${Date.now()}`, createdAt: new Date().toLocaleString('zh-CN'), question, cards: spread.map(c => c[0]), char: selectedChar, text: result };
    const next = [item, ...savedReadings].slice(0, 30); setSavedReadings(next); localStorage.setItem('sullyos_mi_nuomi_tarot_history', JSON.stringify(next));
  };
  const shareReading = async () => {
    if (!result || !shareChar) return;
    await DB.saveMessage({ charId: shareChar, role: 'user', type: 'text', content: `【星梦集·塔罗解读】\n问题：${question || '今日抽牌'}\n牌面：${spread.map((c, i) => `${['过去','现在','未来'][i]}·${c[0]}`).join(' / ')}\n\n${result}` });
    setActiveCharacterId(shareChar); openApp(AppID.Chat);
  };
  const renderReading = (text: string) => text.split('\n').map((line, i) => {
    const heading = line.match(/^#{2,6}\s*(.*)$/);
    if (heading) return <div key={i} className="mt-5 mb-2 text-lg font-semibold tracking-wide text-[#936d72]">{heading[1]}</div>;
    if (/^\s*[-*>]/.test(line)) return <div key={i} className="my-1 pl-4 text-[#6d5a5d]">{line.replace(/^\s*[-*>]\s*/, '• ')}</div>;
    return <div key={i} className="min-h-[1.4em]">{line || '\u00a0'}</div>;
  });

  return <div className="h-full w-full overflow-auto text-[#6d4d53]" style={{ background: 'radial-gradient(circle at 50% -10%, #f1d9dc 0%, #f8eeea 43%, #fffaf5 100%)' }}>
    <div className="mx-auto min-h-full max-w-2xl px-5 py-5">
      <header className="flex items-start justify-between"><div><div className="text-[10px] tracking-[.35em] uppercase text-[#a87982]">A quiet place for signs</div><div className="flex items-center gap-3"><h1 className="mt-2 text-3xl font-semibold tracking-wide text-[#6d4d53]">星梦集</h1><button onClick={() => setShowApi(true)} className="mt-2 rounded-full border border-[#dfc2bd] bg-white/70 px-3 py-1 text-xs text-[#a87982] shadow-sm">API 设置</button></div><p className="mt-1 text-sm text-[#9b7d82]">把今天交给一点想象</p></div><button onClick={closeApp} className="rounded-full border border-[#e5c9c2] bg-white/55 px-3 py-1 text-xl text-[#a87982]">×</button></header>
      <div className="mt-7 grid grid-cols-3 gap-2 rounded-2xl border border-[#ead6d1] bg-white/60 p-1 shadow-[0_8px_25px_rgba(173,113,122,.10)]">{tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setResult(''); }} className="rounded-xl px-2 py-3 text-center transition" style={tab === t.id ? { background: `${accent}22`, color: '#936d72' } : { color: '#b28e93' }}><div className="text-xl">{t.icon}</div><div className="mt-1 text-sm">{t.label}</div><div className="text-[9px] uppercase tracking-widest opacity-60">{t.sub}</div></button>)}</div>
      {tab === 'stars' && <section className="mt-6 rounded-3xl border border-[#ead6d1] bg-white/65 p-6"><div className="text-center"><div className="text-6xl">♏</div><select value={sign} onChange={e => setSign(e.target.value)} className="mt-3 rounded-full border border-[#ead6d1] bg-white/10 px-5 py-2 text-center text-white outline-none">{['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'].map(s => <option className="bg-[#171626]" key={s}>{s}</option>)}</select><p className="mt-4 text-sm text-[#9b7d82]">{today} · 今日运势</p><button disabled={busy} onClick={() => ask('stars')} className="mt-5 rounded-full px-6 py-2 text-sm text-black" style={{ background: accent }}>{busy ? '观测中…' : '抽取今日运势'}</button></div></section>}
      {tab === 'dream' && <section className="mt-6 rounded-3xl border border-[#ead6d1] bg-white/65 p-6"><h2 className="text-xl">把梦留在这里</h2><p className="mt-1 text-sm text-[#9b7d82]">只记录，不替你下结论。</p><textarea value={dream} onChange={e => setDream(e.target.value)} placeholder="昨晚梦见了什么？" className="mt-5 h-36 w-full resize-none rounded-2xl border border-[#ead6d1] bg-white/75 p-4 text-sm text-[#6d4d53] outline-none placeholder:text-[#b28e93]" /><button disabled={busy || !dream.trim()} onClick={() => ask('dream', dream)} className="mt-4 rounded-full px-6 py-2 text-sm text-black disabled:opacity-40" style={{ background: accent }}>{busy ? '整理中…' : '请角色看看'}</button></section>}
      {result && <div className="mt-5 rounded-2xl border border-[#e5c9c2] bg-[#fffaf7]/90 p-5 text-[15px] leading-7 text-[#554347] shadow-[0_10px_30px_rgba(170,115,124,.12)]">{renderReading(result)}<div className="mt-5 flex flex-wrap gap-2 border-t border-[#ecd9d3] pt-4"><button onClick={saveReading} className="rounded-full bg-[#e8c7c2] px-4 py-2 text-sm text-[#6d4d53]">收藏本次解牌</button><select value={shareChar} onChange={e => setShareChar(e.target.value)} className="rounded-full border border-[#dfc2bd] bg-white px-3 py-2 text-sm text-[#6d4d53]"><option value="">选择角色分享</option>{(characters || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button disabled={!shareChar} onClick={shareReading} className="rounded-full bg-[#a87982] px-4 py-2 text-sm text-white disabled:opacity-40">分享到聊天</button></div></div>}
      {tab === 'tarot' && savedReadings.length > 0 && <div className="mt-5 rounded-2xl border border-[#ead3ce] bg-[#fffaf7]/80 p-4 text-[#6d5a5d]"><div className="flex items-center justify-between"><h3 className="font-semibold">收藏的解牌</h3><span className="text-xs opacity-60">{savedReadings.length} 条</span></div>{savedReadings.map(item => <div key={item.id} className="mt-3 flex items-center gap-3 rounded-xl border border-[#efded9] bg-white/70 p-3"><button onClick={() => { setQuestion(item.question); setSelectedChar(item.char || ''); setResult(item.text); setSpread(item.cards.map((n: string) => cards.find(c => c[0] === n) || cards[0])); }} className="min-w-0 flex-1 text-left"><div className="truncate text-sm">{item.question || '今日抽牌'} · {item.cards.join(' / ')}</div><div className="mt-1 text-xs opacity-60">{item.createdAt}</div></button><button onClick={() => { const next = savedReadings.filter(x => x.id !== item.id); setSavedReadings(next); localStorage.setItem('sullyos_mi_nuomi_tarot_history', JSON.stringify(next)); }} className="text-xs text-[#b1787f]">删除</button></div>)}</div>}
      {showApi && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#5b4247]/35 p-5"><div className="w-full max-w-md rounded-[28px] border border-[#e5c9c2] bg-[#fffaf7] p-6 shadow-[0_20px_70px_rgba(100,60,65,.25)]"><div className="flex items-center justify-between"><div><div className="text-[10px] tracking-[.3em] text-[#a87982]">星梦集 · TAROT</div><h3 className="mt-1 text-xl font-semibold text-[#6d4d53]">塔罗 API 设置</h3></div><button onClick={() => setShowApi(false)} className="text-xl text-[#a87982]">×</button></div><p className="mt-2 text-sm text-[#8c7478]">直接选择已保存的 API 预设，用于角色解牌。</p><select value={tarotApi.id || (tarotApi.baseUrl ? 'custom' : '')} onChange={e => { const p = apiPresets.find(x => x.id === e.target.value); if (p) { setTarotApi({ id: p.id, ...p.config }); } else if (!e.target.value) { setTarotApi({}); } }} className="mt-5 w-full rounded-2xl border border-[#e2c9c3] bg-white px-4 py-3 text-[#6d4d53] outline-none"><option value="">跟随聊天默认 · {apiConfig?.model || '未配置'}</option>{apiPresets.map(p => <option key={p.id} value={p.id}>{p.name} · {p.config.model}</option>)}</select><button onClick={() => { localStorage.setItem('sullyos_mi_nuomi_tarot_api', JSON.stringify(tarotApi)); setShowApi(false); }} className="mt-4 w-full rounded-full bg-[#c9939a] py-3 text-sm text-white">应用此预设</button></div></div>}
      <p className="mt-8 pb-5 text-center text-[11px] text-white/30">解读是陪伴和灵感，不是确定的命运。</p>
    </div>
  </div>;
};
export default AstrologyApp;
