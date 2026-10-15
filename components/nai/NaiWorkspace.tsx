import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOS } from '../../context/OSContext';
import TokenImg from '../os/TokenImg';
import { shareOrDownloadBlob } from '../../utils/shareExport';
import { NAI_MODELS, NAI_SAMPLERS, NAI_NOISES, NAI_SCENE_GUIDE, normalizeNaiModel, buildNaiRequest, emptyNaiCharacter, parseNaiRequest, defaultNaiState, type NaiPreset, type NaiState, type NaiSceneDetails } from '../../utils/nai';
import { checkNaiConnection, checkNaiSchema, generateNaiImages, loadNaiState, saveNaiState, saveNaiImageToAlbum, type NaiGeneratedImage } from '../../utils/naiService';
import { readNaiPng } from '../../utils/naiPng';
import { currentNaiTurn, resolveNaiPromptApi, draftNaiPrompt } from '../../utils/naiPrompt';
import NaiReferencePanel from './NaiReferencePanel';
import { exportNaiPortableLibrary, importNaiPortableLibrary } from '../../utils/naiReferences';
import { DB } from '../../utils/db';
import './nai.css';

type Tab = 'generate' | 'presets' | 'character' | 'connection';
const errorText = (error: unknown) => (error as any)?.name === 'AbortError' ? '已取消等待。已发出的 NAI 请求仍可能计费，请检查后再决定是否重发。' : error instanceof Error ? error.message : '操作失败，请重试';
export default function NaiWorkspace({ characterId, initialTab = 'generate', onClose, onSendToChat }: {
    characterId?: string; initialTab?: Tab; onClose: () => void; onSendToChat?: (image: NaiGeneratedImage) => Promise<void>;
}) {
    const { characters, addToast, apiConfig, userProfile } = useOS();
    const [state, setState] = useState<NaiState | null>(null);
    const [tab, setTab] = useState<Tab>(initialTab);
    const [selectedChar, setSelectedChar] = useState(characterId || characters[0]?.id || '');
    const [scene, setScene] = useState('');
    const [negative, setNegative] = useState('');
    const [sceneDetails, setSceneDetails] = useState<NaiSceneDetails>();
    const [randomRound, setRandomRound] = useState(0);
    const [rawMode, setRawMode] = useState(false);
    const [raw, setRaw] = useState('');
    const [paramsText, setParamsText] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const abortRef = useRef<AbortController>();
    const [images, setImages] = useState<NaiGeneratedImage[]>([]);
    const [sent, setSent] = useState<Set<string>>(new Set());
    const [category, setCategory] = useState('');
    const [editing, setEditing] = useState<NaiPreset>({ id: '', name: '', category: '', positive: '', negative: '' });
    const importRef = useRef<HTMLInputElement>(null);
    const requestImportRef = useRef<HTMLInputElement>(null);
    const pngImportRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        let active = true;
        void loadNaiState().then(value => { if (active) { setState(value); setParamsText(JSON.stringify(value.parameters, null, 2)); } }).catch(e => { if (active) setError(errorText(e)); });
        return () => { active = false; abortRef.current?.abort(); };
    }, []);
    const profile = selectedChar ? state?.characters[selectedChar] || emptyNaiCharacter() : { ...emptyNaiCharacter(), presetId: state?.defaultPresetId || '' };
    const setProfile = (patch: Partial<typeof profile>) => setState(current => current && (selectedChar ? { ...current, characters: { ...current.characters, [selectedChar]: { ...(current.characters[selectedChar] || emptyNaiCharacter()), ...patch } } } : { ...current, ...(patch.presetId !== undefined ? { defaultPresetId: patch.presetId } : {}) }));
    const setParameter = (key: string, value: unknown) => setState(current => current && ({ ...current, parameters: { ...current.parameters, [key]: value } }));
    const preview = useMemo(() => {
        try { return { request: state ? rawMode ? parseNaiRequest(raw) : buildNaiRequest(state, selectedChar, scene, negative, undefined, sceneDetails) : null, error: '' }; }
        catch (e) { return { request: null, error: errorText(e) }; }
    }, [state, rawMode, raw, selectedChar, scene, negative, randomRound, sceneDetails]);
    const action = async (fn: () => Promise<void>) => {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(true); setError(''); setNotice('');
        try { await fn(); } catch (e) { setNotice(''); setError(errorText(e)); }
        finally { busyRef.current = false; setBusy(false); }
    };
    const save = () => action(async () => { if (state) { await saveNaiState(state); setNotice('设置已保存到本机，完整备份会包含生图资料。'); } });
    const generate = () => action(async () => {
        if (!state || !preview.request) throw new Error(preview.error || '请填写生图内容');
        if (!rawMode && !scene.trim()) throw new Error('请输入本次画面内容');
        await saveNaiState(state);
        abortRef.current = new AbortController();
        setNotice('正在向 NAI 请求图片，请保持页面打开…');
        const generated = await generateNaiImages(state, preview.request, abortRef.current.signal, { useSavedReferences: !rawMode, charId: selectedChar, omitPeople: !!sceneDetails?.photoType && sceneDetails.photoType !== 'selfie' });
        setImages(previous => [...generated, ...previous]);
        // Keep the exact sent payload including its resolved seed for inspection/reproduction.
        setRaw(JSON.stringify(generated[0]?.request || preview.request, null, 2));
        setRandomRound(value => value + 1);
        let failed = false;
        for (const image of generated) {
            if (selectedChar) { try { await saveNaiImageToAlbum(image, selectedChar); } catch { failed = true; } }
        }
        setNotice(failed ? '图片已生成，但相册保存失败。请先保存原图，避免丢失。' : selectedChar ? '已生成并保存到所选角色的相册。' : '已生成，请保存原图。');
    });
    const importFile = (kind: 'library' | 'request' | 'png', file?: File) => action(async () => {
        if (!file || !state) return;
        if (kind === 'library') {
            if (!window.confirm('导入将替换当前生图提示词库、角色生图档案和参数。已保存的聊天与图片不变。继续？')) return;
            const next = await importNaiPortableLibrary(await file.text(), state);
            setState(next); setParamsText(JSON.stringify(next.parameters, null, 2)); setNotice('资料已载入，角色自动生图保持关闭。请检查后点保存。');
        } else {
            const request = kind === 'png' ? await readNaiPng(file) : parseNaiRequest(await file.text());
            setRaw(JSON.stringify(request, null, 2)); setRawMode(true); setTab('generate'); setNotice('已载入完整请求模式；将原样发送，不叠加画师组合或角色档案。');
        }
    });
    const changeModel = (model: string) => setState(current => {
        if (!current) return current;
        const parameterProfiles = { ...current.parameterProfiles, [current.model]: current.parameters };
        const parameters = structuredClone(parameterProfiles[model] || defaultNaiState().parameters);
        setParamsText(JSON.stringify(parameters, null, 2));
        return { ...current, model, parameters, parameterProfiles };
    });
    const normalizedModel = state ? normalizeNaiModel(state.model) : '';
    const userAppearance = state?.characters.__user__ || emptyNaiCharacter();
    const setUserAppearance = (patch: Partial<typeof userAppearance>) => setState(current => current && ({ ...current, characters: { ...current.characters, __user__: { ...(current.characters.__user__ || emptyNaiCharacter()), ...patch } } }));
    return <div className="nai-workspace" role="dialog" aria-modal="true" aria-label="NovelAI 生图">
        <header className="nai-head"><div><h2>NovelAI 生图</h2><small>画面 · 画师组合 · 角色档案</small></div><div className="nai-row"><button disabled={busy || !state} onClick={() => void save()}>保存设置</button><button disabled={busy} onClick={onClose}>关闭</button></div></header>
        <nav className="nai-tabs">{([['generate', '生图'], ['presets', '画师组合'], ['character', '角色外观'], ['connection', '连接设置']] as [Tab, string][]).map(([key, title]) => <button key={key} disabled={busy} data-active={tab === key} onClick={() => setTab(key)}>{title}</button>)}</nav>
        {error && <div className="nai-error" role="alert">{error}</div>}
        {notice && <div className="nai-head nai-note" role="status">{notice}</div>}
        <main className="nai-body"><div className="nai-content">
            {!state ? <p className="nai-note">{error ? '配置读取失败，关闭后重试；没有覆盖原配置。' : '正在读取本机生图资料…'}</p> : <>
            {(tab === 'generate' || tab === 'character') && <section className="nai-card"><label>归属角色<select disabled={busy || !!characterId} value={selectedChar} onChange={e => setSelectedChar(e.target.value)}><option value="">不选择角色</option>{characters.map(char => <option key={char.id} value={char.id}>{char.name}</option>)}</select></label><p className="nai-note">固定特征按角色 ID 保存；画师组合与角色档案可以在不同聊天中复用。</p></section>}
            {tab === 'connection' && <section className="nai-card">
                <label>NAI Persistent API Token<input type="password" autoComplete="new-password" spellCheck={false} disabled={busy} value={state.connection.apiKey} onChange={e => setState({ ...state, connection: { ...state.connection, apiKey: e.target.value } })} placeholder="在自己的设备里填写" /></label>
                <label className="nai-check"><input type="checkbox" disabled={busy} checked={state.promptApi?.enabled || false} onChange={e => setState({ ...state, promptApi: { baseUrl: '', apiKey: '', model: '', ...state.promptApi, enabled: e.target.checked } })} />使用独立提示词 API（关闭则跟随全局）</label>
                {state.promptApi?.enabled && (['baseUrl', 'apiKey', 'model'] as const).map(key => <label key={key}>提示词 {key === 'baseUrl' ? 'API 地址（含 /v1）' : key === 'apiKey' ? 'API Key' : '模型 ID'}<input type={key === 'apiKey' ? 'password' : 'text'} disabled={busy} value={state.promptApi?.[key] || ''} onChange={e => setState({ ...state, promptApi: { enabled: true, baseUrl: '', apiKey: '', model: '', ...state.promptApi, [key]: e.target.value } })} /></label>)}
                <p className="nai-note">无需额外导入预设，内置图片翻译规范已启用。独立接口需兼容 OpenAI chat/completions。角色仍用原聊天 API 决定是否分享照片；确定分享后，提示词 API 只看最新用户回合与当前回复再整理一次，每张自动图会多一次文本模型调用。NAI Key 只负责出图。</p>
                <label>NAI 服务地址<input disabled={busy} value={state.connection.baseUrl} onChange={e => setState({ ...state, connection: { ...state.connection, baseUrl: e.target.value } })} /></label>
                <p className="nai-note">默认直连 image.novelai.net。自定义地址需要兼容 NAI 路径，并会收到你的 Key；只填自己信任的服务。保存后 Key 在本机，完整备份也可能含 Key；下方单独导出的生图资料库不含 Key。</p>
                <div className="nai-row"><button disabled={busy} onClick={() => void action(async () => { await checkNaiConnection(state.connection); setNotice('NAI 连接成功，订阅接口已响应。没有进行收费生图。'); })}>测试连接</button><button disabled={busy} onClick={() => void action(async () => { const schema = await checkNaiSchema(); setNotice(`已读取官方生图接口定义（${schema.fields.length} 项参数）。${schema.modelIds.length ? '模型枚举：' + schema.modelIds.join(', ') : '官方未提供生图模型枚举；可选内置模型或填写官方 ID。'}`); })}>检查官方接口</button></div>
                <label>生图场景规则（可选）<textarea disabled={busy} rows={5} value={state.sceneGuide} onChange={e => setState({ ...state, sceneGuide: e.target.value })} placeholder="只用于角色自动描述场景，例如镜头与构图习惯。不需要放 API Key。" /></label>
                <details><summary>内置生图提示词规范（自动生图和手动整理均使用）</summary><pre className="nai-preview">{NAI_SCENE_GUIDE}</pre></details>
                <p className="nai-note">这是生图专用规则。画师串放“画师组合”，固定发色、瞳色等放“角色外观”；无需额外安装聊天世界书。</p>
                <div className="nai-row"><button disabled={busy} onClick={() => void action(async () => { await shareOrDownloadBlob({ blob: new Blob([await exportNaiPortableLibrary(state)], { type: 'application/json' }), fileName: 'SullyOS-NAI-library.json', preferDownloadOnWeb: true }); })}>导出生图资料（不含 Key）</button><button disabled={busy} onClick={() => importRef.current?.click()}>导入生图资料</button></div>
            </section>}
            {tab === 'character' && <section className="nai-card">
                <label>角色固定正面提示词<textarea disabled={busy || !selectedChar} rows={5} value={profile.positive} onChange={e => setProfile({ positive: e.target.value })} placeholder="1boy, black hair, blue eyes, ..." /></label>
                <label>角色固定负面提示词<textarea disabled={busy || !selectedChar} rows={3} value={profile.negative} onChange={e => setProfile({ negative: e.target.value })} /></label>
                <label>该角色使用的画师组合<select disabled={busy || !selectedChar} value={profile.presetId} onChange={e => setProfile({ presetId: e.target.value })}><option value="">不使用组合</option>{state.presets.map(p => <option key={p.id} value={p.id}>{p.category || '未分类'} / {p.name}</option>)}</select></label>
                <details><summary>用户（我）的固定外观与合照</summary><label>用户固定正面提示词<textarea disabled={busy} rows={4} value={userAppearance.positive} onChange={e => setUserAppearance({ positive: e.target.value })} /></label><label>用户固定负面提示词<textarea disabled={busy} rows={3} value={userAppearance.negative} onChange={e => setUserAppearance({ negative: e.target.value })} /></label><label className="nai-check"><input type="checkbox" disabled={busy || !selectedChar || !userAppearance.positive.trim()} checked={!!profile.includeUser} onChange={e => setProfile({ includeUser: e.target.checked })} />此角色允许与用户合照</label><p className="nai-note">合照时使用独立人物槽；自动整理出的各人物动作和位置会分别追加。固定外观不会被替换。</p></details>
                <label className="nai-check"><input type="checkbox" disabled={busy || !selectedChar || !profile.positive.trim()} checked={profile.auto} onChange={e => setProfile({ auto: e.target.checked })} />允许角色在聊天回复时判断并生图</label>
                <p className="nai-note">开启后，每轮最多触发一次、每次一张，可能消耗 NAI Anlas；失败不自动重发。该角色回复会在前台完成，请保持网页打开。关闭后不发起新的自动请求。固定词不会被角色改写，但模型仍可能画错特征。</p>
            </section>}
            {tab === 'presets' && <>
                <section className="nai-card"><h3>分类与组合</h3><select aria-label="筛选画师分类" value={category} onChange={e => setCategory(e.target.value)}><option value="">全部分类</option>{[...new Set(state.presets.map(p => p.category || '未分类'))].map(c => <option key={c}>{c}</option>)}</select>{state.presets.filter(p => !category || (p.category || '未分类') === category).map(p => <div key={p.id} className="nai-preset"><span>{p.category || '未分类'} / {p.name}</span><button disabled={busy} onClick={() => setEditing({ ...p })}>编辑</button></div>)}<button disabled={busy} onClick={() => setEditing({ id: '', name: '', category: '', positive: '', negative: '' })}>新建组合</button></section>
                <section className="nai-card"><label>组合名称<input disabled={busy} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></label><label>分类<input disabled={busy} value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="例如厚涂、漫画、清透" /></label><label>正面提示词<textarea disabled={busy} rows={6} value={editing.positive} onChange={e => setEditing({ ...editing, positive: e.target.value })} /></label><label>负面提示词<textarea disabled={busy} rows={5} value={editing.negative} onChange={e => setEditing({ ...editing, negative: e.target.value })} /></label><p className="nai-note">保留原有顺序、权重和标点。需要官网质量词或 UC 词时，把实际词串明确写在这里；不会暗中添加。编辑完成先点“加入资料库”，再保存设置。</p><div className="nai-row"><button disabled={busy || !editing.name.trim()} onClick={() => { const item = { ...editing, id: editing.id || crypto.randomUUID() }; setState({ ...state, presets: [...state.presets.filter(p => p.id !== item.id), item] }); setEditing(item); setNotice('组合已加入待保存资料，请点顶部保存设置。'); }}>加入资料库</button>{editing.id && <button disabled={busy} onClick={() => { if (!window.confirm('删除这套画师组合？')) return; setState({ ...state, presets: state.presets.filter(p => p.id !== editing.id), characters: Object.fromEntries(Object.entries(state.characters).map(([id, p]) => [id, p.presetId === editing.id ? { ...p, presetId: '' } : p])) }); setEditing({ id: '', name: '', category: '', positive: '', negative: '' }); }}>删除组合</button>}</div></section>
            </>}
            {tab === 'generate' && <>
                <section className="nai-card"><label className="nai-check"><input disabled={busy} type="checkbox" checked={rawMode} onChange={e => { if (e.target.checked && !raw && preview.request) setRaw(JSON.stringify(preview.request, null, 2)); setRawMode(e.target.checked); }} />完整请求模式（官网参数复现）</label><div className="nai-row"><button disabled={busy} onClick={() => pngImportRef.current?.click()}>读取 NAI 原始 PNG 参数</button><button disabled={busy} onClick={() => requestImportRef.current?.click()}>导入完整请求 JSON</button></div>
                {rawMode ? <><textarea aria-label="NAI 完整请求 JSON" disabled={busy} rows={16} value={raw} onChange={e => setRaw(e.target.value)} /><p className="nai-note">完整请求原样发送，不追加角色、画师、质量或负面词。请自行确认其中的角色特征。当前只支持文生图；导入参考图参数需要数据也在请求中，图生图/重绘请用官网。</p></> : <>
                    <label>模型<select disabled={busy} value={NAI_MODELS.some(m => m.id === normalizedModel) ? normalizedModel : '__custom'} onChange={e => changeModel(e.target.value === '__custom' ? 'nai-diffusion-' : e.target.value)}>{NAI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}<option value="__custom">自定义官方模型 ID</option></select></label>
                    {!NAI_MODELS.some(m => m.id === normalizedModel) && <label>模型 ID<input disabled={busy} value={state.model} onChange={e => setState({ ...state, model: e.target.value })} onBlur={() => setState({ ...state, model: normalizeNaiModel(state.model) })} /><p className="nai-note">填写接口 ID，不要填写显示名称，例如 nai-diffusion-4-5-full。</p></label>}
                    <p className="nai-note">模型列表为内置官方名称，并非账号实时拉取；参数按模型分别保存。选中模型不保证订阅具有使用权限。</p>
                    <label>照片类型<select disabled={busy} value={sceneDetails?.photoType || 'selfie'} onChange={e => setSceneDetails({ ...sceneDetails, photoType: e.target.value as NaiSceneDetails['photoType'] })}><option value="selfie">角色照 / 自拍</option><option value="food">美食特写（无人）</option><option value="scenery">眼前景物（无人）</option><option value="object">物品特写（无人）</option></select></label>
                    <label>本次画面内容<textarea disabled={busy} rows={5} value={scene} onChange={e => setScene(e.target.value)} placeholder="在这里写场景、姿势、服装、表情、构图。推荐沿用你在 NAI 官网使用的词。" /></label>
                    <button disabled={busy || !scene.trim()} onClick={() => void action(async () => {
                        const result = await draftNaiPrompt(scene, resolveNaiPromptApi(state, apiConfig), characters.find(c => c.id === selectedChar), userProfile, state.sceneGuide);
                        setScene(result.scene); setSceneDetails(result.details); setNotice('已整理英文场景与人物动作；请检查后再点生成图片。本次只调用了聊天模型。');
                    })}>让聊天模型整理提示词</button>
                    <p className="nai-note">英文 tags 可以直接生成；中文描述可先整理。整理会调用设置中选择的提示词 API，不会立即调用 NAI。自动发图使用同一份内置规范。美食、景物、物品照不追加人物固定词；为避免参考图带入人物，也不使用 Vibe，仅保留纯风格精确参考。</p>
                    <button disabled={busy || !selectedChar} onClick={() => void action(async () => {
                        const recent = await DB.getRecentMessagesWithCount(selectedChar, 40);
                        const input = currentNaiTurn(recent.messages);
                        if (!input.trim()) throw new Error('当前角色没有可用的最新用户回合，请直接填写画面描述');
                        const result = await draftNaiPrompt(input, resolveNaiPromptApi(state, apiConfig), characters.find(c => c.id === selectedChar), userProfile, state.sceneGuide);
                        setScene(result.scene); setSceneDetails(result.details); setNotice('已根据最新用户回合整理，请检查照片类型、内容后再生图。');
                    })}>按当前聊天整理提示词</button>
                    {sceneDetails?.characters?.length ? <details open><summary>本次人物动作与位置</summary>{sceneDetails.characters.filter(c => c.id === selectedChar || (c.id === '__user__' && profile.includeUser)).map((person, index) => <div key={person.id + index} className="nai-reference"><strong>{person.id === '__user__' ? '用户' : '当前角色'}</strong><label>人物动作提示词<textarea disabled={busy} value={person.positive} onChange={e => setSceneDetails({ ...sceneDetails, characters: sceneDetails.characters?.map(c => c === person ? { ...c, positive: e.target.value } : c) })} /></label><div className="nai-grid">{(['x', 'y'] as const).map(axis => <label key={axis}>{axis.toUpperCase()} 位置<input disabled={busy} type="number" min="0" max="1" step="0.1" value={person[axis] ?? 0.5} onChange={e => setSceneDetails({ ...sceneDetails, characters: sceneDetails.characters?.map(c => c === person ? { ...c, [axis]: Number(e.target.value) } : c) })} /></label>)}</div></div>)}<button disabled={busy} onClick={() => setSceneDetails(undefined)}>清除此轮人物动作</button></details> : null}
                    <label>本次额外负面词<textarea disabled={busy} rows={3} value={negative} onChange={e => setNegative(e.target.value)} /></label>
                    <label>画师组合<select disabled={busy} value={profile.presetId} onChange={e => setProfile({ presetId: e.target.value })}><option value="">无</option>{state.presets.map(p => <option key={p.id} value={p.id}>{p.category || '未分类'} / {p.name}</option>)}</select></label>
                    <div className="nai-grid">{([['width', '宽度'], ['height', '高度'], ['seed', 'Seed（-1 随机）'], ['n_samples', '张数']] as [string, string][]).map(([key, title]) => <label key={key}>{title}<input type="number" disabled={busy} value={state.parameters[key] ?? ''} onChange={e => setParameter(key, e.target.value === '' ? NaN : Number(e.target.value))} /></label>)}</div>
                    {([['steps', '步数 Steps', 1, 50, 1], ['scale', 'CFG 强度', 0, 10, 0.1], ['cfg_rescale', 'CFG 重缩放', 0, 1, 0.01]] as const).map(([key, title, min, max, step]) => <label key={key}>{title}：{state.parameters[key] ?? 0}<div className="nai-range"><input aria-label={`${title} 滑块`} type="range" disabled={busy} min={min} max={max} step={step} value={state.parameters[key] ?? 0} onChange={e => setParameter(key, Number(e.target.value))} /><input aria-label={`${title} 数值`} type="number" disabled={busy} min={min} max={key === 'scale' ? 100 : max} step={step} value={state.parameters[key] ?? 0} onChange={e => setParameter(key, Number(e.target.value))} /></div></label>)}
                    <label>采样器<select disabled={busy} value={state.parameters.sampler || ''} onChange={e => setParameter('sampler', e.target.value)}>{!NAI_SAMPLERS.some(s => s.id === state.parameters.sampler) && <option value={state.parameters.sampler || ''}>{state.parameters.sampler || '请选择'}</option>}{NAI_SAMPLERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                    <label>噪声调度<select disabled={busy || /^nai-diffusion-5-/.test(normalizedModel)} value={/^nai-diffusion-5-/.test(normalizedModel) ? 'karras' : state.parameters.noise_schedule || ''} onChange={e => setParameter('noise_schedule', e.target.value)}>{NAI_NOISES.filter(n => n.id !== 'native' || !/^nai-diffusion-4/.test(normalizedModel)).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
                    {/^nai-diffusion-5-/.test(normalizedModel) && <p className="nai-note">V5 按官方设置固定使用 Karras 噪声调度。</p>}
                    {/^nai-diffusion-4/.test(normalizedModel) && <label className="nai-check"><input type="checkbox" disabled={busy} checked={!!state.parameters.nai_variety_plus || (state.parameters.nai_variety_plus !== false && !!state.parameters.skip_cfg_above_sigma)} onChange={e => setParameter('nai_variety_plus', e.target.checked)} />Variety+（CFG Delay）</label>}
                    <details><summary>其他参数 JSON</summary><textarea aria-label="NAI 其他参数 JSON" rows={12} disabled={busy} value={paramsText} onChange={e => setParamsText(e.target.value)} /><button disabled={busy} onClick={() => { try { const value = JSON.parse(paramsText); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('需要 JSON 对象'); setState({ ...state, parameters: value }); setNotice('JSON 参数已应用。组合模式会重新组装正负面/角色提示词，质量和 UC 使用显式词串。'); } catch (e) { setError(errorText(e)); } }}>应用 JSON 参数</button><button disabled={busy} onClick={() => setParamsText(JSON.stringify(state.parameters, null, 2))}>从当前表单刷新</button></details>
                </>}
                <details><summary>{rawMode ? '完整请求预览（不含 Key）' : '基础请求预览（参考图发出前加入）'}</summary><pre className="nai-preview">{preview.request ? JSON.stringify(preview.request, null, 2) : preview.error}</pre></details>
                {!rawMode && <p className="nai-note">参考图会在发送前处理并加入；生成后可用“载入本图参数”查看或导出包含参考数据的完整请求。</p>}
                <p className="nai-note">生成会使用你的 NAI 账号，可能消耗 Anlas；不会自动重试。图片以 NAI 返回的原始文件保存，不进行重绘或压缩。</p>
                <div className="nai-row"><button className="nai-primary" disabled={busy || !preview.request} onClick={() => void generate()}>{busy ? '正在处理…' : '生成图片'}</button>{busy && <button onClick={() => abortRef.current?.abort()}>取消等待</button>}<button disabled={busy || !preview.request} onClick={() => void action(async () => { await shareOrDownloadBlob({ blob: new Blob([JSON.stringify(preview.request, null, 2)], { type: 'application/json' }), fileName: 'NAI-request.json', preferDownloadOnWeb: true }); })}>{rawMode ? '导出完整请求' : '导出基础参数'}</button></div>
                </section>
                {!rawMode && <NaiReferencePanel state={state} charId={selectedChar} disabled={busy} onChange={setState} onError={setError} />}
                {images.map(image => <section key={image.generationId} className="nai-card nai-result"><TokenImg value={image.token} className="nai-image" /><p className="nai-note">{image.request.model} · Seed {image.request.parameters.seed}</p><div className="nai-row"><button disabled={busy} onClick={() => void action(async () => { await shareOrDownloadBlob({ blob: image.blob, fileName: `NAI-${image.generationId}.${image.blob.type === 'image/webp' ? 'webp' : image.blob.type === 'image/jpeg' ? 'jpg' : 'png'}`, preferDownloadOnWeb: true }); })}>保存原图</button><button disabled={busy || !selectedChar} onClick={() => void action(async () => { await saveNaiImageToAlbum(image, selectedChar); setNotice('相册已保存。'); })}>保存相册</button>{onSendToChat && <button disabled={busy || sent.has(image.generationId)} onClick={() => void action(async () => { await onSendToChat(image); setSent(previous => new Set([...previous, image.generationId])); addToast('图片已发到聊天', 'success'); })}>{sent.has(image.generationId) ? '已发送' : '发到当前聊天'}</button>}<button disabled={busy} onClick={() => { setRaw(JSON.stringify(image.request, null, 2)); setRawMode(true); }}>载入本图参数</button></div></section>)}
            </>}
            <input ref={importRef} hidden type="file" accept=".json,application/json" onChange={e => { void importFile('library', e.target.files?.[0]); e.target.value = ''; }} />
            <input ref={requestImportRef} hidden type="file" accept=".json,application/json" onChange={e => { void importFile('request', e.target.files?.[0]); e.target.value = ''; }} />
            <input ref={pngImportRef} hidden type="file" accept="image/png,.png" onChange={e => { void importFile('png', e.target.files?.[0]); e.target.value = ''; }} />
            </>}
        </div></main>
    </div>;
}

export function NaiSettingsLauncher() {
    const [open, setOpen] = useState(false);
    return <><button className="nai-launch" type="button" onClick={() => setOpen(true)}>NovelAI 生图设置与资料库<small>API Key、模型参数、分类画师组合、角色固定外观</small></button>{open && <NaiWorkspace initialTab="connection" onClose={() => setOpen(false)} />}</>;
}
