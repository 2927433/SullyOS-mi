import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.0-agenda3';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.0 · 岁时笺独立同步';
export const MI_RELEASE_ITEMS=[
 ['开场白修复','ST 开场白不导入、不另存；旧版导入器添加的开场白分区会清理。'],
 ['多个监督人','一项任务可选多位角色，各自读取任务、独立评价，不提供其他监督人名单。'],
 ['岁时笺','统一记一份安排，所有角色在聊天中独立感知、自然关心；仅作为上下文资料，不启动主动消息或定时提醒。版本 km1.0。'],
] as const;
