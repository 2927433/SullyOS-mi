import { DB } from './db';
import { getBlobForRef, putImageBlob } from './blobRef';
import { exportNaiLibrary, importNaiLibrary, type NaiReference, type NaiReferenceMode, type NaiState, type NaiRequest } from './nai';

export function selectedNaiReferences(state: NaiState, charId = ''): { mode: NaiReferenceMode; references: NaiReference[] } {
    const owner = charId ? state.characters[charId] : state;
    return { mode: owner?.referenceMode || 'none', references: (owner?.references || []).filter(ref => ref.enabled) };
}
export function preciseCanvasSize(width: number, height: number): [number, number] {
    const ratio = width / height;
    return ratio > Math.sqrt(1.5) ? [1536, 1024] : ratio < 1 / Math.sqrt(1.5) ? [1024, 1536] : [1472, 1472];
}
export function blobToNaiBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error('参考图读取失败'));
        reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(blob);
    });
}
/** Exact reference sizing required by NAI: preserve aspect ratio, pad black. */
export async function preparePreciseReference(blob: Blob): Promise<Blob> {
    const url = URL.createObjectURL(blob);
    try {
        const image = new Image(); image.src = url;
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('无法读取参考图，请换用 PNG、JPG 或 WebP')); });
        const [width, height] = preciseCanvasSize(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d'); if (!context) throw new Error('浏览器不支持参考图处理');
        context.fillStyle = '#000'; context.fillRect(0, 0, width, height);
        const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const w = Math.round(image.naturalWidth * scale), h = Math.round(image.naturalHeight * scale);
        context.drawImage(image, Math.floor((width - w) / 2), Math.floor((height - h) / 2), w, h);
        return await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('参考图转换失败')), 'image/png'));
    } finally { URL.revokeObjectURL(url); }
}
export async function addNaiReference(file: File): Promise<NaiReference> {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('参考图请选择 PNG、JPG 或 WebP');
    const imageToken = await putImageBlob(file);
    return { id: crypto.randomUUID(), name: file.name, imageToken, enabled: true, kind: 'character', strength: 1, fidelity: 1, informationExtracted: 1 };
}
type Encode = (image: string, model: string, informationExtracted: number) => Promise<string>;
function allReferences(state: NaiState): NaiReference[] { return [...(state.references || []), ...Object.values(state.characters).flatMap(profile => profile.references || [])]; }
export async function exportNaiPortableLibrary(state: NaiState): Promise<string> {
    const library = JSON.parse(exportNaiLibrary(state));
    const referenceFiles: Record<string, { type: string; data: string }> = {};
    for (const ref of allReferences(state)) {
        if (referenceFiles[ref.imageToken]) continue;
        const blob = await getBlobForRef(ref.imageToken); if (!blob) throw new Error(`参考图“${ref.name}”缺失，请重新添加后导出`);
        referenceFiles[ref.imageToken] = { type: blob.type, data: await blobToNaiBase64(blob) };
    }
    return JSON.stringify({ ...library, referenceFiles }, null, 2);
}
export async function importNaiPortableLibrary(text: string, current: NaiState): Promise<NaiState> {
    const state = importNaiLibrary(text, current);
    const files = JSON.parse(text).referenceFiles;
    if (!files) return state;
    const tokens = new Map<string, string>();
    for (const ref of allReferences(state)) {
        const file = files[ref.imageToken];
        if (!file) throw new Error(`资料包缺少参考图“${ref.name}”，没有替换现有配置`);
        if (tokens.has(ref.imageToken)) { ref.imageToken = tokens.get(ref.imageToken)!; continue; }
        if (!/^image\/(png|jpeg|webp)$/.test(file.type) || typeof file.data !== 'string') throw new Error('参考图资料格式无效');
        const bytes = Uint8Array.from(atob(file.data), char => char.charCodeAt(0));
        const token = await putImageBlob(new Blob([bytes], { type: file.type }));
        tokens.set(ref.imageToken, token); ref.imageToken = token;
    }
    return state;
}
export async function attachNaiReferences(state: NaiState, request: NaiRequest, charId: string, encode: Encode, signal?: AbortSignal, omitPeople = false): Promise<NaiRequest> {
    const selected = selectedNaiReferences(state, charId);
    const mode = selected.mode;
    const references = selected.references.filter(ref => !omitPeople || (mode === 'precise' && ref.kind === 'style'));
    if (omitPeople && !references.length) return request;
    if (mode === 'none') return request;
    if (!references.length) throw new Error('已开启参考功能，请先添加并启用参考图，或选择“不使用参考图”');
    const model = request.model;
    if (mode === 'precise' && !/^nai-diffusion-4-5-/.test(model)) throw new Error('精确参考仅支持 V4.5 系列，参考图库已保留，请切换模型或关闭参考');
    if (mode === 'vibe' && !/^nai-diffusion-(?:4|3|furry-3)(?:-|$)/.test(model)) throw new Error('此模型不支持 Vibe Transfer，请换用 V4 / V4.5 / V3');
    const images: string[] = [];
    for (const ref of references) {
        signal?.throwIfAborted();
        for (const value of [ref.strength, ref.fidelity, ref.informationExtracted]) if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('参考图强度、精度和信息提取应在 0–1 之间');
        const blob = await getBlobForRef(ref.imageToken); if (!blob) throw new Error(`参考图“${ref.name}”文件缺失，请重新添加`);
        if (mode === 'precise') {
            images.push(await blobToNaiBase64(await preparePreciseReference(blob)));
        } else if (/^nai-diffusion-4/.test(model)) {
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ref.imageToken}|${model}|${ref.informationExtracted}`));
            const key = 'nai_vibe_' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
            const cached = await DB.getAssetRaw(key);
            const encoded = typeof cached === 'string' ? cached : await encode(await blobToNaiBase64(blob), model, ref.informationExtracted);
            if (!cached) await DB.saveAssetRaw(key, encoded);
            images.push(encoded);
        } else images.push(await blobToNaiBase64(blob));
    }
    signal?.throwIfAborted();
    return applyPreparedNaiReferences(request, mode, references, images);
}
export function applyPreparedNaiReferences(request: NaiRequest, mode: 'precise' | 'vibe', references: NaiReference[], images: string[]): NaiRequest {
    const p = structuredClone(request.parameters);
    for (const key of Object.keys(p)) if (key.startsWith('director_reference_') || key.startsWith('reference_image') || key.startsWith('reference_strength') || key.startsWith('reference_information_extracted')) delete p[key];
    if (mode === 'precise') {
        p.director_reference_images = images;
        p.director_reference_descriptions = references.map(ref => ({ caption: { base_caption: ref.kind, char_captions: [] }, legacy_uc: false }));
        p.director_reference_information_extracted = references.map(ref => ref.informationExtracted);
        p.director_reference_strength_values = references.map(ref => ref.strength);
        // Official frontend maps Fidelity to the inverse secondary strength.
        p.director_reference_secondary_strength_values = references.map(ref => 1 - ref.fidelity);
    } else {
        p.reference_image_multiple = images;
        p.reference_strength_multiple = references.map(ref => ref.strength);
        if (!/^nai-diffusion-4/.test(request.model)) p.reference_information_extracted_multiple = references.map(ref => ref.informationExtracted);
    }
    return { ...request, parameters: p };
}
