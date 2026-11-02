(function(root){'use strict';
const cues={select:[480,.045,1],start:[660,.14,3],attack:[260,.055,1],guard:[390,.08,2],hit:[160,.08,2],break:[95,.16,3],reward:[820,.15,3],result:[520,.24,4],warning:[720,.09,3]};
function create(storage,createContext,now=()=>performance.now()){
 let enabled=true,volume=.3,context=null,epoch=0,lastAt=-Infinity,lastPriority=0,voices=new Set(),lastByCue=new Map();
 try{const value=JSON.parse(storage?.getItem('songen_wo_kakeyouka2_audio_v1'));if(value&&typeof value.enabled==='boolean')enabled=value.enabled;if(value&&Number.isFinite(value.volume)&&value.volume>=0&&value.volume<=1)volume=value.volume;}catch{}
 const cleanup=(voice)=>{voices.delete(voice);for(const action of [()=>voice.osc.stop(),()=>voice.osc.disconnect(),()=>voice.gain.disconnect()])try{action();}catch{}};
 function interrupt(){epoch++;for(const v of [...voices])cleanup(v);lastByCue.clear();lastAt=-Infinity;lastPriority=0;}
 async function unlock(){if(!enabled||volume===0)return;const token=epoch;try{if(!context){context=createContext();if(!context)return;context.onstatechange=()=>{if(context.state!=='running')interrupt();};}if(context.state!=='running')await context.resume();if(token!==epoch)return;}catch{}}
 function set(on,v){enabled=!!on;volume=Math.max(0,Math.min(1,Number(v)||0));if(!enabled||volume===0)interrupt();try{storage?.setItem('songen_wo_kakeyouka2_audio_v1',JSON.stringify({enabled,volume}));}catch{}}
 function play(name){const c=cues[name];if(!c||!enabled||volume===0||context?.state!=='running')return;const time=now();if(time-(lastByCue.get(name)??-Infinity)<80||(time-lastAt<250&&c[2]<lastPriority))return;lastByCue.set(name,time);lastAt=time;lastPriority=c[2];if(voices.size>=4)cleanup(voices.values().next().value);
 let voice={};try{voice.osc=context.createOscillator();voice.gain=context.createGain();voices.add(voice);voice.osc.type=name==='break'?'triangle':'sine';voice.osc.frequency.setValueAtTime(c[0],context.currentTime);voice.gain.gain.setValueAtTime(Math.max(.0001,volume*.13),context.currentTime);voice.gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+c[1]);voice.osc.connect(voice.gain);voice.gain.connect(context.destination);voice.osc.addEventListener('ended',()=>cleanup(voice),{once:true});voice.osc.start();voice.osc.stop(context.currentTime+c[1]);}catch{cleanup(voice);}}
 return {unlock,set,play,interrupt,get enabled(){return enabled;},get volume(){return volume;},get active(){return voices.size;}};
}root.SongenAudio={create};})(globalThis);
