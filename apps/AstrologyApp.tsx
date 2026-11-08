import React, { useEffect, useMemo, useState } from 'react';
import { useOS } from '../context/OSContext';
import { safeFetchJson } from '../utils/safeApi';
import { DB } from '../utils/db';
import { AppID } from '../types';

type Tab = 'tarot' | 'stars' | 'dream';
type ApiChoice = { id?: string; baseUrl?: string; apiKey?: string; model?: string };
type TarotCard = { name: string; keyword: string; note: string; glyph: string };
type SavedReading = { id: string; createdAt: string; question: string; cards: TarotCard[]; char?: string; text: string };
type StarReading = { id: string; createdAt: string; kind: 'daily' | 'synastry'; title: string; text: string; userBirthDate: string; charName?: string; charBirthDate?: string };
type Zodiac = { name: string; glyph: string; from: string; to: string };

const zodiacs: Zodiac[] = [
  { name: 'Capricorn', glyph: '♑', from: '12-22', to: '01-19' }, { name: 'Aquarius', glyph: '♒', from: '01-20', to: '02-18' },
  { name: 'Pisces', glyph: '♓', from: '02-19', to: '03-20' }, { name: 'Aries', glyph: '♈', from: '03-21', to: '04-19' },
  { name: 'Taurus', glyph: '♉', from: '04-20', to: '05-20' }, { name: 'Gemini', glyph: '♊', from: '05-21', to: '06-21' },
  { name: 'Cancer', glyph: '♋', from: '06-22', to: '07-22' }, { name: 'Leo', glyph: '♌', from: '07-23', to: '08-22' },
  { name: 'Virgo', glyph: '♍', from: '08-23', to: '09-22' }, { name: 'Libra', glyph: '♎', from: '09-23', to: '10-23' },
  { name: 'Scorpio', glyph: '♏', from: '10-24', to: '11-22' }, { name: 'Sagittarius', glyph: '♐', from: '11-23', to: '12-21' },
];
const zodiacForDate = (value: string): Zodiac | null => {
  const match = value.match(/^\d{4}-(\d{2})-(\d{2})$/); if (!match) return null;
  const monthDay = `${match[1]}-${match[2]}`;
  return zodiacs.find((zodiac) => zodiac.from <= zodiac.to ? monthDay >= zodiac.from && monthDay <= zodiac.to : monthDay >= zodiac.from || monthDay <= zodiac.to) || null;
};
const readJson = <T,>(key: string, fallback: T): T => { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value == null ? fallback : value as T; } catch { return fallback; } };
const writeJson = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

const tabs: { id: Tab; label: string; sub: string; icon: string }[] = [
  { id: 'tarot', label: '塔罗', sub: 'Tarot', icon: '✦' },
  { id: 'stars', label: '星测', sub: 'Stellar', icon: '☾' },
  { id: 'dream', label: '解梦馆', sub: 'Dreams', icon: '◌' },
];

const cards: TarotCard[] = [
  { name: '愚者', keyword: '新的旅程', note: '相信第一步的直觉。', glyph: '✧' }, { name: '魔术师', keyword: '把想法变成现实', note: '你手里已经有足够的工具。', glyph: '☿' },
  { name: '女祭司', keyword: '安静的知道', note: '先听见心里的声音，再决定。', glyph: '☾' }, { name: '皇后', keyword: '滋养与丰盛', note: '让关系和生活留一点柔软。', glyph: '❀' },
  { name: '皇帝', keyword: '边界与秩序', note: '把重要的事情放回自己的掌控。', glyph: '♜' }, { name: '恋人', keyword: '彼此选择', note: '诚实、靠近，也保留空间。', glyph: '♡' },
  { name: '战车', keyword: '向前', note: '方向明确时，犹豫会变轻。', glyph: '✦' }, { name: '力量', keyword: '温柔的勇气', note: '不必大声，也可以坚持。', glyph: '∞' },
  { name: '隐者', keyword: '回到内心', note: '暂时独处，是为了找回自己的灯。', glyph: '⌁' }, { name: '命运之轮', keyword: '流动', note: '变化正在打开另一种可能。', glyph: '◉' },
  { name: '正义', keyword: '如实看见', note: '平衡不是冷漠，而是清楚。', glyph: '⚖' }, { name: '倒吊人', keyword: '换个角度', note: '暂停并不等于后退。', glyph: '⋈' },
  { name: '死神', keyword: '结束与转化', note: '旧的形式正在为新的空间让路。', glyph: '✣' }, { name: '节制', keyword: '调和', note: '慢慢把两种需要放在同一张桌上。', glyph: '♧' },
  { name: '恶魔', keyword: '看见束缚', note: '你可以重新选择与什么相处。', glyph: '◇' }, { name: '高塔', keyword: '真相落地', note: '裂开的地方也可能带来空气。', glyph: '⚡' },
  { name: '星星', keyword: '微光指引', note: '希望不必喧哗，也会持续发亮。', glyph: '☆' }, { name: '月亮', keyword: '未明之路', note: '先允许自己暂时看不清。', glyph: '☽' },
  { name: '太阳', keyword: '明亮时刻', note: '值得分享的好消息正在靠近。', glyph: '☼' }, { name: '审判', keyword: '回应召唤', note: '你已经知道下一步要面对什么。', glyph: '♢' },
  { name: '世界', keyword: '圆满收束', note: '一段旧章节即将合上。', glyph: '◎' },
];

const deepRose = '#6f4c56';
const cardBack = `${import.meta.env.BASE_URL}sully/tarot/tarot-card-back.png`;
const catAsset = `${import.meta.env.BASE_URL}sully/tarot/rose-cat.png`;
const TAROT_HISTORY = 'sullyos_mi_nuomi_tarot_history';
const STAR_HISTORY = 'sullyos_mi_nuomi_star_history';
const BIRTH_DATE = 'sullyos_mi_nuomi_star_birthdate';
const CHAR_BIRTH_DATES = 'sullyos_mi_nuomi_char_birthdates';

const hydrateCards = (raw: unknown): TarotCard[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') return cards.find((card) => card.name === item) || cards[0];
    const value = item as Partial<TarotCard>;
    return cards.find((card) => card.name === value.name) || { name: value.name || '未知牌', keyword: value.keyword || '留给你自己的答案', note: value.note || '', glyph: value.glyph || '✦' };
  }).slice(0, 3);
};

const AstrologyApp: React.FC = () => {
  const { apiConfig, apiPresets, userProfile, closeApp, characters, openApp, setActiveCharacterId } = useOS();
  const [tab, setTab] = useState<Tab>('tarot');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [dream, setDream] = useState('');
  const [deckSlots, setDeckSlots] = useState(() => Array.from({ length: 12 }, (_, index) => index));
  const [pickedSlots, setPickedSlots] = useState<number[]>([]);
  const [spread, setSpread] = useState<TarotCard[]>([]);
  const [question, setQuestion] = useState('');
  const [selectedChar, setSelectedChar] = useState('');
  const [followup, setFollowup] = useState('');
  const [shareChar, setShareChar] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showApi, setShowApi] = useState(false);
  const [tarotApi, setTarotApi] = useState<ApiChoice>(() => readJson<ApiChoice>('sullyos_mi_nuomi_tarot_api', {}));
  const [savedReadings, setSavedReadings] = useState<SavedReading[]>(() => readJson<SavedReading[]>(TAROT_HISTORY, []));
  const [birthDate, setBirthDate] = useState(() => localStorage.getItem(BIRTH_DATE) || '');
  const [starResult, setStarResult] = useState('');
  const [starResultKind, setStarResultKind] = useState<'daily' | 'synastry'>('daily');
  const [starHistoryOpen, setStarHistoryOpen] = useState(false);
  const [starHistory, setStarHistory] = useState<StarReading[]>(() => readJson<StarReading[]>(STAR_HISTORY, []));
  const [starShareChar, setStarShareChar] = useState('');
  const [synastryChar, setSynastryChar] = useState('');
  const [charBirthDate, setCharBirthDate] = useState('');
  const [birthdayMode, setBirthdayMode] = useState<'manual' | 'ai'>('manual');
  const [charBirthDates, setCharBirthDates] = useState<Record<string, string>>(() => readJson<Record<string, string>>(CHAR_BIRTH_DATES, {}));
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  const chosenCharacter = characters?.find((character) => character.id === selectedChar);
  const synastryCharacter = characters?.find((character) => character.id === synastryChar);
  const synastryContext = synastryCharacter ? [synastryCharacter.description, synastryCharacter.worldview, synastryCharacter.systemPrompt].filter(Boolean).join('\n').slice(0, 5000) : '';
  const userZodiac = useMemo(() => zodiacForDate(birthDate), [birthDate]);
  const charZodiac = useMemo(() => zodiacForDate(charBirthDate), [charBirthDate]);

  useEffect(() => { if (synastryChar) setCharBirthDate(charBirthDates[synastryChar] || ''); else setCharBirthDate(''); }, [synastryChar, charBirthDates]);
  const updateBirthDate = (value: string) => { setBirthDate(value); localStorage.setItem(BIRTH_DATE, value); setStarResult(''); };
  const updateCharBirthDate = (value: string) => { setCharBirthDate(value); if (synastryChar) { const next = { ...charBirthDates, [synastryChar]: value }; setCharBirthDates(next); writeJson(CHAR_BIRTH_DATES, next); } };

  const shuffle = () => {
    setDeckSlots(Array.from({ length: 12 }, (_, index) => index).sort(() => Math.random() - 0.5));
    setPickedSlots([]); setSpread([]); setResult(''); setFollowup('');
  };
  const pickCard = (slot: number) => {
    if (pickedSlots.includes(slot) || spread.length >= 3) return;
    const available = cards.filter((card) => !spread.some((picked) => picked.name === card.name));
    const picked = available[Math.floor(Math.random() * available.length)] || cards[0];
    setPickedSlots((value) => [...value, slot]); setSpread((value) => [...value, picked]); setResult('');
  };

  const getApi = (kind: 'tarot' | 'stars' | 'dream'): ApiChoice => kind === 'tarot' && tarotApi.baseUrl ? tarotApi : apiConfig;
  const callApi = async (prompt: string, kind: 'tarot' | 'stars' | 'dream') => {
    const activeApi = getApi(kind);
    if (!activeApi?.baseUrl || !activeApi?.apiKey || !activeApi?.model) throw new Error('未配置 API');
    const data = await safeFetchJson(`${activeApi.baseUrl.replace(/\/+$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeApi.apiKey}` }, body: JSON.stringify({ model: activeApi.model, messages: [{ role: 'user', content: prompt }], temperature: .8, max_tokens: 1100 }) });
    return data?.choices?.[0]?.message?.content?.trim() || '暂时没有得到回应。';
  };
  const ask = async (kind: 'tarot' | 'dream', input = '') => {
    if (kind === 'tarot' && spread.length !== 3) return;
    setBusy(true); setResult('');
    const prompt = kind === 'tarot'
      ? `你是${chosenCharacter?.name || '一位温柔而克制的角色'}，保持角色的人设、语气和世界观。不要提及AI、系统、提示词或“虚拟角色”。为${userProfile?.name || '我'}解读这组三张塔罗牌：${spread.map((card, index) => `${positionsLabel(index)}：${card.name}（${card.keyword}）`).join('；')}。我的问题是：${question || '我现在最需要知道什么？'}。请像私聊一样自然回答，结合牌面给出具体、温和、有边界的观察和建议，不作绝对预言，不替我做决定。${followup ? `这是我的追问：${followup}` : ''}`
      : `你是谨慎的梦境记录者。分析下面的梦，只谈可能的情绪和象征：${input}`;
    try { setResult(await callApi(prompt, kind)); } catch (error: any) { setResult(`暂时无法连接解读 API：${error?.message || '请检查设置'}`); } finally { setBusy(false); }
  };
  const saveStar = (kind: 'daily' | 'synastry', text: string, title: string, charDate?: string) => { const next = [{ id: `${Date.now()}`, createdAt: new Date().toLocaleString('zh-CN'), kind, title, text, userBirthDate: birthDate, charName: synastryCharacter?.name, charBirthDate: charDate }, ...starHistory].slice(0, 3); setStarHistory(next); writeJson(STAR_HISTORY, next); };
  const askDailyStars = async () => {
    if (!userZodiac) return;
    setBusy(true); setStarResult('');
    try { const text = await callApi(`请以${userZodiac.name}（生日 ${birthDate}）为基础，写${today}的个人星象手记。分成“关系”“行动”“提醒”三段，结合日常可执行的小建议，语气像一位熟悉我的朋友，避免套话。`, 'stars'); setStarResult(text); setStarResultKind('daily'); saveStar('daily', text, `${today} · ${userZodiac.name} 今日运势`); } catch (error: any) { setStarResult(`暂时无法连接星测 API：${error?.message || '请检查设置'}`); } finally { setBusy(false); }
  };
  const askSynastry = async () => {
    if (!userZodiac || !synastryCharacter) return;
    setBusy(true); setStarResult('');
    const other = charBirthDate && charZodiac ? `${charBirthDate} · ${charZodiac.name}` : `未提供生日，请根据以下角色设定、记忆和聊天语境推断可能的生日或星象线索，并明确这是推断：\n${synastryContext}`;
    try { const text = await callApi(`请做一份轻松、具体的关系合盘讨论：我方生日 ${birthDate}（${userZodiac.name}），对方角色“${synastryCharacter.name}”，对方信息：${other}。从相处节奏、沟通方式、亲密感和容易卡住的地方来写，保留角色口吻，给出适合我们聊天讨论的问题，不要写免责声明。`, 'stars'); setStarResult(text); setStarResultKind('synastry'); saveStar('synastry', text, `我与${synastryCharacter.name}的合盘`, charBirthDate || undefined); } catch (error: any) { setStarResult(`暂时无法连接星测 API：${error?.message || '请检查设置'}`); } finally { setBusy(false); }
  };
  const shareStar = async () => { if (!starResult || !starShareChar) return; const title = starResultKind === 'daily' ? `${today} · ${userZodiac?.name || '星测'}` : `我与${synastryCharacter?.name || '角色'}的合盘`; await DB.saveMessage({ charId: starShareChar, role: 'user', type: 'text', content: `【星梦集·${starResultKind === 'daily' ? '今日运势' : '合盘讨论'}】\n${title}\n\n${starResult}` }); setActiveCharacterId(starShareChar); openApp(AppID.Chat); };
  const openStarReading = (item: StarReading) => { setBirthDate(item.userBirthDate || ''); localStorage.setItem(BIRTH_DATE, item.userBirthDate || ''); setStarResult(item.text); setStarResultKind(item.kind); setStarHistoryOpen(false); setTab('stars'); };

  const saveReading = () => {
    if (!result || spread.length !== 3) return;
    const item: SavedReading = { id: `${Date.now()}`, createdAt: new Date().toLocaleString('zh-CN'), question, cards: spread, char: selectedChar, text: result };
    const next = [item, ...savedReadings].slice(0, 30); setSavedReadings(next); writeJson(TAROT_HISTORY, next); setHistoryOpen(true);
  };
  const deleteReading = (id: string) => { const next = savedReadings.filter((item) => item.id !== id); setSavedReadings(next); writeJson(TAROT_HISTORY, next); };
  const openReading = (item: SavedReading) => { setQuestion(item.question || ''); setSelectedChar(item.char || ''); setSpread(hydrateCards(item.cards)); setPickedSlots([0, 1, 2]); setResult(item.text || ''); setTab('tarot'); setHistoryOpen(false); };
  const shareReading = async () => {
    if (!result || !shareChar) return;
    await DB.saveMessage({ charId: shareChar, role: 'user', type: 'text', content: `【星梦集·塔罗解读】\n问题：${question || '今日抽牌'}\n牌面：${spread.map((card, index) => `${positionsLabel(index)}·${card.name}`).join(' / ')}\n\n${result}` });
    setActiveCharacterId(shareChar); openApp(AppID.Chat);
  };
  const renderReading = (text: string) => text.split('\n').map((line, index) => { const heading = line.match(/^#{2,6}\s*(.*)$/); if (heading) return <div key={index} className="mb-2 mt-5 text-lg font-semibold tracking-wide text-[#9b6871]">{heading[1]}</div>; if (/^\s*[-*>]/.test(line)) return <div key={index} className="my-1 pl-4 text-[#735961]">• {line.replace(/^\s*[-*>]\s*/, '')}</div>; return <div key={index} className="min-h-[1.4em]">{line || '\u00a0'}</div>; });

  return <div className="h-full w-full overflow-auto text-[#6f4c56]" style={{ background: 'radial-gradient(circle at 18% 0%, #f7e0e3 0, transparent 35%), radial-gradient(circle at 90% 16%, #f4e8dd 0, transparent 34%), #fffaf4' }}>
    <div className="mx-auto min-h-full max-w-3xl px-3 py-3 sm:px-6 sm:py-6">
      <header className="relative overflow-hidden rounded-[30px] border border-[#e5c7c5] bg-[#fffaf3]/85 px-5 py-4 shadow-[0_18px_45px_rgba(173,116,124,.14)] backdrop-blur-xl"><div className="pointer-events-none absolute inset-x-0 top-0 h-2 opacity-70" style={{ backgroundImage: 'radial-gradient(circle, #e3aeb7 1px, transparent 1.5px)', backgroundSize: '12px 6px' }} /><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#e6c0c2] bg-[#f6e1e2] shadow-inner"><img src={catAsset} alt="粉樱猫咪" className="h-full w-full object-contain" /></div><div><div className="text-[10px] uppercase tracking-[.34em] text-[#b4878e]">A quiet place for signs</div><h1 className="mt-1 text-3xl font-semibold tracking-wide text-[#6f4c56]">星梦集</h1><p className="mt-1 text-sm text-[#9c7b82]">把今天交给一点想象</p></div></div><div className="flex items-center gap-2"><button onClick={() => setHistoryOpen(true)} className="rounded-full border border-[#e2c2c2] bg-white/70 px-3 py-2 text-xs text-[#a8737c]">历史收藏{savedReadings.length ? ` · ${savedReadings.length}` : ''}</button><button onClick={() => setShowApi(true)} className="rounded-full border border-[#dfb9bd] bg-[#f6e6e4] px-3 py-2 text-xs text-[#9d6872] shadow-sm">API 设置</button><button onClick={closeApp} className="rounded-full border border-[#e5c9c2] bg-white/65 px-3 py-1 text-xl text-[#a87982]">×</button></div></div></header>
      <nav className="mt-3 grid grid-cols-3 gap-1 rounded-[26px] border border-[#e6c9c5] bg-[#fffaf5]/80 p-1.5 shadow-[0_10px_28px_rgba(173,113,122,.11)] backdrop-blur-xl">{tabs.map((item) => <button key={item.id} onClick={() => { setTab(item.id); setResult(''); }} className="rounded-[20px] px-2 py-3 text-center transition" style={tab === item.id ? { background: '#f3e1d9', color: deepRose, boxShadow: 'inset 0 0 0 1px rgba(213,166,163,.45)' } : { color: '#b28e93' }}><div className="text-xl">{item.icon}</div><div className="mt-1 text-sm">{item.label}</div><div className="text-[9px] uppercase tracking-widest opacity-60">{item.sub}</div></button>)}</nav>
      {tab === 'tarot' && <section className="mt-3 overflow-hidden rounded-[28px] border border-[#e6c4c2] bg-[#fffaf6]/80 p-3 shadow-[0_18px_55px_rgba(173,116,124,.13)] backdrop-blur-xl sm:mt-5 sm:rounded-[34px] sm:p-6">
        <div className="flex items-end justify-between gap-2"><div><div className="text-[9px] uppercase tracking-[.3em] text-[#b4878e] sm:text-[10px]">Choose three cards</div><h2 className="mt-1 text-xl font-semibold text-[#79525d] sm:text-2xl">今日的三重镜</h2><p className="mt-1 text-xs text-[#a17d84] sm:text-sm">先洗牌，再从牌堆里亲自选出三张。</p></div><div className="hidden text-right text-xs text-[#b28e93] sm:block">01 选牌 · 02 翻牌 · 03 解读</div></div>
        <div className="mt-3 rounded-[22px] border border-[#edd3cb] bg-[#f8ece6]/65 p-3 sm:mt-5 sm:rounded-[26px] sm:p-4"><label className="text-xs tracking-[.16em] text-[#aa7a83]">心里正在想什么？</label><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：我们之间的关系接下来会如何发展？" className="mt-2 h-16 w-full resize-none rounded-2xl border border-[#e1c6c3] bg-[#fffaf6]/85 p-3 text-sm text-[#6f4c56] outline-none placeholder:text-[#b99da1] sm:h-20" /><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-[#b18b91] sm:text-xs">已选择 {spread.length} / 3 张</span><button onClick={shuffle} className="rounded-full bg-[#c9919a] px-4 py-2 text-xs text-white shadow-[0_8px_18px_rgba(183,125,133,.22)] sm:px-5 sm:py-2.5 sm:text-sm">洗牌重来</button></div></div>
        <div className="mt-4 rounded-[22px] border border-dashed border-[#e5c9c2] bg-[#fff9f2]/55 p-3 sm:mt-5 sm:rounded-[28px] sm:p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold text-[#875d67]">牌堆</span><span className="text-[11px] text-[#b18b91]">点击一张牌加入牌阵</span></div><div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">{deckSlots.map((slot) => { const picked = pickedSlots.includes(slot); return <button key={slot} disabled={picked || spread.length >= 3} onClick={() => pickCard(slot)} className={`relative aspect-[2/3] overflow-hidden rounded-xl border transition sm:rounded-2xl ${picked ? 'border-[#d8b2b3] opacity-30' : 'border-[#e1bfb7] bg-[#f3d8d4] shadow-[0_5px_12px_rgba(142,101,104,.12)] hover:-translate-y-1'}`} style={{ backgroundImage: picked ? undefined : `url(${cardBack})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>{picked ? <span className="text-xs text-[#b18b91]">已选</span> : <span className="absolute inset-x-0 bottom-1 text-[9px] tracking-widest text-white drop-shadow sm:bottom-2 sm:text-[10px]">选择</span>}</button>; })}</div></div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-4">{['过去', '现在', '未来'].map((position, index) => { const card = spread[index]; return <div key={position} className="rounded-2xl border border-[#e2c1bb] bg-[#fff9f4]/80 p-2 text-center sm:p-3"><div className="text-[10px] tracking-[.14em] text-[#b18b91]">{position}</div><div className="mt-2 flex aspect-[2/3] items-center justify-center rounded-xl border border-[#eed3c8] bg-[linear-gradient(145deg,#fff8ed,#f2d7d5)] px-1 text-center text-xs text-[#7a4f58] sm:text-sm">{card ? <span><span className="block text-2xl text-[#b88465] sm:text-3xl">{card.glyph}</span><span className="mt-1 block font-semibold">{card.name}</span><span className="mt-1 block text-[9px] text-[#b37b84] sm:text-[10px]">{card.keyword}</span></span> : <span className="text-[#c4a2a3]">待选择</span>}</div></div>; })}</div>
        {spread.length === 3 && <div className="mt-4 grid gap-3 rounded-[22px] border border-[#e7ccc6] bg-[#fffaf7]/80 p-3 sm:mt-5 sm:grid-cols-[1fr_auto] sm:items-end sm:rounded-[26px] sm:p-4"><div><label className="text-xs tracking-[.14em] text-[#a87982]">选择解读者</label><select value={selectedChar} onChange={(event) => setSelectedChar(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#dfc3bf] bg-white/80 px-3 py-3 text-sm text-[#6f4c56] outline-none"><option value="">所有未选角色 · 使用通用语气</option>{(characters || []).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></div><button disabled={busy} onClick={() => ask('tarot')} className="rounded-full bg-[#b77d85] px-6 py-3 text-sm text-white shadow-[0_8px_18px_rgba(183,125,133,.22)] disabled:opacity-40">{busy ? '正在解读…' : '请角色解读'}</button></div>}
        {result && <div className="mt-4 rounded-[24px] border border-[#e2c1bf] bg-[#fffaf8]/92 p-4 text-[15px] leading-7 text-[#59454a] shadow-[0_12px_30px_rgba(173,113,122,.12)] sm:mt-5 sm:rounded-[26px] sm:p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#edd8d2] pb-3"><div><div className="text-[10px] uppercase tracking-[.28em] text-[#b4878e]">reading notes</div><div className="mt-1 font-semibold text-[#875d67]">{chosenCharacter?.name || '星梦集'} 的解读</div></div><span className="text-xs text-[#b18b91]">{spread.map((card) => card.name).join(' · ')}</span></div>{renderReading(result)}<div className="mt-4 border-t border-[#ecd9d3] pt-3"><textarea value={followup} onChange={(event) => setFollowup(event.target.value)} placeholder="想追问什么？可以继续问这一组三张牌。" className="h-16 w-full resize-none rounded-2xl border border-[#e1c6c3] bg-white/75 p-3 text-sm text-[#6f4c56] outline-none placeholder:text-[#b99da1]" /><div className="mt-3 grid gap-2 sm:flex sm:flex-wrap"><button disabled={busy || !followup.trim()} onClick={() => ask('tarot')} className="rounded-full bg-[#e8c7c2] px-4 py-2 text-sm text-[#6d4d53] disabled:opacity-40">继续追问</button><button onClick={saveReading} className="rounded-full border border-[#d8b2b3] bg-[#fff2ec] px-4 py-2 text-sm text-[#855d66]">收藏本次解牌</button><select value={shareChar} onChange={(event) => setShareChar(event.target.value)} className="rounded-full border border-[#dfc2bd] bg-white px-3 py-2 text-sm text-[#6d4d53]"><option value="">选择角色分享</option>{(characters || []).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select><button disabled={!shareChar} onClick={shareReading} className="rounded-full bg-[#a87982] px-4 py-2 text-sm text-white disabled:opacity-40">分享到聊天</button></div></div></div>}
        {!spread.length && <div className="mt-4 flex min-h-[180px] items-center justify-center rounded-[24px] border border-[#e5c9c2] bg-[#fff9f2]/50 p-5 text-center sm:min-h-[220px]"><div><img src={catAsset} alt="粉樱猫咪" className="mx-auto h-20 object-contain sm:h-28" onError={(event) => { event.currentTarget.style.display = 'none'; }} /><p className="mt-2 text-sm text-[#a17d84]">从上方牌堆里选择三张牌。</p><p className="mt-1 text-xs text-[#c09ea0]">每张牌都会放入过去、现在、未来的位置。</p></div></div>}
      </section>}      {tab === 'stars' && <section className="mt-3 space-y-4 sm:mt-5">
        <div className="rounded-[30px] border border-[#e6c4c2] bg-[#fffaf6]/80 p-5 shadow-[0_18px_55px_rgba(173,116,124,.13)] backdrop-blur-xl sm:p-7">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[.42em] text-[#bb9298]">THE CONSTELLATION JOURNAL</div>
            <h2 className="mt-3 text-4xl font-normal tracking-wide text-[#79525d] sm:text-5xl" style={{ fontFamily: "'Brush Script MT','Segoe Script','Snell Roundhand',cursive" }}>与星星的共鸣</h2>
            <p className="mt-2 text-xs uppercase tracking-[.24em] text-[#b18b91]">A quiet conversation with the sky</p>
          </div>
          <div className="mx-auto mt-7 max-w-sm">
            <label className="text-[10px] uppercase tracking-[.28em] text-[#a87982]">BIRTH DATE</label>
            <input type="date" value={birthDate} onChange={(event) => updateBirthDate(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#dfc3bf] bg-white/85 px-4 py-3 text-sm text-[#6f4c56] outline-none" />
            {userZodiac ? <div className="mt-5 border-y border-[#ead3ce] py-4 text-center"><div className="text-3xl text-[#a87882]" style={{ fontFamily: "'Brush Script MT','Segoe Script','Snell Roundhand',cursive" }}>{userZodiac.name}</div><div className="mt-1 text-[10px] uppercase tracking-[.26em] text-[#b18b91]">{userZodiac.from} · {userZodiac.to}</div></div> : <div className="mt-5 border-y border-[#ead3ce] py-4 text-center text-xs text-[#b18b91]">Set your birthday to find your constellation</div>}
          </div>
          <div className="mt-6 text-center"><p className="text-sm text-[#9b7d82]">{today} · Daily sky note</p><button disabled={busy || !userZodiac} onClick={askDailyStars} className="mt-3 rounded-full bg-[#c9919a] px-7 py-2.5 text-sm text-white shadow-[0_8px_18px_rgba(183,125,133,.2)] disabled:opacity-40">{busy ? '观测中…' : 'Read today’s sky'}</button></div>
        </div>
        <div className="rounded-[30px] border border-[#e6c4c2] bg-[#fffaf6]/80 p-5 shadow-[0_18px_55px_rgba(173,116,124,.13)] sm:p-7">
          <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-[.32em] text-[#b4878e]">SYNNASTRY NOTES</div><h2 className="mt-2 text-3xl font-normal text-[#79525d]" style={{ fontFamily: "'Brush Script MT','Segoe Script','Snell Roundhand',cursive" }}>Written in the stars</h2></div><button onClick={() => setStarHistoryOpen(true)} className="rounded-full border border-[#e2c2c2] bg-white/70 px-3 py-2 text-xs text-[#a8737c]">History · 3</button></div>
          <p className="mt-2 text-sm text-[#9b7d82]">Choose a character and open a gentle conversation between two charts.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><select value={synastryChar} onChange={(event) => setSynastryChar(event.target.value)} className="rounded-2xl border border-[#dfc3bf] bg-white/85 px-3 py-3 text-sm text-[#6f4c56] outline-none"><option value="">选择角色</option>{(characters || []).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select><select value={birthdayMode} onChange={(event) => setBirthdayMode(event.target.value as 'manual' | 'ai')} className="rounded-2xl border border-[#dfc3bf] bg-white/85 px-3 py-3 text-sm text-[#6f4c56] outline-none"><option value="manual">手动设置生日</option><option value="ai">让 AI 从设定判断</option></select></div>
          {birthdayMode === 'manual' ? <input type="date" value={charBirthDate} onChange={(event) => updateCharBirthDate(event.target.value)} className="mt-3 w-full rounded-2xl border border-[#dfc3bf] bg-white/85 px-3 py-3 text-sm text-[#6f4c56] outline-none" /> : <p className="mt-3 rounded-2xl bg-[#f8ece6] px-4 py-3 text-xs text-[#9c7b82]">会把角色设定、记忆与聊天语境交给星测 API 判断。</p>}
          {charZodiac && birthdayMode === 'manual' && <div className="mt-3 text-center text-sm text-[#9d6872]">{synastryCharacter?.name} · {charZodiac.name}</div>}
          <button disabled={busy || !userZodiac || !synastryCharacter} onClick={askSynastry} className="mt-4 w-full rounded-full bg-[#b77d85] px-6 py-3 text-sm text-white disabled:opacity-40">{busy ? '合盘中…' : 'Open a synastry note'}</button>
        </div>
        {starResult && <div className="rounded-[28px] border border-[#e2c1bf] bg-[#fffaf8]/90 p-5 text-[15px] leading-7 text-[#59454a] shadow-[0_12px_30px_rgba(173,113,122,.12)]"><div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#edd8d2] pb-3"><strong className="text-[#875d67]">{starResultKind === 'daily' ? 'Daily sky note' : 'Synastry note'}</strong><select value={starShareChar} onChange={(event) => setStarShareChar(event.target.value)} className="rounded-full border border-[#dfc2bd] bg-white px-3 py-2 text-sm text-[#6d4d53]"><option value="">选择角色分享</option>{(characters || []).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select><button disabled={!starShareChar} onClick={shareStar} className="rounded-full bg-[#a87982] px-3 py-2 text-xs text-white disabled:opacity-40">分享到聊天</button></div>{renderReading(starResult)}</div>}
      </section>}      {tab === 'dream' && <section className="mt-5 rounded-[30px] border border-[#e6c4c2] bg-[#fffaf6]/80 p-6 shadow-[0_18px_55px_rgba(173,116,124,.13)]"><h2 className="text-xl text-[#79525d]">把梦留在这里</h2><p className="mt-1 text-sm text-[#9b7d82]">只记录，不替你下结论。</p><textarea value={dream} onChange={(event) => setDream(event.target.value)} placeholder="昨晚梦见了什么？" className="mt-5 h-36 w-full resize-none rounded-2xl border border-[#ead0cb] bg-white/75 p-4 text-sm text-[#6f4c56] outline-none placeholder:text-[#b99da1]" /><button disabled={busy || !dream.trim()} onClick={() => ask('dream', dream)} className="mt-4 rounded-full bg-[#c9919a] px-6 py-2 text-sm text-white disabled:opacity-40">{busy ? '整理中…' : '请角色看看'}</button>{result && <div className="mt-5 rounded-2xl bg-white/80 p-5 text-[15px] leading-7 text-[#59454a]">{renderReading(result)}</div>}</section>}
      {historyOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#6b4e56]/25 p-4 backdrop-blur-sm"><div className="max-h-[82vh] w-full max-w-xl overflow-auto rounded-[30px] border border-[#e2c0c0] bg-[#fffaf6] p-5 shadow-[0_24px_80px_rgba(100,60,65,.2)]"><div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[.28em] text-[#b4878e]">saved readings</div><h3 className="mt-1 text-xl font-semibold text-[#79525d]">历史收藏</h3></div><button onClick={() => setHistoryOpen(false)} className="text-xl text-[#a87982]">×</button></div>{savedReadings.length === 0 ? <div className="py-14 text-center text-sm text-[#b18b91]">还没有收藏的解牌。</div> : <div className="mt-4 space-y-2">{savedReadings.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#eed8d1] bg-white/75 p-3"><button onClick={() => openReading(item)} className="min-w-0 flex-1 text-left"><div className="truncate text-sm text-[#76535d]">{item.question || '今日抽牌'} · {hydrateCards(item.cards).map((card) => card.name).join(' / ')}</div><div className="mt-1 text-xs text-[#b18b91]">{item.createdAt}</div></button><button onClick={() => deleteReading(item.id)} className="text-xs text-[#b1787f]">删除</button></div>)}</div>}<button onClick={() => setHistoryOpen(false)} className="mt-5 w-full rounded-full bg-[#f1ded8] py-3 text-sm text-[#815a63]">返回星梦集</button></div></div>}
      {starHistoryOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#6b4e56]/25 p-4 backdrop-blur-sm"><div className="max-h-[82vh] w-full max-w-xl overflow-auto rounded-[30px] border border-[#e2c0c0] bg-[#fffaf6] p-5 shadow-[0_24px_80px_rgba(100,60,65,.2)]"><div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[.28em] text-[#b4878e]">stellar archive</div><h3 className="mt-1 text-xl font-semibold text-[#79525d]">星测历史（三次）</h3></div><button onClick={() => setStarHistoryOpen(false)} className="text-xl text-[#a87982]">×</button></div>{starHistory.length === 0 ? <div className="py-14 text-center text-sm text-[#b18b91]">还没有保存的星测。</div> : <div className="mt-4 space-y-2">{starHistory.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#eed8d1] bg-white/75 p-3"><button onClick={() => openStarReading(item)} className="min-w-0 flex-1 text-left"><div className="truncate text-sm text-[#76535d]">{item.title}</div><div className="mt-1 text-xs text-[#b18b91]">{item.createdAt}</div></button><button onClick={() => { const next = starHistory.filter((entry) => entry.id !== item.id); setStarHistory(next); writeJson(STAR_HISTORY, next); }} className="text-xs text-[#b1787f]">删除</button></div>)}</div>}<button onClick={() => setStarHistoryOpen(false)} className="mt-5 w-full rounded-full bg-[#f1ded8] py-3 text-sm text-[#815a63]">返回星梦集</button></div></div>}
      {showApi && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#6b4e56]/25 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[30px] border border-[#e2c0c0] bg-[#fffaf6] p-6 shadow-[0_24px_80px_rgba(100,60,65,.2)]"><div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[.28em] text-[#b4878e]">星梦集 · TAROT</div><h3 className="mt-1 text-xl font-semibold text-[#79525d]">塔罗 API 设置</h3></div><button onClick={() => setShowApi(false)} className="text-xl text-[#a87982]">×</button></div><p className="mt-2 text-sm text-[#8c7478]">这里直接应用聊天设置里已经保存的 API 预设。</p><select value={tarotApi.id || (tarotApi.baseUrl ? 'custom' : '')} onChange={(event) => { const preset = apiPresets.find((item) => item.id === event.target.value); if (preset) setTarotApi({ id: preset.id, ...preset.config }); else if (!event.target.value) setTarotApi({}); }} className="mt-5 w-full rounded-2xl border border-[#e2c9c3] bg-white px-4 py-3 text-[#6d4d53] outline-none"><option value="">跟随聊天默认 · {apiConfig?.model || '未配置'}</option>{apiPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} · {preset.config.model}</option>)}</select><div className="mt-3 rounded-2xl bg-[#f8ece6] px-3 py-2 text-xs leading-5 text-[#9c7b82]">应用后只影响塔罗解读；星测、聊天和其他功能继续使用默认设置。</div><button onClick={() => { writeJson('sullyos_mi_nuomi_tarot_api', tarotApi); setShowApi(false); }} className="mt-4 w-full rounded-full bg-[#c9939a] py-3 text-sm text-white">应用此预设</button></div></div>}
    </div>
  </div>;
};

function positionsLabel(index: number) { return ['过去', '现在', '未来'][index] || '牌面'; }

export default AstrologyApp;

