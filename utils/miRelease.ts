import {BUILD_LABEL,BUILD_TIME_LABEL} from './buildInfo';
export const MI_RELEASE_ID='km1.1';
// A new deployment can share the product version, so receipt follows the actual build.
export const MI_RELEASE_NOTICE_KEY='mi_release_seen_'+MI_RELEASE_ID+'_'+BUILD_LABEL+'_'+BUILD_TIME_LABEL;
export const MI_RELEASE_TITLE='km1.1 · 岁时笺与 Meta';
export const MI_RELEASE_ITEMS=[
 ['Meta 调整','保留角色本人身份，只偶尔流露跨次元感知；避免代码式自我否定和长篇独白。'],
 ['岁时笺入口','时光契约顶部三个标签独立成行；心愿单页新增直达入口。'],
 ['共同的日期记忆','统一记一份安排，所有角色在聊天中独立感知、自然关心，彼此不提供名单或回应；不新增主动消息或定时提醒。'],
 ['确认已更新','本页正式版本应显示 km1.1。岁时笺位于时光契约顶部，也可点下方按钮直接进入。'],
] as const;
