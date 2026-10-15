/** NovelAI uses its own image API, not OpenAI's /images endpoint. */
export const NAI_ORIGIN = 'https://image.novelai.net';
export const NAI_ASSET_ID = 'nai_workspace_v1';
export const NAI_MODELS = [
    { id: 'nai-diffusion-4-5-curated', name: 'V4.5 Curated · v4.5c' },
    { id: 'nai-diffusion-4-5-full', name: 'V4.5 Full · v4.5f' },
    { id: 'nai-diffusion-5-full', name: 'V5 Full · v5f' },
    { id: 'nai-diffusion-5-curated', name: 'V5 Curated · v5c' },
    { id: 'nai-diffusion-4-full', name: 'V4 Full' },
    { id: 'nai-diffusion-4-curated-preview', name: 'V4 Curated' },
    { id: 'nai-diffusion-3', name: 'NAI Diffusion V3' },
    { id: 'nai-diffusion-furry-3', name: 'Furry Diffusion V3' },
    { id: 'nai-diffusion-furry', name: 'Furry Diffusion' },
];
export const NAI_SAMPLERS = [
    { id: 'k_euler', name: 'Euler' }, { id: 'k_euler_ancestral', name: 'Euler Ancestral' },
    { id: 'k_dpmpp_2m', name: 'DPM++ 2M' }, { id: 'k_dpmpp_2m_sde', name: 'DPM++ 2M SDE' },
    { id: 'k_dpmpp_2s_ancestral', name: 'DPM++ 2S Ancestral' }, { id: 'k_dpmpp_sde', name: 'DPM++ SDE' },
];
export const NAI_NOISES = [{ id: 'karras', name: 'Karras' }, { id: 'exponential', name: 'Exponential' }, { id: 'polyexponential', name: 'Polyexponential' }, { id: 'native', name: 'Native（模型原生）' }];
export function normalizeNaiModel(value: string): string {
    const input = value.trim();
    if (NAI_MODELS.some(model => model.id === input)) return input;
    const label = input.toLowerCase().replace(/[._\-()·]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const model of NAI_MODELS) {
        const version = model.id.match(/nai-diffusion-(4-5|[345])-(full|curated)/);
        if (version) {
            const number = version[1].replace('-', ' ');
            const short = version[1].replace('-', '.') + (version[2] === 'full' ? 'f' : 'c');
            if (label === ('v' + short).replace('.', ' ') || (label.includes('diffusion') && new RegExp('(?:v| )' + number + '(?: |$)').test(label) && label.includes(version[2]))) return model.id;
        }
    }
    const named = NAI_MODELS.find(model => model.name.toLowerCase() === input.toLowerCase());
    return named?.id || input;
}
export const NAI_SCENE_GUIDE = `只输出可见的画面信息，不输出思考过程。照片只表现最新一轮中角色此刻分享的场景，禁止生成整段聊天总结或从旧剧情补地点、服装、食物。不确定就不自动发图。提到喝水、吃饭或出门不代表必须发图。
photoType 必填：selfie 本人出镜，food 美食特写，scenery 眼前景物，object 物品。后三类不得有人物，characters 必须为空。把对话中的场景转换成英文图像提示词。
scene 写人数、环境、构图、镜头、光照与互动；characters 按人物分开写姿势、服装、表情和动作。不要把不同人物的词混在同一槽。
固定发色、瞳色、种族等由程序从对应档案追加，禁止编造或覆盖。人数和互动必须符合本轮对话；无法确定时不添加人物。
仅当剧情适合展示画面或用户索要图片时才发图，不要每轮发图。scene、positive、negative 均使用英文 tags，不加“姿势与构图”等中文小标题。
输出格式：{"photoType":"selfie","scene":"solo, garden, medium shot, soft light","negative":"","characters":[{"id":"当前角色ID","positive":"sitting, looking at viewer, smiling","negative":"","x":0.5,"y":0.5}]}。
x/y 是 0–1 的画面位置。角色 ID 只能使用本轮给定的 ID；参考图不是角色 ID。不要输出 $宏$、image###Scene、imathink 或未展开的角色变量。`;
export type NaiReferenceMode = 'none' | 'precise' | 'vibe';
export interface NaiReference { id: string; name: string; imageToken: string; enabled: boolean; kind: 'character' | 'style' | 'character&style'; strength: number; fidelity: number; informationExtracted: number }
export interface NaiPreset { id: string; name: string; category: string; positive: string; negative: string }
export interface NaiCharacter { positive: string; negative: string; presetId: string; auto: boolean; includeUser?: boolean; referenceMode?: NaiReferenceMode; references?: NaiReference[] }
export interface NaiSceneDetails { photoType?: 'selfie' | 'food' | 'scenery' | 'object'; negative?: string; characters?: Array<{ id: string; positive: string; negative?: string; x?: number; y?: number }> }
export interface NaiRequest { input: string; model: string; action: string; parameters: Record<string, any> }
export interface NaiState {
    version: 1;
    connection: { apiKey: string; baseUrl: string };
    promptApi?: { enabled: boolean; baseUrl: string; apiKey: string; model: string };
    model: string;
    parameters: Record<string, any>;
    parameterProfiles: Record<string, Record<string, any>>;
    presets: NaiPreset[];
    characters: Record<string, NaiCharacter>;
    /** User-authored instructions for chat's scene description only. */
    sceneGuide: string;
    referenceMode?: NaiReferenceMode;
    references?: NaiReference[];
    defaultPresetId?: string;
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
            characters[id] = { positive: profile.positive, negative: profile.negative, presetId: profile.presetId, auto: profile.auto === true, includeUser: profile.includeUser === true,
                referenceMode: normalizeReferenceMode(profile.referenceMode), references: normalizeReferences(profile.references) };
        }
    }
    return { ...defaults, promptApi: { enabled: value.promptApi?.enabled === true, baseUrl: typeof value.promptApi?.baseUrl === 'string' ? value.promptApi.baseUrl : '', apiKey: typeof value.promptApi?.apiKey === 'string' ? value.promptApi.apiKey : '', model: typeof value.promptApi?.model === 'string' ? value.promptApi.model : '' }, model: typeof value.model === 'string' ? normalizeNaiModel(value.model) : defaults.model,
        parameters: value.parameters && typeof value.parameters === 'object' && !Array.isArray(value.parameters) ? structuredClone(value.parameters) : defaults.parameters,
        connection: { apiKey: typeof value.connection?.apiKey === 'string' ? value.connection.apiKey : '', baseUrl: typeof value.connection?.baseUrl === 'string' ? value.connection.baseUrl : NAI_ORIGIN },
        parameterProfiles: value.parameterProfiles && typeof value.parameterProfiles === 'object' && !Array.isArray(value.parameterProfiles) ? structuredClone(value.parameterProfiles) : {},
        presets: structuredClone(presets), characters, sceneGuide: typeof value.sceneGuide === 'string' ? value.sceneGuide : '',
        referenceMode: normalizeReferenceMode(value.referenceMode), references: normalizeReferences(value.references), defaultPresetId: typeof value.defaultPresetId === 'string' ? value.defaultPresetId : '' };
}
function normalizeReferenceMode(value: unknown): NaiReferenceMode { return value === 'precise' || value === 'vibe' ? value : 'none'; }
function normalizeReferences(value: unknown): NaiReference[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error('参考图库格式不正确');
    return value.map(ref => {
        if (!ref || typeof ref.id !== 'string' || typeof ref.imageToken !== 'string' || typeof ref.name !== 'string') throw new Error('参考图记录不完整');
        return { ...ref, enabled: ref.enabled !== false, kind: ['character', 'style', 'character&style'].includes(ref.kind) ? ref.kind : 'character',
            strength: Number.isFinite(ref.strength) ? ref.strength : 1, fidelity: Number.isFinite(ref.fidelity) ? ref.fidelity : 1, informationExtracted: Number.isFinite(ref.informationExtracted) ? ref.informationExtracted : 1 };
    });
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
    if (/[\s()]/.test(request.model)) throw new Error('模型 ID 不能填写显示名称。请从模型列表选择，例如 nai-diffusion-4-5-full');
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('parameters 必须是 JSON 对象');
    for (const key of ['width', 'height']) if (!Number.isInteger(p[key]) || p[key] < 64 || p[key] > 4096 || p[key] % 64 !== 0) throw new Error('宽高必须是 64 的倍数，范围 64–4096');
    if (!Number.isInteger(p.steps) || p.steps < 1 || p.steps > 50) throw new Error('步数应在 1–50 之间');
    if (!Number.isFinite(p.scale) || p.scale < 0 || p.scale > 100) throw new Error('Guidance 数值无效');
    if (!Number.isInteger(p.n_samples) || p.n_samples < 1 || p.n_samples > 4) throw new Error('每次张数应在 1–4 之间');
    if (!Number.isInteger(p.seed) || p.seed < 0 || p.seed > 0xffffffff) throw new Error('Seed 必须是 0–4294967295 的整数');
    if (typeof p.sampler !== 'string' || !p.sampler || typeof p.noise_schedule !== 'string' || !p.noise_schedule) throw new Error('请填写采样器和噪声计划');
    if (p.image || p.mask || p.img2img) throw new Error('这份配置包含图生图或局部重绘，请在 NAI 官网使用；当前面板仅支持文生图');
    if (p.director_reference_images?.length && !/^nai-diffusion-4-5-/.test(request.model)) throw new Error('精确参考仅支持 V4.5 系列，请切换模型或关闭精确参考');
    if (p.director_reference_images?.length && (p.reference_image_multiple?.length || p.reference_image)) throw new Error('精确参考与 Vibe Transfer 不能同时使用');
    return request;
}
/** Never translate/reorder/normalize the user's artist weights or character tags. */
export function buildNaiRequest(state: NaiState, charId: string, scene: string, extraNegative = '', seed = () => crypto.getRandomValues(new Uint32Array(1))[0], details?: NaiSceneDetails): NaiRequest {
    const character = state.characters[charId] || emptyNaiCharacter();
    const preset = state.presets.find(p => p.id === (charId ? character.presetId : state.defaultPresetId));
    const p = structuredClone(state.parameters);
    const positive = joinTags(preset?.positive || '', scene);
    const negative = joinTags(preset?.negative || '', extraNegative, details?.negative || '');
    if (p.seed === -1 || p.seed === undefined) p.seed = seed();
    // NAI's quality/UC switches are frontend hints, not prompt expansion by the API.
    // Use explicit text to avoid silently inventing model-dependent presets.
    p.qualityToggle = false;
    p.ucPreset = 3;
    p.negative_prompt = negative;
    if ('prompt' in p) p.prompt = positive;
    const participants = (details?.photoType && details.photoType !== 'selfie' ? [] : [charId, ...(character.includeUser && state.characters.__user__?.positive.trim() && (!details?.characters?.length || details.characters.some(person => person.id === '__user__')) ? ['__user__'] : [])]).filter(id => state.characters[id]?.positive.trim());
    const captions = participants.map(id => {
        const fixed = state.characters[id]; const action = details?.characters?.find(person => person.id === id);
        const coordinate = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
        return { positive: joinTags(fixed.positive, action?.positive || ''), negative: joinTags(fixed.negative, action?.negative || ''), centers: [{ x: coordinate(action?.x), y: coordinate(action?.y) }] };
    });
    const model = normalizeNaiModel(state.model);
    if (/^nai-diffusion-4/.test(model) && p.noise_schedule === 'native') throw new Error('V4 / V4.5 不使用 Native 噪声调度，请选择 Karras、Exponential 或 Polyexponential');
    let input = positive;
    if (/^nai-diffusion-[45]/.test(model)) {
        p.v4_prompt = { ...(p.v4_prompt || {}), caption: { base_caption: positive, char_captions: captions.map(c => ({ char_caption: c.positive, centers: c.centers })) }, use_coords: !!details?.characters?.some(c => typeof c.x === 'number' || typeof c.y === 'number'), use_order: true };
        p.v4_negative_prompt = { ...(p.v4_negative_prompt || {}), caption: { base_caption: negative, char_captions: captions.map(c => ({ char_caption: c.negative, centers: c.centers })) }, legacy_uc: false };
    } else {
        delete p.v4_prompt; delete p.v4_negative_prompt;
        input = joinTags(positive, ...captions.map(c => c.positive));
        p.negative_prompt = joinTags(negative, ...captions.map(c => c.negative));
    }
    if (/^nai-diffusion-5-/.test(model)) p.noise_schedule = 'karras';
    if (p.nai_variety_plus === true && /^nai-diffusion-4/.test(model)) p.skip_cfg_above_sigma = (model.startsWith('nai-diffusion-4-5-') ? 58 : 19) * Math.sqrt((Math.floor(p.width / 8) * Math.floor(p.height / 8)) / (104 * 152));
    if (p.nai_variety_plus === false || /^nai-diffusion-5-/.test(model)) delete p.skip_cfg_above_sigma;
    delete p.nai_variety_plus;
    if (p.sampler === 'k_euler_ancestral' && p.noise_schedule !== 'native') { p.deliberate_euler_ancestral_bug ??= false; p.prefer_brownian ??= true; }
    return validateNaiRequest({ input, model, action: 'generate', parameters: p });
}
/** Exact request mode keeps all generation fields; no presets/character tags are appended. */
export function parseNaiRequest(text: string): NaiRequest {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('完整请求必须是包含 input、model 和 parameters 的 JSON 对象');
    const request: NaiRequest = { input: value.input, model: value.model, action: value.action || 'generate', parameters: structuredClone(value.parameters) };
    return validateNaiRequest(request);
}
export function exportNaiLibrary(state: NaiState): string {
    const { connection, promptApi, ...library } = state;
    return JSON.stringify(library, null, 2);
}
export function importNaiLibrary(text: string, current: NaiState): NaiState {
    const imported = JSON.parse(text);
    if (imported.version !== 1) throw new Error('不支持这份 NAI 资料库版本');
    const state = normalizeNaiState({ ...imported, connection: current.connection, promptApi: current.promptApi });
    // Importing somebody's library must not enable paid automatic generation.
    for (const profile of Object.values(state.characters)) profile.auto = false;
    return state;
}
export function extractNaiScene(text: string): { text: string; scene: string | null; details?: NaiSceneDetails } {
    const pattern = /<nai_image>([\s\S]*?)<\/nai_image>/gi;
    const protectedRanges = [...text.matchAll(/<(think|thinking|imathink)>[\s\S]*?<\/\1>|```[\s\S]*?```/gi)].map(match => [match.index!, match.index! + match[0].length]);
    let scene: string | null = null; let details: NaiSceneDetails | undefined;
    const cleaned = text.replace(pattern, (_, raw, offset: number) => {
        if (scene === null && !protectedRanges.some(([start, end]) => offset >= start && offset < end)) { try { const value = JSON.parse(raw); if (typeof value.scene === 'string' && value.scene.trim()) { scene = value.scene.trim().slice(0, 6000); details = parseNaiSceneDetails(value); } } catch { /* invalid directives never generate */ } }
        return '';
    }).replace(/<nai_image>[\s\S]*$/gi, '');
    return { text: cleaned, scene, details };
}
export function parseNaiSceneDetails(value: any): NaiSceneDetails {
    return { photoType: ['selfie', 'food', 'scenery', 'object'].includes(value.photoType) ? value.photoType : undefined, negative: typeof value.negative === 'string' ? value.negative.slice(0, 3000) : '', characters: Array.isArray(value.characters) ? value.characters.slice(0, 8).filter((c: any) => c && typeof c.id === 'string' && typeof c.positive === 'string').map((c: any) => ({ id: c.id, positive: c.positive.slice(0, 3000), negative: typeof c.negative === 'string' ? c.negative.slice(0, 3000) : '', x: typeof c.x === 'number' ? c.x : undefined, y: typeof c.y === 'number' ? c.y : undefined })) : [] };
}
export function naiSceneInstruction(state: NaiState, charId: string): string {
    const profile = state.characters[charId];
    if (!state.connection.apiKey.trim() || !profile?.auto || !profile.positive.trim()) return '';
    return `\n用户已为当前角色开启 NAI 生图。${NAI_SCENE_GUIDE}\n当前角色 ID：${charId}。${profile.includeUser && state.characters.__user__?.positive.trim() ? '用户 ID：__user__，允许在合照中使用。' : '未配置用户生图档案，不能编造用户外观。'}${state.sceneGuide ? '\n用户的场景描述规则：\n' + state.sceneGuide : ''}\n程序输出契约：需要发图时，把上述 JSON 放在回复末尾 <nai_image>...</nai_image> 内，最多一次。不需要发图时不输出这个标签。额外规则只能调整画面内容，不能改成 image###Scene、imathink 或酒馆宏格式。固定外貌与画师组合由程序添加。只有系统返回图片才算发图成功。`;
}
