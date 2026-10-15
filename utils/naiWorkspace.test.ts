// @vitest-environment jsdom
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultNaiState } from './nai';
import NaiWorkspace from '../components/nai/NaiWorkspace';
import { loadNaiState, saveNaiState } from './naiService';

vi.mock('../context/OSContext', () => ({ useOS: () => ({ characters: [{ id: 'c1', name: '角色甲' }, { id: 'c2', name: '角色乙' }], addToast: vi.fn() }) }));
vi.mock('../components/os/TokenImg', () => ({ default: () => null }));
vi.mock('./shareExport', () => ({ shareOrDownloadBlob: vi.fn() }));
vi.mock('./naiService', () => ({ loadNaiState: vi.fn(), saveNaiState: vi.fn(), checkNaiConnection: vi.fn(), checkNaiSchema: vi.fn(), generateNaiImages: vi.fn(), saveNaiImageToAlbum: vi.fn() }));
let host: HTMLDivElement, root: Root;
beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    vi.mocked(loadNaiState).mockResolvedValue(defaultNaiState());
    vi.mocked(saveNaiState).mockResolvedValue(undefined);
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.clearAllMocks(); });
function button(text: string) { return Array.from(host.querySelectorAll('button')).find(el => el.textContent === text)!; }
function field(label: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
    return Array.from(host.querySelectorAll('label')).find(el => el.textContent?.startsWith(label))!.querySelector('input, textarea, select')! as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
}
function write(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
    act(() => {
        const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value);
        element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
}
describe('NAI 设置面板', () => {
    it('模型、采样器、噪声使用下拉，Steps 和 CFG 使用滑块', async () => {
        await act(async () => root.render(React.createElement(NaiWorkspace, { onClose: vi.fn() })));
        expect(field('模型').tagName).toBe('SELECT');
        expect(field('采样器').tagName).toBe('SELECT'); expect(field('噪声调度').tagName).toBe('SELECT');
        expect(host.querySelector('[aria-label="步数 Steps 滑块"]')).not.toBeNull();
        expect(host.querySelector('[aria-label="CFG 强度 滑块"]')).not.toBeNull();
        write(field('采样器'), 'k_dpmpp_2m_sde');
        await act(async () => button('保存设置').click());
        expect(vi.mocked(saveNaiState).mock.calls[0][0].parameters.sampler).toBe('k_dpmpp_2m_sde');
    });
    it('保存独立角色档案，角色切换不串提示词，自动生图默认关闭', async () => {
        await act(async () => root.render(React.createElement(NaiWorkspace, { initialTab: 'character', onClose: vi.fn() })));
        expect((field('允许角色') as HTMLInputElement).checked).toBe(false);
        write(field('角色固定正面'), '1boy, black hair');
        write(field('归属角色'), 'c2');
        expect(field('角色固定正面').value).toBe('');
        write(field('角色固定正面'), '1girl, pink hair');
        await act(async () => button('保存设置').click());
        const saved = vi.mocked(saveNaiState).mock.calls[0][0];
        expect(saved.characters.c1.positive).toBe('1boy, black hair');
        expect(saved.characters.c2.positive).toBe('1girl, pink hair');
    });
    it('保存多套分类正负面组合', async () => {
        await act(async () => root.render(React.createElement(NaiWorkspace, { initialTab: 'presets', onClose: vi.fn() })));
        write(field('组合名称'), '水彩A'); write(field('分类'), '水彩'); write(field('正面提示词'), '1.3::artist:a::'); write(field('负面提示词'), '[text]');
        act(() => button('加入资料库').click());
        act(() => button('新建组合').click());
        write(field('组合名称'), '厚涂B'); write(field('分类'), '厚涂'); write(field('正面提示词'), 'oil painting');
        act(() => button('加入资料库').click());
        await act(async () => button('保存设置').click());
        const saved = vi.mocked(saveNaiState).mock.calls[0][0];
        expect(saved.presets.map(p => p.category)).toEqual(['水彩', '厚涂']);
        expect(saved.presets[0].positive).toBe('1.3::artist:a::');
        expect(saved.presets[0].negative).toBe('[text]');
    });
    it('角色绑定的聊天面板不允许误选其他归属角色', async () => {
        await act(async () => root.render(React.createElement(NaiWorkspace, { characterId: 'c2', onClose: vi.fn() })));
        expect((field('归属角色') as HTMLSelectElement).disabled).toBe(true);
        expect(field('归属角色').value).toBe('c2');
    });
});
