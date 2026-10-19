import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.0-meta2';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.0 · Meta 语气与岁时笺入口';
export const MI_RELEASE_ITEMS=[
 ['Meta 调整','保留角色本人身份，只偶尔流露跨次元感知；避免代码式自我否定和长篇独白。'],
 ['岁时笺入口','时光契约顶部三个标签独立成行；心愿单页新增直达入口。'],
 ['岁时笺','统一记一份安排，所有角色在聊天中独立感知、自然关心；仅作为上下文资料，不启动主动消息或定时提醒。版本 km1.0。'],
] as const;
