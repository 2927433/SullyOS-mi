import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentNaiTurn, resolveNaiPromptApi, draftNaiPrompt } from './naiPrompt';
import { defaultNaiState, getNaiSceneGuide, naiSceneInstruction, normalizeNaiState } from './nai';
import { ContextBuilder } from './context';
vi.mock('./context', () => ({ ContextBuilder: { buildCharacterRequest: vi.fn(async (_context, messages) => [{ role: 'system', content: 'bound-character-worldbook' }, ...messages]) } }));
const api = { baseUrl: 'https://dialogue.example/v1', apiKey: 'dialogue-placeholder', model: 'dialogue-model' } as any;
afterEach(() => { vi.restoreAllMocks(); vi.mocked(ContextBuilder.buildCharacterRequest).mockClear(); });
describe('NAI 提示词整理', () => {
    it('仅翻译当前输入，不注入角色历史世界书', async () => {
        const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ photoType: 'selfie', scene: 'garden, soft light', characters: [{ id: 'c1', positive: 'sitting' }] }) } }] })));
        const result = await draftNaiPrompt('花园里坐着', api, { id: 'c1', name: '角色甲' } as any, { name: '用户' } as any, '优先中景');
        expect(ContextBuilder.buildCharacterRequest).not.toHaveBeenCalled();
        expect(fetcher.mock.calls[0][0]).toBe('https://dialogue.example/v1/chat/completions');
        expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).messages).toHaveLength(2);
        expect(result.scene).toBe('garden, soft light'); expect(result.details.characters?.[0].positive).toBe('sitting');
    });
    it('没有角色时仍可整理，错误格式保留原输入而不进行生图', async () => {
        const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] })));
        await expect(draftNaiPrompt('花园', api, undefined, { name: '用户' } as any, '')).rejects.toThrow('没有发起生图');
        expect(fetcher).toHaveBeenCalledTimes(1); expect(ContextBuilder.buildCharacterRequest).not.toHaveBeenCalled();
    });
});

describe('当前照片上下文和接口隔离', () => {
 it('只保留最新用户回合，排除旧剧情和系统摘要', () => {
 const text = currentNaiTurn([{role:'user',content:'昨天在海边'}, {role:'assistant',content:'海边自拍'}, {role:'system',content:'旧摘要'}, {role:'user',content:'午餐吃什么'}, {role:'assistant',content:'正在吃拉面'}], '给你看看拉面');
 expect(text).not.toContain('海边'); expect(text).not.toContain('摘要'); expect(text).toContain('拉面');
 });
 it('独立接口配置不完整时拒绝静默使用全局 Key', () => {
 expect(() => resolveNaiPromptApi({promptApi:{enabled:true,baseUrl:'x',apiKey:'',model:'m'}} as any,api)).toThrow('未填完整');
 expect(resolveNaiPromptApi({} as any,api)).toBe(api);
 });
});

it('编辑的生图规范经保存规范化后用于角色指令与手动翻译', async () => {
 const state=normalizeNaiState({...defaultNaiState(),promptGuide:'自定义：只用近景，不使用默认镜头规则'});state.connection.apiKey='test';state.characters.c1={positive:'blue hair',negative:'',presetId:'',auto:true};
 expect(naiSceneInstruction(state,'c1')).toContain('自定义：只用近景');
 const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({photoType:'selfie',scene:'close-up',characters:[]})}}]})));
 await draftNaiPrompt('近景',api,undefined,{} as any,'',undefined,getNaiSceneGuide(state));
 expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).messages[0].content).toContain('自定义：只用近景');
});
