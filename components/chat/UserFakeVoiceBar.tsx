import React, { useState } from 'react';

/** Text-only voice bubble. Never requests a microphone or synthesizes audio. */
export default function UserFakeVoiceBar({ text }: { text: string }) {
    const [expanded, setExpanded] = useState(false);
    const seconds = Math.max(1, Math.min(60, Math.ceil(Array.from(text.trim()).length / 4)));
    return (
        <div className="relative z-10" data-fake-voice="true">
            <button type="button" aria-label="语音，点击展开或收起文字" aria-expanded={expanded}
                onClick={event => { event.stopPropagation(); setExpanded(value => !value); }}
                className="flex items-center gap-3 py-1 text-current" style={{ minWidth: Math.min(220, 100 + seconds * 2) }}>
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 10v4M10 7a8 8 0 0 1 0 10M14 4a12 12 0 0 1 0 16" />
                </svg>
                <span className="font-semibold">{seconds}″</span>
                <span className="ml-auto text-[10px] opacity-60">{expanded ? '收起文字' : '转文字'}</span>
            </button>
            {expanded && <div className="mt-2 border-t border-current/15 pt-2 text-sm whitespace-pre-wrap break-words select-text">{text}</div>}
        </div>
    );
}
