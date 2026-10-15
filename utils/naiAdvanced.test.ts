import { describe, expect, it } from 'vitest';
import { buildNaiRequest, defaultNaiState, emptyNaiCharacter, extractNaiScene, normalizeNaiModel, normalizeNaiState, exportNaiLibrary, importNaiLibrary, NAI_MODELS } from './nai';
import { applyPreparedNaiReferences, preciseCanvasSize, selectedNaiReferences } from './naiReferences';
import { readNaiApiError } from './naiService';

describe('NAI 修复和高级参数', () => {
    it.each(['nai-diffusion v4.5 (full)', 'NAI Diffusion V4.5 (Full)', 'v4.5f'])('把截图式显示名 %s 迁移为正确模型 ID', label => {
        expect(normalizeNaiModel(label)).toBe('nai-diffusion-4-5-full');
        expect(normalizeNaiState({ ...defaultNaiState(), model: label }).model).toBe('nai-diffusion-4-5-full');
    });
    it('无角色资料也能构造全部内置模型的文生图请求', () => {
        for (const model of NAI_MODELS) {
            const state = defaultNaiState(); state.model = model.id;
            const request = buildNaiRequest(state, '', 'solo, garden', '', () => 1);
            expect(request.model).toBe(model.id);
            expect(request.input).toBe('solo, garden');
            if (/^nai-diffusion-[45]/.test(model.id)) expect(request.parameters.v4_prompt.caption.char_captions).toEqual([]);
            else expect(request.parameters.v4_prompt).toBeUndefined();
        }
    });
    it('旧模型使用平铺人物词；V5 固定 Karras；Variety+ 只发官方字段', () => {
        const state = defaultNaiState(); state.characters.c1 = { ...emptyNaiCharacter(), positive: 'black hair' };
        state.model = 'nai-diffusion-3';
        expect(buildNaiRequest(state, 'c1', 'garden').input).toContain('black hair');
        state.model = 'nai-diffusion-5-full'; state.parameters.noise_schedule = 'exponential';
        expect(buildNaiRequest(state, 'c1', 'garden').parameters.noise_schedule).toBe('karras');
        state.model = 'nai-diffusion-4-5-full'; state.parameters.nai_variety_plus = true;
        const request = buildNaiRequest(state, 'c1', 'garden');
        expect(request.parameters.skip_cfg_above_sigma).toBe(58);
        expect(request.parameters.nai_variety_plus).toBeUndefined();
    });
    it('分开角色与用户的固定外观、动作、位置，忽略未授权角色', () => {
        const state = defaultNaiState();
        state.characters.c1 = { ...emptyNaiCharacter(), positive: '1boy, black hair', includeUser: true };
        state.characters.__user__ = { ...emptyNaiCharacter(), positive: '1girl, pink hair' };
        const parsed = extractNaiScene('<nai_image>{"scene":"2people, garden","characters":[{"id":"c1","positive":"standing","x":0.2,"y":0.5},{"id":"__user__","positive":"sitting","x":0.8,"y":0.5},{"id":"stranger","positive":"red hair"}]}</nai_image>');
        const request = buildNaiRequest(state, 'c1', parsed.scene!, '', () => 1, parsed.details);
        const captions = request.parameters.v4_prompt.caption.char_captions;
        expect(captions).toHaveLength(2);
        expect(captions[0]).toEqual({ char_caption: '1boy, black hair, standing', centers: [{ x: 0.2, y: 0.5 }] });
        expect(captions[1].char_caption).toBe('1girl, pink hair, sitting');
        expect(JSON.stringify(request)).not.toContain('red hair');
    });
    it('精确参考的 Fidelity 使用官方的逆向字段；不会混入 Vibe 字段', () => {
        const request = buildNaiRequest(defaultNaiState(), '', 'garden');
        request.parameters.reference_image_multiple = ['old-vibe'];
        const reference = { id: 'r1', name: 'reference', imageToken: 'blobref:test', enabled: true, kind: 'character&style' as const, strength: 0.7, fidelity: 0.8, informationExtracted: 1 };
        const result = applyPreparedNaiReferences(request, 'precise', [reference], ['base64-image']);
        expect(result.parameters.director_reference_images).toEqual(['base64-image']);
        expect(result.parameters.director_reference_secondary_strength_values[0]).toBeCloseTo(0.2);
        expect(result.parameters.director_reference_descriptions[0].caption.base_caption).toBe('character&style');
        expect(result.parameters.reference_image_multiple).toBeUndefined();
        expect(preciseCanvasSize(500, 1000)).toEqual([1024, 1536]);
        expect(preciseCanvasSize(1000, 1000)).toEqual([1472, 1472]);
        expect(preciseCanvasSize(1000, 500)).toEqual([1536, 1024]);
    });
    it('参考设置按角色隔离，不把另一个角色的参考图带入', () => {
        const state = defaultNaiState(); state.characters.c1 = { ...emptyNaiCharacter(), referenceMode: 'precise', references: [] };
        expect(selectedNaiReferences(state, 'c2')).toEqual({ mode: 'none', references: [] });
        expect(selectedNaiReferences(state, 'c1').mode).toBe('precise');
    });
    it('保留 HTTP 500 的诊断说明和请求编号，隐藏 Key', async () => {
        const response = new Response(JSON.stringify({ message: 'Unknown model; token pst-secret' }), { status: 500, headers: { 'x-correlation-id': 'AB1234' } });
        const error = await readNaiApiError(response, 'pst-secret');
        expect(error.message).toContain('HTTP 500'); expect(error.message).toContain('Unknown model');
        expect(error.message).toContain('AB1234'); expect(error.message).not.toContain('pst-secret');
    });
    it('第三方世界书的 imathink 内容不触发生图', () => {
        expect(extractNaiScene('<imathink><nai_image>{"scene":"thought"}</nai_image></imathink>').scene).toBeNull();
    });
});

it('food photos never inherit character appearance', () => {
 const state = defaultNaiState(); state.characters.c1 = { positive:'blue hair',negative:'red hair',presetId:'',auto:true };
 const request = buildNaiRequest(state,'c1','ramen bowl','',()=>123,{photoType:'food',characters:[{id:'c1',positive:'smiling'}]});
 expect(JSON.stringify(request)).not.toContain('blue hair');
 expect(request.parameters.v4_prompt.caption.char_captions).toEqual([]);
});

it('portable library omits both API credentials and preserves local prompt connection on import', () => {
 const state = defaultNaiState(); state.connection.apiKey='secret-nai'; state.promptApi={enabled:true,baseUrl:'https://test/v1',apiKey:'secret-llm',model:'m'};
 const exported=exportNaiLibrary(state); expect(exported).not.toContain('secret-');
 expect(importNaiLibrary(exported,state).promptApi).toEqual(state.promptApi);
});
