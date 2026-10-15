import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { buildNaiRequest, defaultNaiState, NAI_ASSET_ID } from './nai';
import { checkNaiConnection, decodeNaiImages, generateNaiImages, loadNaiState, saveNaiState } from './naiService';
import { DB } from './db';
import { readNaiPng } from './naiPng';

afterEach(() => vi.restoreAllMocks());
describe('NAI 接口与保存', () => {
    it('无真实 API 请求即可验证资料库 IndexedDB 保存与恢复', async () => {
        const state = defaultNaiState(); state.presets.push({ id: 'p1', name: 'test', category: '分类', positive: '{watercolor}', negative: 'text' });
        await saveNaiState(state);
        expect((await loadNaiState()).presets).toEqual(state.presets);
        expect((await DB.getAssetRaw(NAI_ASSET_ID)).version).toBe(1);
        const backup = await DB.exportFullData();
        expect((backup.assets as any[]).find(asset => asset.id === NAI_ASSET_ID).data.presets).toEqual(state.presets);
    });
    it('连接检查只读订阅，不调用生图', async () => {
        const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
        await checkNaiConnection({ apiKey: 'pst-test', baseUrl: 'https://image.novelai.net' });
        expect(fetcher.mock.calls[0][0]).toBe('https://image.novelai.net/user/subscription');
        expect(fetcher.mock.calls).toHaveLength(1);
    });
    it('保留 ZIP 内原始图片字节，忽略非图片文件', async () => {
        const zip = new JSZip(); const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
        zip.file('image_0.png', bytes); zip.file('note.txt', 'not an image');
        const images = await decodeNaiImages(new Response(new Uint8Array(await zip.generateAsync({ type: 'uint8array' })), { headers: { 'content-type': 'application/zip' } }));
        expect(images).toHaveLength(1);
        expect(new Uint8Array(await images[0].arrayBuffer())).toEqual(bytes);
    });
    it('429 不自动重试，错误消息不含 Key', async () => {
        const state = defaultNaiState(); state.connection.apiKey = 'secret-test';
        const request = buildNaiRequest(state, '', 'rain', '', () => 10);
        const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('secret-test', { status: 429 }));
        await expect(generateNaiImages(state, request)).rejects.toThrow('限流');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it('缺失 Key 不发送请求', async () => {
        const fetcher = vi.spyOn(globalThis, 'fetch'); const state = defaultNaiState();
        await expect(generateNaiImages(state, buildNaiRequest(state, '', 'rain', '', () => 1))).rejects.toThrow('Key');
        expect(fetcher).not.toHaveBeenCalled();
    });
    it('不猜测已剥离参数的 PNG 元数据', async () => {
        await expect(readNaiPng(new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])]))).rejects.toThrow('元数据');
    });
    it('从标准 PNG 文本元数据读取实际种子、负面词与明确模型', async () => {
        const encoder = new TextEncoder();
        const chunk = (type: string, text: string) => {
            const data = encoder.encode(text); const bytes = new Uint8Array(data.length + 12);
            new DataView(bytes.buffer).setUint32(0, data.length); bytes.set(encoder.encode(type), 4); bytes.set(data, 8);
            return bytes;
        };
        const parameters = { prompt: '1boy, garden', uc: 'text, lowres', seed: 42, width: 832, height: 1216, steps: 28, scale: 5, sampler: 'k_euler_ancestral', noise_schedule: 'karras' };
        const png = new Blob([Uint8Array.from([137,80,78,71,13,10,26,10]), chunk('tEXt', 'Source\0NovelAI Diffusion V4.5 Full'), chunk('tEXt', 'Comment\0' + JSON.stringify(parameters))]);
        const request = await readNaiPng(png);
        expect(request.model).toBe('nai-diffusion-4-5-full');
        expect(request.parameters.seed).toBe(42);
        expect(request.parameters.negative_prompt).toBe('text, lowres');
        expect(request.parameters.v4_prompt.caption.base_caption).toBe('1boy, garden');
    });
});
