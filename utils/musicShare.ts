import type {Song} from '../context/MusicContext';
import {DB} from './db';
export async function shareMusicToCharacter(song:Song,charId:string,note:string,deliveryId:string):Promise<number>{
 if(!charId || !(await DB.getAllCharacters()).some(c=>c.id===charId))throw new Error('请选择仍存在的角色');
 if(!song?.name?.trim() || !Number.isSafeInteger(song.id))throw new Error('歌曲资料不完整，请重新选择');
 const publicUrl=!song.local && song.id>0 ? 'https://music.163.com/#/song?id='+song.id : '';
 const details={songId:song.id,name:song.name.slice(0,200),artists:String(song.artists||'').slice(0,200),album:String(song.album||'').slice(0,200),albumPic:/^(https:|blob-ref:|asset:)/.test(song.albumPic || '')?song.albumPic:'',duration:song.duration,local:!!song.local};
 const comment=note.trim().slice(0,1000);
 const content=`[分享音乐] 《${details.name}》— ${details.artists || '未知歌手'}${details.album?'\n专辑：'+details.album:''}${comment?'\n我想聊：'+comment:''}${publicUrl?'\n'+publicUrl:''}`;
 return DB.saveMessageOnce('music_share_'+deliveryId,{charId,role:'user',type:'music_card',content,metadata:{intent:'share',song:details,note:comment,publicUrl}});
}
