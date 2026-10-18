import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.0-st1';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.0 · ST 角色卡导入';
export const MI_RELEASE_ITEMS=[
 ['ST 角色卡','神经链接原导入按钮支持 ST 的原始 PNG 卡和 V1／V2／V3 JSON。'],
 ['世界书同步','内嵌世界书按角色名与书名分组，并挂载到新角色；不会覆盖已有条目。'],
 ['导入边界','截图不能还原人设；ST 专用脚本、正则与界面扩展不运行。版本保持 km1.0。'],
] as const;
