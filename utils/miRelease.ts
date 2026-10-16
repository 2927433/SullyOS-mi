import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='mi-v20';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='日记有自己的生活，睡眠链接正确读取';
export const MI_RELEASE_ITEMS=[
 ['角色自己的日记','优先从当天日程和角色自身生活取材，聊天不是文章大纲，也不必刻意排除用户。'],
 ['写作规范可编辑','日记 API 设置新增写作规范，按角色保存，可以恢复默认。'],
 ['睡眠时区链接修复','正确保留快捷指令链接中的时区加号。更新后重新粘贴原链接并确认，无需重做快捷指令。'],
 ['原功能保留','原文译文互切、自动写作检查、历史日记、购物车与聊天美化继续保留。'],
] as const;
