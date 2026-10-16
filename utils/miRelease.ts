import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.0-video1';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.0 · 视频镜头生图';
export const MI_RELEASE_ITEMS=[
 ['通话里更新画面','视频通话新增更新画面与镜头设置，生成期间保留旧图，成功后替换。'],
 ['可选低频自动','每通默认关闭；至少 3 个新回复加时间间隔，有画面变化才尝试，每通最多 5 次。'],
 ['沿用现有生图配置','支持 NAI／GPT 和全局／独立提示词 API，可直接填写英文提示词；成功画面归入当前角色相册。'],
 ['原有形象保留','只替换本通镜头，可恢复原画面，不修改陪伴桌面；版本号保持 km1.0。'],
] as const;
