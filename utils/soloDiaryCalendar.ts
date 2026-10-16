import type {SoloDiaryEntry} from './soloDiary';
/** Calendar keys are character-local dates, never converted through the device timezone. */
export function diaryMonthGrid(month:string):(string|null)[]{
 const first=new Date(month+'-01T12:00:00Z');
 const days=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 const cells:(string|null)[]=Array(first.getUTCDay()).fill(null);
 for(let day=1;day<=days;day++)cells.push(month+'-'+String(day).padStart(2,'0'));
 while(cells.length%7)cells.push(null);return cells;
}
export function moveDiaryMonth(month:string,delta:number){const date=new Date(month+'-01T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+delta);return date.toISOString().slice(0,7);}
export function filterSoloDiaries(entries:SoloDiaryEntry[],query:string,month?:string){
 const needle=query.trim().toLocaleLowerCase();
 return entries.filter(e=>(!month||e.date.startsWith(month))&&(!needle||(e.date+' '+(e.text||'')+' '+(e.translation||'')+' '+(e.error||'')).toLocaleLowerCase().includes(needle))).sort((a,b)=>b.date.localeCompare(a.date));
}
