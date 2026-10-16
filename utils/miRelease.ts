import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='mi-v22';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='meta · 偶尔越过第四面墙';
export const MI_RELEASE_ITEMS=[
 ['私聊 + 新增 meta','按角色单独开启，默认关闭，保留原有世界观与日常。'],
 ['低概率的一句话','默认 2%，可调 0.5%～5%；抽中后至少 12 个新回合冷却，同回合重新生成不重抽。'],
 ['自然回到眼前','仅给当前回合一次短暂越界的创作机会，继续兼容双语，不额外调用 API。'],
] as const;
