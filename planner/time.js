const DAY=86400000,OFFSET=9*3600000;
export function dateKey(ms){return new Date(ms+OFFSET).toISOString().slice(0,10)}
export function weekDates(ms,offset=0){
 const local=new Date(ms+OFFSET),day=(local.getUTCDay()+6)%7;
 const monday=Date.parse(dateKey(ms)+'T00:00:00+09:00')-day*DAY+offset*7*DAY;
 return Array.from({length:7},(_,i)=>dateKey(monday+i*DAY));
}
export function splitSession(start,end){
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return [];
 const result=[];for(let cursor=start;cursor<end;){
 const next=Math.min(end,Math.floor((cursor+OFFSET)/DAY)*DAY+DAY-OFFSET);
 result.push({date:dateKey(cursor),ms:next-cursor});cursor=next;
 }return result;
}
export function formatDuration(ms){const s=Math.floor(ms/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':')}
