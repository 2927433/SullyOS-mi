
import React, { useState, useEffect } from 'react';
import Modal from '../os/Modal';
import { DEFAULT_PROACTIVE_REST } from '../../utils/proactiveRest';
import { CharacterProfile } from '../../types';

interface ProactiveSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    char: CharacterProfile;
    isProactiveActive: boolean;
    onSave: (config: NonNullable<CharacterProfile['proactiveConfig']>) => void;
    onStop: () => void;
}

const INTERVAL_OPTIONS = [
    { label: '30 分钟', value: 30 },
    { label: '1 小时', value: 60 },
    { label: '2 小时', value: 120 },
    { label: '4 小时', value: 240 },
    { label: '8 小时', value: 480 },
    { label: '12 小时', value: 720 },
    { label: '24 小时', value: 1440 },
];

const ProactiveSettingsModal: React.FC<ProactiveSettingsModalProps> = ({
    isOpen, onClose, char, isProactiveActive, onSave, onStop
}) => {
    const saved = char.proactiveConfig;
    const [enabled, setEnabled] = useState(saved?.enabled ?? false);
    const [interval, setInterval_] = useState(saved?.intervalMinutes ?? 60);

    const [rest, setRest] = useState({...DEFAULT_PROACTIVE_REST, ...saved});

    // Reset form when modal opens with new char data
    useEffect(() => {
        if (isOpen) {
            const s = char.proactiveConfig;
            setRest({...DEFAULT_PROACTIVE_REST, ...s});
            setEnabled(s?.enabled ?? false);
            setInterval_(s?.intervalMinutes ?? 60);
        }
    }, [isOpen, char.id]);

    const handleSave = () => {
        onSave({
            quietEnabled: rest.quietEnabled,
            quietStart: rest.quietStart,
            quietEnd: rest.quietEnd,
            respectSleep: rest.respectSleep,
            enabled,
            intervalMinutes: interval,
        });
        onClose();
    };

    const handleStop = () => {
        onStop();
        setEnabled(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} title="主动消息" onClose={onClose} footer={
            <>
                <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-2xl active:scale-95 transition-transform">
                    取消
                </button>
                {isProactiveActive ? (
                    <button onClick={handleStop} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg">
                        停止
                    </button>
                ) : null}
                <button onClick={handleSave} className="flex-1 py-3 bg-violet-500 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg">
                    {enabled ? '启动' : '保存'}
                </button>
            </>
        }>
            <div className="space-y-5">
                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed">
                    开启后，{char.name} 会按间隔检查一次是否适合发消息。启动不会立即发信；休息或睡眠时跳过，不补发。
                </p>

                {/* Enable Toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">启用主动消息</span>
                    <button
                        onClick={() => setEnabled(!enabled)}
                        className={`w-12 h-7 rounded-full transition-colors relative ${enabled ? 'bg-violet-500' : 'bg-slate-200'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Status indicator */}
                {isProactiveActive && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-xl border border-violet-100">
                        <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
                        <span className="text-xs text-violet-600 font-medium">主动消息进行中</span>
                    </div>
                )}

                {/* Interval Selection */}
                {enabled && (
                    <>
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-2">检查间隔</label>
                            <div className="grid grid-cols-3 gap-2">
                                {INTERVAL_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setInterval_(opt.value)}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${interval === opt.value
                                            ? 'bg-violet-500 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 text-xs text-slate-600">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={rest.quietEnabled} onChange={e=>setRest({...rest,quietEnabled:e.target.checked})}/>启用休息时段（按角色时区）</label>
                            {rest.quietEnabled && <div className="grid grid-cols-2 gap-3">
                                <label className="min-w-0">开始<input aria-label="休息开始" type="time" className="block w-full min-w-0 rounded-xl bg-slate-100 p-2" value={rest.quietStart} onChange={e=>setRest({...rest,quietStart:e.target.value})}/></label>
                                <label className="min-w-0">结束<input aria-label="休息结束" type="time" className="block w-full min-w-0 rounded-xl bg-slate-100 p-2" value={rest.quietEnd} onChange={e=>setRest({...rest,quietEnd:e.target.value})}/></label>
                            </div>}
                            <label className="flex items-start gap-2"><input type="checkbox" checked={rest.respectSleep} onChange={e=>setRest({...rest,respectSleep:e.target.checked})}/>日程正在睡觉或最近明确说去睡觉时暂停</label>
                            <p className="text-slate-400 leading-relaxed">默认 23:00—08:00；相同起止时间不限制。聊天睡眠判断只读最近一条文字回复，最多 8 小时，不是完整语义识别。你仍可正常手动聊天。</p>
                        </div>
                        <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
                            主动消息使用当前聊天主 API，调用费用也由主 API 承担。
                        </p>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default React.memo(ProactiveSettingsModal);
