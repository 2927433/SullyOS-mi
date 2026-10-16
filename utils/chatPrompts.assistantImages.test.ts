import { describe, it, expect } from 'vitest';
import { ChatPrompts } from './chatPrompts';

describe('outgoing image history compatibility', () => {
    const char = { id: 'c1', name: '角色' } as any;
    const user = { name: '我' } as any;
    const build = (messages: any[]) => ChatPrompts.buildMessageHistory(messages, 20, char, user, []).apiMessages;
    it('keeps outgoing NAI/GPT/legacy pictures as assistant text without leaking image data', () => {
        const messages = ['blobref:photo', 'data:image/png;base64,AAAA', 'https://example.com/photo.png'].map((content, i) => ({
            id: i + 1, charId: 'c1', role: 'assistant', type: 'image', content,
            timestamp: Date.now() + i, metadata: i === 0 ? { nai: { provider: 'nai' } } : i === 1 ? { nai: { provider: 'gpt' } } : {},
        }));
        const history = build(messages);
        expect(history).toHaveLength(3);
        for (const entry of history) {
            expect(entry.role).toBe('assistant');
            expect(typeof entry.content).toBe('string');
            expect(entry.content).toContain('你向用户发送了一张图片');
            expect(entry.content).not.toMatch(/blobref:|data:image|https:|User sent/);
        }
        expect(messages[0].content).toBe('blobref:photo');
    });
    it('preserves an existing picture description and user vision input', () => {
        const history = build([
            { id: 1, charId: 'c1', role: 'assistant', type: 'image', content: 'blobref:photo', timestamp: Date.now(), metadata: { visionDescription: '桌上的一杯水' } },
            { id: 2, charId: 'c1', role: 'user', type: 'image', content: 'data:image/png;base64,AAAA', timestamp: Date.now() + 1 },
        ]);
        expect(history[0].content).toContain('桌上的一杯水');
        expect(history[1].role).toBe('user');
        expect(history[1].content).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'image_url' })]));
    });
});
