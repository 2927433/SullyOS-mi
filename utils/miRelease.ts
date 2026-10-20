import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.11';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+MI_RELEASE_ID+'_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.11 · 拾集互动调整';
export const MI_RELEASE_ITEMS=[
 ['拾集页面','去掉商品页、结算和聊天订单卡中打断体验的说明。'],
 ['角色回应','订单作为日常点餐或送礼互动传给角色，保留收件人、餐食和留言；不借订单解释应用实现。'],
 ['旧卡片兼容','已有订单卡在生成上下文时也使用新格式，代付和送达状态仍准确区分。'],
] as const;
