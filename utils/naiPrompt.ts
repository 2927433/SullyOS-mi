import type { APIConfig, CharacterProfile, UserProfile } from '../types';
import type { NaiState } from './nai';
export function resolveNaiPromptApi(state: NaiState, globalApi: APIConfig): APIConfig {
    if (!state.promptApi?.enabled) return globalApi;
    const api = state.promptApi;
    if (!api.baseUrl.trim() || !api.apiKey.trim() || !api.model.trim()) throw new Error('独立提示词 API 未填完整，请填写地址、Key 和模型，或关闭独立 API');
    return { baseUrl: api.baseUrl.trim(), apiKey: api.apiKey.trim(), model: api.model.trim() } as APIConfig;
}
export function currentNaiTurn(messages: Array<{ role: string; type?: string; content: string }>, reply = ''): string {
    const visible = messages.filter(m => ['user', 'assistant'].includes(m.role) && (!m.type || m.type === 'text'));
    let start = visible.length - 1;
    while (start >= 0 && visible[start].role !== 'user') start--;
    const turn = start >= 0 ? visible.slice(start).slice(-6) : [];
    return [...turn.map(m => m.role + ': ' + m.content.slice(0, 2000)), ...(reply ? ['最新角色回复（最高优先级）: ' + reply.slice(0, 4000)] : [])].join('\n');
}
import { safeResponseJson, extractContent } from './safeApi';
import { NAI_SCENE_GUIDE, parseNaiSceneDetails, type NaiSceneDetails } from './nai';

export async function draftNaiPrompt(input: string, api: APIConfig, char: CharacterProfile | undefined, user: UserProfile, extraRules: string, signal?: AbortSignal, guide = NAI_SCENE_GUIDE): Promise<{ scene: string; details: NaiSceneDetails }> {
    if (!api?.apiKey || !api.baseUrl || !api.model) throw new Error('整理提示词需要先配置小手机的提示词 API；也可以直接输入英文提示词生图');
    const instruction = `${guide}\n当前角色 ID：${char?.id || '未选择角色'}。用户 ID：__user__。${extraRules ? '\n用户额外规则：' + extraRules : ''}\n这次是用户手动请求整理提示词，必须只输出一份 JSON，不要发起生图。额外规则只调整画面，不能改变 scene/negative/characters 的 JSON 格式，不使用酒馆宏。只输出公开的画面描述，不输出分析或思考。`;
    const task = [{ role: 'system' as const, content: instruction }, { role: 'user' as const, content: input }];
    const messages = task; // Image translation uses no persona, worldbook, or long-term memory.
    const response = await fetch(`${api.baseUrl.replace(/\/+$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.apiKey}` }, body: JSON.stringify({ model: api.model, messages, stream: false, max_tokens: 2000, temperature: 0.3 }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error(`整理提示词的聊天 API 请求失败（HTTP ${response.status}），没有发起 NAI 生图`);
    const data = await safeResponseJson(response);
    const text = String(extractContent(data) || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let result: any;
    try { result = JSON.parse(text); } catch { throw new Error('聊天模型未返回有效提示词 JSON；原输入已保留，没有发起生图'); }
    if (typeof result?.scene !== 'string' || !result.scene.trim()) throw new Error('聊天模型没有提供画面提示词');
    const details = parseNaiSceneDetails(result);
    if (!details.photoType) throw new Error('提示词模型未返回照片类型 photoType；没有发起生图，请重试整理或直接填写提示词');
    return { scene: result.scene, details };
}
