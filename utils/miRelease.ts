import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.0-date2';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.0 · 见面画面设置';
export const MI_RELEASE_ITEMS=[
 ['画师组切换','画面设置可选择资料库中已保存的画师组，仅影响本次画面。'],
 ['手写提示词','支持中文补充整理或完整英文提示词，设置内可直接生成。'],
 ['版本保持 km1.0','沿用现有 NAI／GPT 服务与角色外貌。'],
] as const;
