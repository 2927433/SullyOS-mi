import React, { useRef, useState } from 'react';
import TokenImg from '../os/TokenImg';
import { addNaiReference } from '../../utils/naiReferences';
import { type NaiReference, type NaiReferenceMode, type NaiState, normalizeNaiModel, emptyNaiCharacter } from '../../utils/nai';

export default function NaiReferencePanel({ state, charId, disabled, onChange, onError }: { state: NaiState; charId: string; disabled: boolean; onChange: (value: NaiState) => void; onError: (message: string) => void }) {
    const input = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const owner = charId ? state.characters[charId] || emptyNaiCharacter() : state;
    const references = owner.references || [];
    const mode = owner.referenceMode || 'none';
    const model = normalizeNaiModel(state.model);
    const supportsPrecise = /^nai-diffusion-4-5-/.test(model);
    const supportsVibe = /^nai-diffusion-(?:4|3|furry-3)(?:-|$)/.test(model);
    const update = (patch: { references?: NaiReference[]; referenceMode?: NaiReferenceMode }) => onChange(charId ? { ...state, characters: { ...state.characters, [charId]: { ...(state.characters[charId] || emptyNaiCharacter()), ...patch } } } : { ...state, ...patch });
    const edit = (id: string, patch: Partial<NaiReference>) => update({ references: references.map(ref => ref.id === id ? { ...ref, ...patch } : ref) });
    return <section className="nai-card"><h3>参考图 · {charId ? '当前角色资料' : '独立生图资料'}</h3>
        <label>参考方式<select disabled={disabled || uploading} value={mode} onChange={e => update({ referenceMode: e.target.value as NaiReferenceMode })}>
            <option value="none">不使用参考图</option><option value="precise" disabled={!supportsPrecise}>精确参考（V4.5）</option><option value="vibe" disabled={!supportsVibe}>Vibe Transfer（V4 / V4.5 / V3）</option>
        </select></label>
        <p className="nai-note">精确参考和 Vibe 是不同功能，不能同时使用。切换模型会保留图库；不兼容时请关闭参考再生成。精确参考及 Vibe 编码可能额外消耗 Anlas。</p>
        {mode === 'precise' && !supportsPrecise && <p role="alert" className="nai-note">当前模型不支持精确参考，请换用 V4.5 或关闭参考。</p>}
        {mode === 'vibe' && !supportsVibe && <p role="alert" className="nai-note">当前模型不支持 Vibe，请切换模型或关闭参考。</p>}
        <button type="button" disabled={disabled || uploading} onClick={() => input.current?.click()}>{uploading ? '正在保存参考图…' : '添加参考图'}</button>
        <input hidden ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={async e => {
            const files = Array.from(e.target.files || []); e.target.value = ''; if (!files.length) return;
            setUploading(true);
            try { const added: NaiReference[] = []; for (const file of files) added.push(await addNaiReference(file)); update({ references: [...references, ...added] }); }
            catch (error) { onError(error instanceof Error ? error.message : '参考图保存失败'); }
            finally { setUploading(false); }
        }} />
        {references.map(ref => <div className="nai-reference" key={ref.id}><TokenImg value={ref.imageToken} className="nai-reference-thumb" /><label className="nai-check"><input type="checkbox" disabled={disabled || uploading} checked={ref.enabled} onChange={e => edit(ref.id, { enabled: e.target.checked })} />{ref.name}</label>
            {mode === 'precise' && <label>参考类型<select disabled={disabled} value={ref.kind} onChange={e => edit(ref.id, { kind: e.target.value as NaiReference['kind'] })}><option value="character">角色</option><option value="style">画风</option><option value="character&style">角色与画风</option></select></label>}
            <label>参考强度：{ref.strength.toFixed(2)}<input aria-label={`参考强度 ${ref.name}`} type="range" min="0" max="1" step="0.05" disabled={disabled} value={ref.strength} onChange={e => edit(ref.id, { strength: Number(e.target.value) })} /></label>
            {mode === 'precise' ? <label>精度 Fidelity：{ref.fidelity.toFixed(2)}<input aria-label={`参考精度 ${ref.name}`} type="range" min="0" max="1" step="0.05" disabled={disabled} value={ref.fidelity} onChange={e => edit(ref.id, { fidelity: Number(e.target.value) })} /></label> : <label>信息提取：{ref.informationExtracted.toFixed(2)}<input aria-label={`信息提取 ${ref.name}`} type="range" min="0" max="1" step="0.05" disabled={disabled} value={ref.informationExtracted} onChange={e => edit(ref.id, { informationExtracted: Number(e.target.value) })} /></label>}
            <button type="button" disabled={disabled || uploading} onClick={() => update({ references: references.filter(item => item.id !== ref.id) })}>从此资料移除</button>
        </div>)}
        <p className="nai-note">添加后点顶部“保存设置”，图库即可下次复用。精确参考图会按原比例缩放并补黑边，适配官方要求的尺寸；多张角色参考可能混合外观，不等于分配给不同人物。</p>
    </section>;
}
