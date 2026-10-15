import type { CharacterProfile, Message, ScheduleSlot } from '../types';
import { getCurrentScheduleSlotIndex, getScheduleWallClock } from './scheduleTime';

type RestConfig = NonNullable<CharacterProfile['proactiveConfig']>;
export const DEFAULT_PROACTIVE_REST = { quietEnabled: true, quietStart: '23:00', quietEnd: '08:00', respectSleep: true };
const minutes = (text: string | undefined, fallback: string) => {
    const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(text || '') ? text! : fallback;
    const [h, m] = valid.split(':').map(Number);
    return h * 60 + m;
};

/** Only automatic 1.0 messages pass this gate. A manual conversation stays available. */
export function proactiveRestReason(char: CharacterProfile, messages: Message[], slots: ScheduleSlot[] = [], at = new Date()): string | null {
    const config: Partial<RestConfig> = char.proactiveConfig || {};
    const wall = getScheduleWallClock(char, at);
    const now = wall.getHours() * 60 + wall.getMinutes();
    const start = minutes(config.quietStart, DEFAULT_PROACTIVE_REST.quietStart);
    const end = minutes(config.quietEnd, DEFAULT_PROACTIVE_REST.quietEnd);
    if (config.quietEnabled !== false && start !== end && (start < end ? now >= start && now < end : now >= start || now < end)) return '角色休息时段';
    if (config.respectSleep === false) return null;
    const index = getCurrentScheduleSlotIndex(slots, char, at);
    const activity = index >= 0 ? slots[index].activity : '';
    if (/(睡觉|睡眠|入睡|熟睡|午睡|午休|就寝)/.test(activity) && !/(起床|醒来|睡醒|睡前|准备|结束)/.test(activity)) return '当前日程正在睡眠';
    // Read only the latest visible assistant reply, never the user's bedtime or an old summary.
    const last = [...messages].filter(m => m.role === 'assistant' && !m.metadata?.hidden && !m.metadata?.proactiveHint && m.type === 'text')
        .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!last || at.getTime() - last.timestamp < 0 || at.getTime() - last.timestamp > 8 * 60 * 60 * 1000) return null;
    const text = last.content || '';
    const sleeping = /(?:我|咱|俺|这就)(?:也|要|就|先|去|该|准备|现在|已经|得|打算|马上|回去|躺下|差不多|真的|\s){0,8}(?:睡(?:觉)?[了啦咯]|睡觉去|去睡觉|入睡|睡着了)|(?:我先睡|我去睡|我要睡|我得睡)|(?:陷入梦乡|呼吸逐渐平稳)/.test(text);
    const awake = /(?:我|已经|刚刚|刚|终于)(?:也|又|才|就|现在|已经|刚刚|刚|\s){0,8}(?:醒了|醒来|起床了|睡醒)|(?:不睡了|还没睡|睡不着|不想睡|还不睡)/.test(text);
    return sleeping && !awake ? '角色最近已明确表示去睡觉（最多暂停 8 小时）' : null;
}
