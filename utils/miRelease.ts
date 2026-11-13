import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.21';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+MI_RELEASE_ID+'_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.21 · 解梦馆更新';
export const MI_RELEASE_ITEMS=[
 ['解梦 API 兼容','兼容 OpenAI-compatible 与 Gemini 原生响应格式，修复部分模型 401 和响应解析问题。'],
 ['角色解梦','解梦馆可以选择角色，以角色的人设、语气和世界观来解读梦境。'],
 ['解梦提示词优化','按梦中事件、情绪、意象和文化联想整理，保留自然的聊天感。'],
] as const;
