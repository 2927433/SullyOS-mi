import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='mi-v19';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='日记双语互切，自动写作可查状态';
export const MI_RELEASE_ITEMS=[
 ['一篇日记，两种语言','新日记一次生成原文与译文，阅读时点击切换；默认中文译文，可在日记设置选择其它语言。'],
 ['旧日记保留原文','已有日记可主动补译并缓存，不会重写原文；补译会调用日记 API。'],
 ['自动写作状态可见','显示最近检查结果，并提供立即检查入口。未到期不会提前生成，失败不自动重复计费。'],
 ['自定义壁纸已兼容','玻璃预设不再强制覆盖聊天壁纸。已应用旧版的聊天也会兼容，无需删除样式或重新设置。'],
 ['购物车可以打开了','拾集底部点击购物车，查看好物与外卖，调整数量、移除商品或清空当前分类。'],
 ['订单可以请角色代付','结算时选择代付角色，转发到 ta 的私聊。请求与付款分开，分享不会自动扣款。'],
 ['更新有迹可查','每次新构建首次解锁显示此公告。设置底部可随时查看当前版本、构建时间和更新说明。'],
 ['最近加入的功能','角色独立日记支持月历、历史搜索和阅读页；清透玻璃是外观中的可选聊天预设。'],
] as const;
