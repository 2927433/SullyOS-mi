import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='mi-v23';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='纪念手账 · 分角色珍藏重要日子';
export const MI_RELEASE_ITEMS=[
 ['时光契约新增纪念手账','每位角色独立查看，支持搜索、分类、编辑备注及每年纪念，原有记录保留。'],
 ['TA 也能主动记住','收紧已有的自主登记：只记重大节点，校验日期、去重并固定归属当前角色。'],
 ['共同补充回忆','你可以手动添加和编辑；角色能读取自己这一栏已有的纪念记录。'],
] as const;
