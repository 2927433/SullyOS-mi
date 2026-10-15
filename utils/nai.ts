/** NovelAI uses its own image API, not OpenAI's /images endpoint. */
export const NAI_ORIGIN = 'https://image.novelai.net';
export const NAI_ASSET_ID = 'nai_workspace_v1';
export const NAI_MODELS = [
    { id: 'nai-diffusion-4-5-curated', name: 'V4.5 Curated · v4.5c' },
    { id: 'nai-diffusion-4-5-full', name: 'V4.5 Full · v4.5f' },
    { id: 'nai-diffusion-5-full', name: 'V5 Full · v5f' },
];
export interface NaiPreset { id: string; name: string; category: string; positive: string; negative: string }
export interface NaiCharacter { positive: string; negative: string; presetId: string; auto: boolean }
export interface NaiRequest { input: string; model: string; action: string; parameters: Record<string, any> }
export interface NaiState {
    version: 1;
    connection: { apiKey: string; baseUrl: string };
    model: string;
    parameters: Record<string, any>;
    parameterProfiles: Record<string, Record<string, any>>;
    presets: NaiPreset[];
    characters: Record<string, NaiCharacter>;
    /** User-authored instructions for chat's scene description only. */
    sceneGuide: string;
}
export const emptyNaiCharacter = (): NaiCharacter => ({ positive: '', negative: '', presetId: '', auto: false });
export function defaultNaiState(): NaiState {
    return {
        version: 1, connection: { apiKey: '', baseUrl: NAI_ORIGIN }, model: NAI_MODELS[0].id,
        parameters: { width: 832, height: 1216, steps: 28, scale: 5, cfg_rescale: 0, sampler: 'k_euler_ancestral', noise_schedule: 'karras', seed: -1, n_samples: 1, params_version: 3, qualityToggle: false, ucPreset: 3, sm: false, sm_dyn: false },
        parameterProfiles: {}, presets: [], characters: {}, sceneGuide: '',
    };
}
export function normalizeNaiState(value: any): NaiState {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('NAI 配置格式不正确');
    const defaults = defaultNaiState();
    const presets = Array.isArray(value.presets) ? value.presets : [];
    const ids = new Set<string>();
    for (const preset of presets) {
        if (!preset || typeof preset.id !== 'string' || !preset.id || ids.has(preset.id) || !['name', 'category', 'positive', 'negative'].every(key => typeof preset[key] === 'string')) throw new Error('提示词组合格式不正确，或存在重复 ID');
        ids.add(preset.id);
    }
    const characters: Record<string, NaiCharacter> = {};
    if (value.characters && typeof value.characters === 'object' && !Array.isArray(value.characters)) {
        for (const [id, raw] of Object.entries(value.characters)) {
            const profile = raw as any;
            if (!profile || !['positive', 'negative', 'presetId'].every(key => typeof profile[key] === 'string')) throw new Error('角色生图档案格式不正确');
            characters[id] = { positive: profile.positive, negative: profile.negative, presetId: profile.presetId, auto: profile.auto === true };
        }
    }
    return { ...defaults, model: typeof value.model === 'string' ? value.model : defaults.model,
        parameters: value.parameters && typeof value.parameters === 'object' && !Array.isArray(value.parameters) ? structuredClone(value.parameters) : defaults.parameters,
        connection: { apiKey: typeof value.connection?.apiKey === 'string' ? value.connection.apiKey : '', baseUrl: typeof value.connection?.baseUrl === 'string' ? value.connection.baseUrl : NAI_ORIGIN },
        parameterProfiles: value.parameterProfiles && typeof value.parameterProfiles === 'object' && !Array.isArray(value.parameterProfiles) ? structuredClone(value.parameterProfiles) : {},
        presets: structuredClone(presets), characters, sceneGuide: typeof value.sceneGuide === 'string' ? value.sceneGuide : '' };
}
export function naiBaseUrl(value: string): string {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('NAI 服务地址需要使用 HTTPS');
    if (url.username || url.password || url.search || url.hash) throw new Error('NAI 地址不能包含账号、查询参数或片段');
    return url.href.replace(/\/+$/, '');
}
const joinTags = (...values: string[]) => values.filter(value => value.trim()).join(', ');
export function validateNaiRequest(request: NaiRequest): NaiRequest {
    if (!request || typeof request.input !== 'string' || !request.input.trim() || typeof request.model !== 'string' || !request.model.trim() || request.action !== 'generate') throw new Error('请提供模型和提示词；当前面板支持文生图 generate');
    const p = request.parameters;
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('parameters 必须是 JSON 对象');
    for (const key of ['width', 'height']) if (!Number.isInteger(p[key]) || p[key] < 64 || p[key] > 4096 || p[key] % 64 !== 0) throw new Error('宽高必须是 64 的倍数，范围 64–4096');
    if (!Number.isInteger(p.steps) || p.steps < 1 || p.steps > 50) throw new Error('步数应在 1–50 之间');
    if (!Number.isFinite(p.scale) || p.scale < 0 || p.scale > 100) throw new Error('Guidance 数值无效');
    if (!Number.isInteger(p.n_samples) || p.n_samples < 1 || p.n_samples > 4) throw new Error('每次张数应在 1–4 之间');
    if (!Number.isInteger(p.seed) || p.seed < 0 || p.seed > 0xffffffff) throw new Error('Seed 必须是 0–4294967295 的整数');
    if (typeof p.sampler !== 'string' || !p.sampler || typeof p.noise_schedule !== 'string' || !p.noise_schedule) throw new Error('请填写采样器和噪声计划');
    if (p.image || p.mask || p.img2img) throw new Error('这份配置包含图生图或局部重绘，请在 NAI 官网使用；当前面板仅支持文生图');
    return request;
}
/** Never translate/reorder/normalize the user's artist weights or character tags. */
export function buildNaiRequest(state: NaiState, charId: string, scene: string, extraNegative = '', seed = () => crypto.getRandomValues(new Uint32Array(1))[0]): NaiRequest {
    const character = state.characters[charId] || emptyNaiCharacter();
    const preset = state.presets.find(p => p.id === character.presetId);
    const p = structuredClone(state.parameters);
    const positive = joinTags(preset?.positive || '', scene);
    const negative = joinTags(preset?.negative || '', extraNegative);
    if (p.seed === -1 || p.seed === undefined) p.seed = seed();
    // NAI's quality/UC switches are frontend hints, not prompt expansion by the API.
    // Use explicit text to avoid silently inventing model-dependent presets.
    p.qualityToggle = false;
    p.ucPreset = 3;
    p.negative_prompt = negative;
    if ('prompt' in p) p.prompt = positive;
    p.v4_prompt = { ...(p.v4_prompt || {}), caption: { base_caption: positive, char_captions: character.positive.trim() ? [{ char_caption: character.positive, centers: [{ x: 0.5, y: 0.5 }] }] : [] }, use_coords: false, use_order: true };
    p.v4_negative_prompt = { ...(p.v4_negative_prompt || {}), caption: { base_caption: negative, char_captions: character.positive.trim() ? [{ char_caption: character.negative, centers: [{ x: 0.5, y: 0.5 }] }] : [] } };
    return validateNaiRequest({ input: positive, model: state.model, action: 'generate', parameters: p });
}
/** Exact request mode keeps all generation fields; no presets/character tags are appended. */
export function parseNaiRequest(text: string): NaiRequest {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('完整请求必须是包含 input、model 和 parameters 的 JSON 对象');
    const request: NaiRequest = { input: value.input, model: value.model, action: value.action || 'generate', parameters: structuredClone(value.parameters) };
    return validateNaiRequest(request);
}
export function exportNaiLibrary(state: NaiState): string {
    const { connection, ...library } = state;
    return JSON.stringify(library, null, 2);
}
export function importNaiLibrary(text: string, current: NaiState): NaiState {
    const imported = JSON.parse(text);
    if (imported.version !== 1) throw new Error('不支持这份 NAI 资料库版本');
    const state = normalizeNaiState({ ...imported, connection: current.connection });
    // Importing somebody's library must not enable paid automatic generation.
    for (const profile of Object.values(state.characters)) profile.auto = false;
    return state;
}
export function extractNaiScene(text: string): { text: string; scene: string | null } {
    const pattern = /<nai_image>([\s\S]*?)<\/nai_image>/gi;
    const protectedRanges = [...text.matchAll(/<(think|thinking)>[\s\S]*?<\/\1>|```[\s\S]*?```/gi)].map(match => [match.index!, match.index! + match[0].length]);
    let scene: string | null = null;
    const cleaned = text.replace(pattern, (_, raw, offset: number) => {
        if (scene === null && !protectedRanges.some(([start, end]) => offset >= start && offset < end)) { try { const value = JSON.parse(raw); if (typeof value.scene === 'string' && value.scene.trim()) scene = value.scene.trim().slice(0, 6000); } catch { /* invalid directives never generate */ } }
        return '';
    }).replace(/<nai_image>[\s\S]*$/gi, '');
    return { text: cleaned, scene };
}
export function naiSceneInstruction(state: NaiState, charId: string): string {
    const profile = state.characters[charId];
    if (!state.connection.apiKey.trim() || !profile?.auto || !profile.positive.trim()) return '';
    return `\n用户已为当前角色开启 NAI 生图。仅在用户索要照片、自拍或本轮情境适合分享画面时，最多在回复末尾附加一次 <nai_image>{"scene":"English tags describing pose, clothes, expression, background, lighting and framing"}</nai_image>。不必每轮发图。scene 仅描述本轮场景，不要包含画师名、质量词、人物姓名、发色、瞳色、种族、身体固定特征或他人外观；固定外貌与画师组合由程序添加，不允许更改。只有系统返回图片才算发图成功。${state.sceneGuide ? '\n用户的场景描述规则：\n' + state.sceneGuide : ''}`;
}
