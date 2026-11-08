import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.20';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+MI_RELEASE_ID+'_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.20 · 星测视觉更新';
export const MI_RELEASE_ITEMS=[
 ['移除开场启动','打开糯米机后直接进入页面，不再播放开场动画。'],
 ['星测英文花体','星测改为简约、文艺的英文花体排版，星座名称统一使用英文。'],
 ['与星星的共鸣','星测主标题更新为“与星星的共鸣”，保留生日、运势、合盘分享与三次历史。'],
] as const;
