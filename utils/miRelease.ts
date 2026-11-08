import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.19';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+MI_RELEASE_ID+'_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.19 · 星梦集星测更新';
export const MI_RELEASE_ITEMS=[
 ['移除登录图片','糯米机改用无图片的经典开场，避免启动时加载不必要的图片资源。'],
 ['固定生日星测','设置生日后自动固定星座，每天可以单独抽取今日运势。'],
 ['角色合盘','可手动设置角色生日，也可让星测 API 根据角色设定与记忆进行判断。'],
 ['合盘分享与历史','合盘内容可以写入角色聊天，星测历史最多保留三次并支持删除、查看。'],
] as const;
