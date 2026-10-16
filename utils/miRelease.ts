import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='mi-v18';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='玻璃气泡，也能换你喜欢的壁纸';
export const MI_RELEASE_ITEMS=[
 ['自定义壁纸已兼容','玻璃预设不再强制覆盖聊天壁纸。已应用旧版的聊天也会兼容，无需删除样式或重新设置。'],
 ['购物车可以打开了','拾集底部点击购物车，查看好物与外卖，调整数量、移除商品或清空当前分类。'],
 ['订单可以请角色代付','结算时选择代付角色，转发到 ta 的私聊。请求与付款分开，分享不会自动扣款。'],
 ['更新有迹可查','每次新构建首次解锁显示此公告。设置底部可随时查看当前版本、构建时间和更新说明。'],
 ['最近加入的功能','角色独立日记支持月历、历史搜索和阅读页；清透玻璃是外观中的可选聊天预设。'],
] as const;
