import { describe, expect, it } from 'vitest';
import { buildNaiRequest, defaultNaiState, emptyNaiCharacter, exportNaiLibrary, extractNaiScene, importNaiLibrary, naiBaseUrl, naiSceneInstruction, normalizeNaiState, parseNaiRequest } from './nai';

function example() {
    const state = defaultNaiState();
    state.connection.apiKey = 'test-secret-never-export';
    state.presets = [{ id: 'p1', name: '水彩组合', category: '水彩', positive: '1.2::artist:example::, {watercolor}', negative: '[bad hands], text' }];
    state.characters.c1 = { positive: '1boy, black hair, blue eyes', negative: 'green eyes', presetId: 'p1', auto: true };
    return state;
}
describe('NAI 参数与角色隔离', () => {
    it.each(['nai-diffusion-4-5-curated', 'nai-diffusion-4-5-full', 'nai-diffusion-5-full'])('为 %s 保留画师权重和角色独立提示词', model => {
        const state = example(); state.model = model;
        const before = JSON.stringify(state);
        const request = buildNaiRequest(state, 'c1', 'standing, rain', 'extra fingers', () => 123);
        expect(request.model).toBe(model);
        expect(request.input).toBe('1.2::artist:example::, {watercolor}, standing, rain');
        expect(request.parameters.negative_prompt).toBe('[bad hands], text, extra fingers');
        expect(request.parameters.v4_prompt.caption.char_captions[0].char_caption).toBe('1boy, black hair, blue eyes');
        expect(request.parameters.v4_negative_prompt.caption.char_captions[0].char_caption).toBe('green eyes');
        expect(request.parameters.seed).toBe(123);
        expect(JSON.stringify(state)).toBe(before);
    });
    it('不同角色互不串外貌，固定种子保留', () => {
        const state = example(); state.characters.c2 = { ...emptyNaiCharacter(), positive: '1girl, pink hair' }; state.parameters.seed = 0;
        const request = buildNaiRequest(state, 'c2', 'sitting');
        expect(request.parameters.seed).toBe(0);
        expect(JSON.stringify(request)).toContain('pink hair');
        expect(JSON.stringify(request)).not.toContain('black hair');
        expect(JSON.stringify(request)).not.toContain('artist:example');
    });
    it('完整请求保持多角色、质量相关参数、扩展参数，不叠加预设或凭据', () => {
        const request = buildNaiRequest(example(), 'c1', 'smile', '', () => 12);
        request.parameters.qualityToggle = true;
        request.parameters.v4_prompt.caption.char_captions.push({ char_caption: '1girl, red hair', centers: [{ x: 0.9, y: 0.5 }] });
        request.parameters.future_parameter = { untouched: true };
        const parsed = parseNaiRequest(JSON.stringify({ ...request, headers: { Authorization: 'secret' } }));
        expect(parsed).toEqual(request);
        expect(JSON.stringify(parsed)).not.toContain('secret');
    });
    it('拒绝无效参数与图生图，不把缺失种子伪装成已知种子', () => {
        const request = buildNaiRequest(example(), 'c1', 'smile', '', () => 12);
        expect(() => parseNaiRequest(JSON.stringify({ ...request, parameters: { ...request.parameters, width: 833 } }))).toThrow('64');
        expect(() => parseNaiRequest(JSON.stringify({ ...request, parameters: { ...request.parameters, seed: -1 } }))).toThrow('Seed');
        expect(() => parseNaiRequest(JSON.stringify({ ...request, parameters: { ...request.parameters, image: 'base64' } }))).toThrow('图生图');
    });
    it('资料库导出不含密钥，导入不换现有连接，也不自动开启收费生图', () => {
        const exported = exportNaiLibrary(example());
        expect(exported).not.toContain('test-secret-never-export');
        const current = defaultNaiState(); current.connection.apiKey = 'my-own-key';
        const restored = importNaiLibrary(exported, current);
        expect(restored.connection.apiKey).toBe('my-own-key');
        expect(restored.presets).toEqual(example().presets);
        expect(restored.characters.c1.auto).toBe(false);
        expect(restored.characters.c1.positive).toContain('black hair');
    });
    it('自动生图规则必须显式开启且配置角色特征，不把 API Key 注入聊天', () => {
        const state = example();
        expect(naiSceneInstruction(state, 'c1')).toContain('<nai_image>');
        expect(naiSceneInstruction(state, 'c1')).not.toContain(state.connection.apiKey);
        state.characters.c1.auto = false;
        expect(naiSceneInstruction(state, 'c1')).toBe('');
        expect(naiSceneInstruction(state, 'unknown')).toBe('');
    });
    it('只提取一个有效图像指令，忽略思考与示例，删除未闭合控制标签', () => {
        const text = '<think><nai_image>{"scene":"thought"}</nai_image></think>```<nai_image>{"scene":"example"}</nai_image>```你好<nai_image>{"scene":"rain"}</nai_image><nai_image>{"scene":"snow"}</nai_image>';
        expect(extractNaiScene(text).scene).toBe('rain');
        expect(extractNaiScene(text).text).toContain('你好');
        expect(extractNaiScene('<nai_image>invalid</nai_image>').scene).toBeNull();
        expect(extractNaiScene('你好<nai_image>{').text).toBe('你好');
    });
    it('拒绝损坏的资料库和非 HTTPS 外部连接', () => {
        expect(() => normalizeNaiState({ presets: [{ id: 'p' }] })).toThrow();
        expect(() => naiBaseUrl('http://example.com')).toThrow('HTTPS');
        expect(naiBaseUrl('https://image.novelai.net/')).toBe('https://image.novelai.net');
    });
});
