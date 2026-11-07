import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.15';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+MI_RELEASE_ID+'_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.15 · 星梦集粉樱塔罗馆';
export const MI_RELEASE_ITEMS=[
 ['粉樱塔罗馆','改为低饱和裸粉与奶白米色的蕾丝珍珠界面；支持选择已保存的 API 预设。'],
 ['解牌收藏','本次解读可收藏、查看历史、删除，也可以分享给指定角色继续聊天。'],
 ['表情包识图','独立识图 API 开启后，新发送的表情包会生成画面、文字和 meme 含义描述。'],
 ['上下文记忆','描述写回表情消息，后续聊天、重 roll 和刷新页面都可复用，不重复识图。'],
 ['配置位置','设置 → 识图 API；关闭时保留原有表情包发送逻辑。'],
] as const;
