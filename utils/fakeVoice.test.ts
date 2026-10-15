// @vitest-environment jsdom
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FakeVoiceComposer from '../components/chat/FakeVoiceComposer';
import UserFakeVoiceBar from '../components/chat/UserFakeVoiceBar';
import { ChatPrompts } from './chatPrompts';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const write = (text: string) => act(() => {
    const input = host.querySelector('textarea')!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
});
const sendButton = () => Array.from(host.querySelectorAll('button')).find(b => /发送语音条|发送中/.test(b.textContent || ''))!;

describe('文字模拟语音', () => {
    it('保存后的假语音在模型上下文中保留内容和语音标记', () => {
        const message = JSON.parse(JSON.stringify({ id: 1, charId: 'c1', role: 'user', type: 'text', content: '今天也很想你', timestamp: 1, metadata: { fakeVoice: true } }));
        const { apiMessages } = ChatPrompts.buildMessageHistory([message], 10, { id: 'c1', name: '角色' } as any, { name: '我' } as any, []);
        expect(apiMessages[0].content).toContain('[聊天·语音转写]');
        expect(apiMessages[0].content).toContain('今天也很想你');
    });
    it('隐藏文字，点击展开，原样显示 HTML 文本，且不会创建音频', () => {
        const text = '<img src=x onerror=alert(1)> 想你了';
        act(() => root.render(React.createElement(UserFakeVoiceBar, { text })));
        const button = host.querySelector('button')!;
        expect(host.textContent).not.toContain(text);
        act(() => button.click());
        expect(host.textContent).toContain(text);
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(host.querySelector('img, audio')).toBeNull();
        act(() => button.click());
        expect(host.textContent).not.toContain(text);
    });
    it('拒绝空白并防止连续点击重复发送，成功后关闭', async () => {
        let finish!: (sent: boolean) => void;
        const onSend = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
        const onClose = vi.fn();
        act(() => root.render(React.createElement(FakeVoiceComposer, { onSend, onClose })));
        write('  \n ');
        expect(sendButton().disabled).toBe(true);
        write('  晚安呀  ');
        act(() => { sendButton().click(); sendButton().click(); });
        expect(onSend).toHaveBeenCalledTimes(1);
        expect(onSend).toHaveBeenCalledWith('晚安呀');
        await act(async () => { finish(true); });
        expect(onClose).toHaveBeenCalledOnce();
    });
    it('失败时保留文字并允许重试', async () => {
        const onSend = vi.fn().mockRejectedValue(new Error('storage'));
        const onClose = vi.fn();
        act(() => root.render(React.createElement(FakeVoiceComposer, { onSend, onClose })));
        write('这段话不要丢');
        await act(async () => { sendButton().click(); });
        expect(host.querySelector('textarea')!.value).toBe('这段话不要丢');
        expect(host.querySelector('[role="alert"]')!.textContent).toContain('文字已保留');
        expect(onClose).not.toHaveBeenCalled();
        expect(sendButton().disabled).toBe(false);
    });
});
