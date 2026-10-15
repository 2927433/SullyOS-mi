import { NAI_MODELS, validateNaiRequest, type NaiRequest } from './nai';

/** Standard PNG text metadata only. Missing/stripped metadata must be reported. */
export async function readNaiPng(file: Blob): Promise<NaiRequest> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer);
    if (bytes.length < 8 || Array.from(bytes.slice(0, 8)).join(',') !== '137,80,78,71,13,10,26,10') throw new Error('请选择 NAI 原始 PNG 图片');
    const metadata: Record<string, string> = {};
    let width = 0, height = 0;
    for (let pos = 8; pos + 12 <= bytes.length;) {
        const length = view.getUint32(pos); const end = pos + 12 + length;
        if (end > bytes.length) throw new Error('PNG 文件不完整');
        const type = new TextDecoder().decode(bytes.slice(pos + 4, pos + 8));
        const data = bytes.slice(pos + 8, pos + 8 + length);
        if (type === 'IHDR' && length >= 8) { width = view.getUint32(pos + 8); height = view.getUint32(pos + 12); }
        if (type === 'tEXt') {
            const zero = data.indexOf(0);
            if (zero > 0) metadata[new TextDecoder().decode(data.slice(0, zero))] = new TextDecoder().decode(data.slice(zero + 1));
        }
        if (type === 'iTXt') {
            let zero = data.indexOf(0);
            const key = new TextDecoder().decode(data.slice(0, zero));
            const compressed = data[zero + 1] === 1;
            let start = zero + 3;
            zero = data.indexOf(0, start); start = zero + 1;
            zero = data.indexOf(0, start); start = zero + 1;
            if (start > 0) {
                const raw = data.slice(start);
                metadata[key] = compressed ? await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate'))).text() : new TextDecoder().decode(raw);
            }
        }
        pos = end;
    }
    if (!metadata.Comment) throw new Error('图片没有可读取的 NAI Comment 元数据。请使用官网下载的原图，或导入完整请求 JSON；不支持已剥除或隐藏编码的参数');
    let parameters: Record<string, any>;
    try { parameters = JSON.parse(metadata.Comment); } catch { throw new Error('PNG 中的 NAI 参数不是有效 JSON'); }
    const source = metadata.Source || '';
    const mapped = /\bV?4\.5\b/i.test(source) && /curated/i.test(source) ? NAI_MODELS[0].id
        : /\bV?4\.5\b/i.test(source) && /full/i.test(source) ? NAI_MODELS[1].id
        : /\bV?5\b/i.test(source) && /full/i.test(source) ? 'nai-diffusion-5-full' : '';
    const model = parameters.model || mapped;
    if (!model) throw new Error('不能从原图确定模型，请改为导入包含 model 的完整请求 JSON');
    const p: Record<string, any> = { ...parameters, width: parameters.width || width, height: parameters.height || height, n_samples: parameters.n_samples || 1, negative_prompt: parameters.negative_prompt ?? parameters.uc ?? '' };
    if (!p.v4_prompt && /^nai-diffusion-[45]/.test(model)) {
        p.v4_prompt = { caption: { base_caption: parameters.prompt || '', char_captions: [] }, use_coords: false, use_order: true };
        p.v4_negative_prompt = { caption: { base_caption: p.negative_prompt, char_captions: [] } };
    }
    return validateNaiRequest({ input: parameters.prompt || p.v4_prompt?.caption?.base_caption || metadata.Description || '', action: 'generate', model, parameters: p });
}
