import React,{useRef,useState} from 'react';
import {useOS} from '../../context/OSContext';
import type {Song} from '../../context/MusicContext';
import {AppID} from '../../types';
import {shareMusicToCharacter} from '../../utils/musicShare';
import {useLocalBackHandler} from '../../hooks/useLocalBackHandler';
import './musicShare.css';
export default function MusicShareDialog({song,onClose}:{song:Song;onClose:()=>void}){
 const {characters,activeCharacterId,setActiveCharacterId,openApp}=useOS();
 const [charId,setCharId]=useState(characters.some(c=>c.id===activeCharacterId)?activeCharacterId:''),[note,setNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),delivery=useRef(crypto.randomUUID());
 useLocalBackHandler(()=>{if(!lock.current)onClose();return true;},60);
 const send=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await shareMusicToCharacter(song,charId,note,delivery.current);setActiveCharacterId(charId);onClose();openApp(AppID.Chat);}catch(e){setError(e instanceof Error?e.message:'音乐分享失败，请重试');}finally{lock.current=false;setBusy(false);}};
 return <div className="music-share-overlay"><section role="dialog" aria-modal="true" aria-label="分享音乐给角色" className="music-share-sheet"><header><h2>分享给角色</h2><button aria-label="关闭音乐分享" disabled={busy} onClick={onClose}>×</button></header><div className="music-share-song"><span aria-hidden>♫</span><div><strong>{song.name}</strong><p>{song.artists}</p>{song.album&&<small>{song.album}</small>}</div></div><label>分享给谁<select disabled={busy} value={charId} onChange={e=>{setCharId(e.target.value);delivery.current=crypto.randomUUID();}}><option value="">选择角色</option>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>想和 ta 聊什么<textarea disabled={busy} rows={3} maxLength={1000} value={note} onChange={e=>{setNote(e.target.value);delivery.current=crypto.randomUUID();}} placeholder="听到这首想起了你，想聊聊它的旋律，或写下你喜欢的一句。"/></label><p className="music-share-note">发送歌名、歌手、专辑和留言，方便讨论；不会让文本模型直接听见音频。分享不调用 API，也不会自动请求角色回复。</p>{error&&<p role="alert" className="music-share-error">{error}</p>}<button className="music-share-send" disabled={busy||!charId} onClick={()=>void send()}>{busy?'正在发送…':'发送到聊天'}</button></section></div>;
}
