import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.17';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+MI_RELEASE_ID+'_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.17 · 星梦集粉樱塔罗馆';
export const MI_RELEASE_ITEMS=[
 ['粉樱芭蕾界面','星梦集改为低饱和裸粉、奶白米底色，加入蕾丝、珍珠、樱花和芭蕾装饰；新增猫咪透明立绘。'],
 ['塔罗 API 设置','API 设置放在星梦集页头，可直接选择并应用聊天设置中已有的 API 预设，不需要手动填写模型。'],
 ['三张牌阵','可抽取三张牌、逐张翻牌、选择角色解读，并在同一组三张牌上继续追问。'],
 ['解牌收藏','本次解读可选择收藏，历史收藏支持打开、查看和删除。'],
 ['分享给角色','可将本次牌面和解读内容写入指定角色聊天，继续讨论。'],
] as const;
