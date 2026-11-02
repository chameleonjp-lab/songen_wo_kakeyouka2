/* UI/network boundary only. Battle rules, score formula and old records are unchanged. */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid=x=>x&&UUID.test(x.id)&&typeof x.name==='string'&&x.name.trim()&&Number.isSafeInteger(x.score)&&typeof x.version==='string'&&['pending','sent'].includes(x.status);
const same=(a,b)=>a.id===b.id&&a.name===b.name&&a.score===b.score&&a.version===b.version;
function begin(value,uuid){const name=String(value??'').replace(/[\r\n\t]/g,' ').trim();let id=null;try{id=uuid();}catch{}return Object.freeze({name,id:UUID.test(id)?id:null,eligible:!!name&&name.length<=12&&UUID.test(id)});}
function finish(run,score,version){if(!run?.eligible||!Number.isSafeInteger(score))return null;return Object.freeze({id:run.id,name:run.name,score,version,status:'pending'});}
function queue(storage,key){
 const memory=new Map(),quarantined=new Set();let damaged=false,conflict=false,persisted=true;
 function read(){try{const text=storage?.getItem(key);if(text==null)return [];const list=JSON.parse(text);if(!Array.isArray(list))throw Error();damaged=list.some(x=>!valid(x));return list;}catch{damaged=true;return null;}}
 function items(){const list=read();const map=new Map();for(const x of list||[]){if(!valid(x)||quarantined.has(x.id))continue;const old=map.get(x.id);if(old&&!same(old,x)){conflict=true;quarantined.add(x.id);map.delete(x.id);continue;}map.set(x.id,old?.status==='sent'?old:x);}for(const [id,x] of memory){if(quarantined.has(id))continue;const disk=map.get(id);if(disk&&!same(disk,x)){conflict=true;quarantined.add(id);map.delete(id);}else map.set(id,disk?.status==='sent'?disk:x);}return [...map.values()];}
 function put(item){if(!valid(item)||quarantined.has(item.id))return false;const list=read();const existing=(list||[]).filter(x=>valid(x)&&x.id===item.id);const local=memory.get(item.id);if(existing.some(x=>!same(x,item))||(local&&!same(local,item))){conflict=true;quarantined.add(item.id);return false;}
 const effective={...item,status:existing.some(x=>x.status==='sent')||local?.status==='sent'?'sent':item.status};memory.set(item.id,effective);
 if(!list){persisted=false;return false;}
 let next=list.slice();
 for(const [id,pending] of memory){
   if(quarantined.has(id))continue;
   const matches=next.filter(x=>valid(x)&&x.id===id);
   if(matches.some(x=>!same(x,pending))){conflict=true;quarantined.add(id);continue;}
   const merged={...pending,status:matches.some(x=>x.status==='sent')?'sent':pending.status};
   next=next.filter(x=>!(valid(x)&&x.id===id));next.push(merged);
 }
 try{if(!storage)throw Error();storage.setItem(key,JSON.stringify(next));persisted=true;return true;}catch{persisted=false;return false;}}
 return {items,put,get damaged(){read();return damaged;},get conflict(){return conflict;},get persisted(){return persisted;}};
}
function accepted(value,expected){const r=Array.isArray(value)&&value.length===1?value[0]:null;return !!(r&&r.accepted===true&&expected&&typeof expected.name==='string'&&Number.isSafeInteger(expected.score)&&r.result_best_score>=expected.score&&r.result_normalized_name===expected.name&&r.result_display_name===expected.name&&[r.result_first_score,r.result_best_score,r.result_play_count].every(n=>Number.isSafeInteger(n)&&n>=-2147483648&&n<=2147483647)&&r.result_play_count>=1&&['is_first_play','is_new_best','was_duplicate'].every(k=>typeof r[k]==='boolean'));}
function ranks(value){if(!Array.isArray(value))throw Error('Invalid ranking response');return value.slice(0,30).map(r=>{if(!r||typeof r!=='object')throw Error('Invalid ranking row');const rank=r.rank_no??r.rank;const name=r.display_name;const score=r.best_score??r.score;if(!Number.isInteger(Number(rank))||Number(rank)<1||typeof name!=='string'||!name.trim()||score===null||score===undefined||score===''||!Number.isFinite(Number(score)))throw Error('Invalid ranking row');return {rank:Number(rank),name,score:Number(score)};});}
root.SongenCommon={begin,finish,queue,accepted,ranks,same};
})(globalThis);

