import React, { useMemo, useState } from 'react';
import { useOS } from '../context/OSContext';
import { safeFetchJson } from '../utils/safeApi';

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
  const { apiConfig, userProfile, closeApp, characters } = useOS();
  const [tab, setTab] = useState<Tab>('tarot');
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [dream, setDream] = useState('');
  const [card, setCard] = useState(cards[0]);
  const [spread, setSpread] = useState<typeof cards>([]);
  const [question, setQuestion] = useState('');
  const [selectedChar, setSelectedChar] = useState('');
  const [followup, setFollowup] = useState('');
  const [sign, setSign] = useState('天蝎座');
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
      if (!apiConfig?.baseUrl || !apiConfig?.apiKey || !apiConfig?.model) throw new Error('未配置 API');
      const data = await safeFetchJson(`${apiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiConfig.apiKey}` },
        body: JSON.stringify({ model: apiConfig.model, messages: [{ role: 'user', content: prompts[kind] }], temperature: .8, max_tokens: 700 }),
      });
      setResult(data?.choices?.[0]?.message?.content?.trim() || '暂时没有得到回应。');
    } catch (e: any) { setResult(`暂时无法连接解读 API：${e?.message || '请检查设置'}`); }
    finally { setBusy(false); }
  };

  return <div className="h-full w-full overflow-auto text-white" style={{ background: 'radial-gradient(circle at 50% 0%, #30234b 0%, #11121e 54%, #090a12 100%)' }}>
    <div className="mx-auto min-h-full max-w-2xl px-5 py-5">
      <header className="flex items-start justify-between"><div><div className="text-[10px] tracking-[.35em] uppercase text-white/45">A quiet place for signs</div><h1 className="mt-2 text-3xl font-semibold tracking-wide">星梦集</h1><p className="mt-1 text-sm text-white/55">把今天交给一点想象</p></div><button onClick={closeApp} className="rounded-full bg-white/10 px-3 py-1 text-xl text-white/65">×</button></header>
      <div className="mt-7 grid grid-cols-3 gap-2 rounded-2xl bg-white/8 p-1">{tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setResult(''); }} className="rounded-xl px-2 py-3 text-center transition" style={tab === t.id ? { background: `${accent}22`, color: accent } : { color: '#ffffff88' }}><div className="text-xl">{t.icon}</div><div className="mt-1 text-sm">{t.label}</div><div className="text-[9px] uppercase tracking-widest opacity-60">{t.sub}</div></button>)}</div>
      {tab === 'tarot' && <section className="mt-6 rounded-3xl border border-white/15 bg-white/8 p-5 shadow-2xl backdrop-blur-xl"><div className="text-center"><div className="text-[10px] tracking-[.35em] text-[#f4d49b]/70">THREE CARD SPREAD</div><h2 className="mt-2 text-2xl tracking-widest text-[#f4d49b]">命运三牌阵</h2><p className="mt-2 text-sm text-white/55">过去 · 现在 · 未来</p></div><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="写下你的问题，例如：我们之间接下来会怎样？" className="mt-5 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" /><div className="mt-5 grid grid-cols-3 gap-3">{(['过去','现在','未来'] as const).map((pos,i) => <div key={pos} className="text-center"><div className={`mx-auto flex h-44 w-full max-w-[130px] flex-col items-center justify-center rounded-xl border ${spread[i] ? 'border-[#f4d49b]/80 bg-gradient-to-br from-[#4d3a56] to-[#151a33]' : 'border-white/20 bg-black/20'}`}>{spread[i] ? <><div className="text-3xl text-[#f4d49b]">✦</div><div className="mt-3 text-lg text-[#f4d49b]">{spread[i][0]}</div><div className="mt-1 text-[10px] text-white/45">{spread[i][1]}</div></> : <span className="text-3xl text-white/25">?</span>}</div><div className="mt-2 text-xs text-white/55">{pos}</div></div>)}</div><button onClick={() => { const next = [...cards].sort(() => Math.random() - .5).slice(0,3); setSpread(next); setCard(next[0]); setResult(''); }} className="mt-5 w-full rounded-full border border-[#f4d49b]/50 py-3 text-sm text-[#f4d49b]">{spread.length ? '重新洗牌' : '洗牌并抽三张'}</button>{spread.length === 3 && <div className="mt-5 border-t border-white/10 pt-5"><div className="text-sm text-white/60">选择一位角色来解读</div><select value={selectedChar} onChange={e => setSelectedChar(e.target.value)} className="mt-3 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-white outline-none"><option value="" className="bg-[#171626]">选择角色</option>{(characters || []).map(c => <option key={c.id} value={c.name} className="bg-[#171626]">{c.name}</option>)}</select><button disabled={busy || !selectedChar} onClick={() => ask('tarot')} className="mt-3 w-full rounded-full py-3 text-sm text-black disabled:opacity-40" style={{ background: accent }}>{busy ? '解读中…' : '请角色开始解读'}</button>{result && <><textarea value={followup} onChange={e => setFollowup(e.target.value)} placeholder="还想追问什么？" className="mt-4 h-20 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-white/35" /><button disabled={busy || !followup.trim()} onClick={() => ask('tarot')} className="mt-2 w-full rounded-full border border-white/20 py-2 text-sm text-white/75 disabled:opacity-40">继续追问</button></>}</div>}</section>}
      {tab === 'stars' && <section className="mt-6 rounded-3xl border border-white/15 bg-white/8 p-6"><div className="text-center"><div className="text-6xl">♏</div><select value={sign} onChange={e => setSign(e.target.value)} className="mt-3 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-center text-white outline-none">{['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'].map(s => <option className="bg-[#171626]" key={s}>{s}</option>)}</select><p className="mt-4 text-sm text-white/55">{today} · 今日运势</p><button disabled={busy} onClick={() => ask('stars')} className="mt-5 rounded-full px-6 py-2 text-sm text-black" style={{ background: accent }}>{busy ? '观测中…' : '抽取今日运势'}</button></div></section>}
      {tab === 'dream' && <section className="mt-6 rounded-3xl border border-white/15 bg-white/8 p-6"><h2 className="text-xl">把梦留在这里</h2><p className="mt-1 text-sm text-white/50">只记录，不替你下结论。</p><textarea value={dream} onChange={e => setDream(e.target.value)} placeholder="昨晚梦见了什么？" className="mt-5 h-36 w-full resize-none rounded-2xl border border-white/15 bg-black/20 p-4 text-sm text-white outline-none placeholder:text-white/30" /><button disabled={busy || !dream.trim()} onClick={() => ask('dream', dream)} className="mt-4 rounded-full px-6 py-2 text-sm text-black disabled:opacity-40" style={{ background: accent }}>{busy ? '整理中…' : '请角色看看'}</button></section>}
      {result && <div className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/15 bg-black/20 p-5 text-[15px] leading-7 text-white/85">{result}</div>}
      <p className="mt-8 pb-5 text-center text-[11px] text-white/30">解读是陪伴和灵感，不是确定的命运。</p>
    </div>
  </div>;
};
export default AstrologyApp;
