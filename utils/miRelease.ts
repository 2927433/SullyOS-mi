import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.0-date1';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.0 · 见面文生图';
export const MI_RELEASE_ITEMS=[
 ['线下见面新增文生图','见面菜单打开“文生图替代立绘”，可手动生成或低频自动更新。'],
 ['只影响当前见面','保留原立绘与背景，成功后替换显示，可恢复；离开或换角色取消等待。'],
 ['复用现有配置','沿用 NAI／GPT、角色外貌及提示词 API，按线下场景构图，不画视频通话界面。'],
 ['版本与账本','版本保持 km1.0；记账改造本次仅提供方案，未修改存钱罐。'],
] as const;
