import JSZip from 'jszip';
import { DB } from './db';
import { putImageBlob } from './blobRef';
import { NAI_ASSET_ID, defaultNaiState, normalizeNaiState, naiBaseUrl, validateNaiRequest, type NaiState, type NaiRequest } from './nai';

export async function loadNaiState(): Promise<NaiState> {
    const value = await DB.getAssetRaw(NAI_ASSET_ID);
    return value === null ? defaultNaiState() : normalizeNaiState(value);
}
export async function saveNaiState(state: NaiState): Promise<void> {
    const normalized = normalizeNaiState(state);
    normalized.connection.baseUrl = naiBaseUrl(normalized.connection.baseUrl);
    normalized.connection.apiKey = normalized.connection.apiKey.trim().replace(/^Bearer\s+/i, '');
    await DB.saveAssetRaw(NAI_ASSET_ID, normalized);
}
export function naiHttpError(status: number): Error {
    const errors: Record<number, string> = { 400: 'NAI 不接受这份参数，请核对模型和参数配置', 401: 'NAI Key 无效或已过期', 402: 'NAI 余额或订阅不足', 403: 'NAI 拒绝访问，请检查 Key 权限和订阅', 409: 'NAI 正在处理其他任务，请等待完成', 429: 'NAI 限流，请稍后手动重试。未自动重发', 500: 'NAI 服务端出错，请稍后重试' };
    return new Error(errors[status] || `NAI 请求失败（HTTP ${status}）`);
}
export async function checkNaiConnection(connection: NaiState['connection']): Promise<unknown> {
    if (!connection.apiKey.trim()) throw new Error('请填写 NAI Persistent API Token');
    const response = await fetch(`${naiBaseUrl(connection.baseUrl)}/user/subscription`, { headers: { Authorization: `Bearer ${connection.apiKey.trim().replace(/^Bearer\s+/i, '')}` }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw naiHttpError(response.status);
    return response.json();
}
/** The official image schema has model:string, not an account-specific /models list. */
export async function checkNaiSchema(): Promise<{ fields: string[]; modelIds: string[] }> {
    const response = await fetch('https://image.novelai.net/docs/doc.json', { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('暂时无法读取 NAI 官方接口定义');
    const doc = await response.json();
    if (!doc.paths?.['/ai/generate-image']) throw new Error('官方接口定义已变化，请更新接入代码');
    const fields = Object.keys(doc.definitions?.['image.RequestParameters']?.properties || {});
    const modelIds = doc.definitions?.['image.ImageGenerationRequest']?.properties?.model?.enum || [];
    return { fields, modelIds };
}
export async function decodeNaiImages(response: Response): Promise<Blob[]> {
    const type = response.headers.get('content-type') || '';
    if (type.startsWith('image/')) return [await response.blob()];
    if (type.includes('json')) {
        const result = await response.json();
        if (!Array.isArray(result.images) || !result.images.length) throw new Error('NAI 没有返回图片');
        return result.images.map((entry: any) => {
            if (typeof entry.image !== 'string') throw new Error('NAI 图片响应格式已变化');
            const bytes = Uint8Array.from(atob(entry.image), c => c.charCodeAt(0));
            return new Blob([bytes], { type: 'image/png' });
        });
    }
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const files = Object.values(zip.files).filter(file => !file.dir && /\.(png|webp|jpe?g)$/i.test(file.name));
    if (!files.length) throw new Error('NAI 返回的压缩包里没有图片');
    return Promise.all(files.map(async file => new Blob([new Uint8Array(await file.async('uint8array'))], { type: /\.webp$/i.test(file.name) ? 'image/webp' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : 'image/png' })));
}
export interface NaiGeneratedImage { token: string; generationId: string; request: NaiRequest; blob: Blob }
let running = false;
export async function generateNaiImages(state: NaiState, request: NaiRequest, signal?: AbortSignal): Promise<NaiGeneratedImage[]> {
    if (running) throw new Error('已有一项 NAI 生图正在进行，请等待完成');
    validateNaiRequest(request);
    if (!state.connection.apiKey.trim()) throw new Error('先在设置 → NovelAI 生图填写并保存 Key');
    running = true;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 180000);
    try {
        if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
        // One request, no automatic retries: generation can consume Anlas.
        const response = await fetch(`${naiBaseUrl(state.connection.baseUrl)}/ai/generate-image`, {
            method: 'POST', headers: { Authorization: `Bearer ${state.connection.apiKey.trim().replace(/^Bearer\s+/i, '')}`, 'Content-Type': 'application/json', Accept: 'application/zip' },
            body: JSON.stringify(request), signal: controller.signal,
        });
        if (!response.ok) throw naiHttpError(response.status);
        const blobs = await decodeNaiImages(response);
        const result: NaiGeneratedImage[] = [];
        for (const blob of blobs) {
            if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
            const token = await putImageBlob(blob);
            result.push({ token, generationId: crypto.randomUUID(), request: structuredClone(request), blob });
        }
        return result;
    } catch (error) {
        if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (controller.signal.aborted) throw new Error('NAI 等待已超时，未自动重试。请求可能已计费，请检查后再决定是否重发');
        if (error instanceof TypeError) throw new Error('连接 NAI 失败。请检查当前网络能否访问 NAI；如使用代理，请填你信任的 NAI 兼容代理地址');
        throw error;
    } finally {
        clearTimeout(timeout); signal?.removeEventListener('abort', abort); running = false;
    }
}
export async function saveNaiImageToAlbum(image: NaiGeneratedImage, charId: string, sourceMessageId?: number): Promise<void> {
    if (!charId) throw new Error('请选择归属角色再保存相册');
    // Request metadata contains no credentials; the original image Blob is not recompressed.
    await DB.saveAssetRaw(`nai_generation_${image.generationId}`, { provider: 'nai', charId, token: image.token, request: image.request });
    await DB.saveGalleryImage({ id: `nai_${image.generationId}`, charId, url: image.token, timestamp: Date.now(), sourceMessageId, chatContext: [`[NAI] ${image.request.model}`, image.request.input] });
}
