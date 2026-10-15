import React, { useRef, useState } from 'react';
import Modal from '../os/Modal';

export default function FakeVoiceComposer({ onClose, onSend }: {
    onClose: () => void;
    onSend: (text: string) => Promise<boolean>;
}) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const busy = useRef(false);
    const submit = async () => {
        if (busy.current || !text.trim()) return;
        busy.current = true;
        setSending(true);
        setError('');
        try {
            if (await onSend(text.trim())) onClose();
            else setError('未能发送，请稍后重试。');
        } catch {
            setError('发送失败，文字已保留，请重试。');
        } finally {
            busy.current = false;
            setSending(false);
        }
    };
    return <Modal isOpen title="发送语音" onClose={() => { if (!busy.current) onClose(); }} footer={<>
        <button type="button" disabled={sending} onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100">取消</button>
        <button type="button" disabled={sending || !text.trim()} onClick={() => void submit()} className="flex-1 py-3 rounded-2xl bg-primary text-white disabled:opacity-40">{sending ? '发送中…' : '发送语音条'}</button>
    </>}>
        <p className="mb-3 text-xs text-slate-500">输入语音内容，发送后显示为语音条，点击可转文字。角色可以读取内容。</p>
        <label className="sr-only" htmlFor="fake-voice-text">语音内容</label>
        <textarea id="fake-voice-text" autoFocus value={text} disabled={sending} onChange={event => setText(event.target.value)} rows={5}
            placeholder="想对 TA 说些什么？" className="w-full rounded-2xl border border-slate-200 p-3 text-sm resize-none" />
        {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
    </Modal>;
}
