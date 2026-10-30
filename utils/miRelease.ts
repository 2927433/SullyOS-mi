import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.12';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+MI_RELEASE_ID+'_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.12 · 表情包识图';
export const MI_RELEASE_ITEMS=[
 ['表情包识图','独立识图 API 开启后，新发送的表情包会生成画面、文字和 meme 含义描述。'],
 ['上下文记忆','描述写回表情消息，后续聊天、重 roll 和刷新页面都可复用，不重复识图。'],
 ['配置位置','设置 → 识图 API；关闭时保留原有表情包发送逻辑。'],
] as const;
