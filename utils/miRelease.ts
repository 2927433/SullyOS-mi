import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.18';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+MI_RELEASE_ID+'_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.18 · 星梦集粉樱塔罗馆';
export const MI_RELEASE_ITEMS=[
 ['移动端布局','缩小页头、卡片和按钮间距，小屏设备可完整浏览牌堆和解读区。'],
 ['塔罗 API 设置','API 设置放在星梦集页头，可直接选择并应用聊天设置中已有的 API 预设。'],
 ['交互式选牌','恢复多张牌堆，先洗牌，再由你亲自选择过去、现在、未来三张牌。'],
 ['解牌收藏与分享','本次解读可选择收藏，历史收藏支持打开、查看和删除，也可写入角色聊天。'],
 ['资源路径修复','修正 GitHub Pages 子路径下猫咪与塔罗素材加载失败的问题。'],
] as const;
