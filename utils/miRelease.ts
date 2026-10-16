import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='mi-v21';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='日记双语显示修复';
export const MI_RELEASE_ITEMS=[
 ['双语正确互切','兼容日记 JSON 中未转义的正文引号，原文和译文分别显示。'],
 ['已有日记本地恢复','打开日记时自动整理可恢复的已存 JSON 日记，保留原始返回备份，无需重新生成或补译。'],
] as const;
