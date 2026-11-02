import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const url='https://chameleonjp.codeberg.page/songen_wo_kakeyouka2/',tags='#尊厳を賭けようか2 #ゲーム制作';
const weight=s=>[...s.replace(/https?:\/\/\S+/gu,'x'.repeat(23))].reduce((n,c)=>{const x=c.codePointAt(0);return n+((x<=0x10ff||(x>=0x2000&&x<=0x200d)||(x>=0x2010&&x<=0x201f)||(x>=0x2032&&x<=0x2037))?1:2)},0);
function runtime(){
 const b={};vm.createContext(b);for(const file of ['languages.js','i18n.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),b);
 const extract=name=>{const start=html.indexOf('    function '+name+'(');assert.ok(start>=0,name);const end=html.indexOf('\n    }',start);return html.slice(start,end+6)};
 const helper=html.includes('    function shareTextWeight(')?extract('shareTextWeight'):'';
 vm.runInContext(`const GAME={get title(){return SongenI18n.t('s001')},url:${JSON.stringify(url)}};\n${extract('describeParts')}\n${helper}\n${extract('makeTotalShareText')}`,b);return b;
}
test('all fifteen actual home and result share paths preserve values, exact two tags, and X weighted budget',()=>{
 const b=runtime();assert.equal(b.SongenI18n.locales.length,15);
 for(const locale of b.SongenI18n.locales){b.SongenI18n.set(locale);const home=b.SongenI18n.t('s208',[b.SongenI18n.t('s001'),url]);assert.ok(home.endsWith('\n'+tags),locale+' home tags');assert.ok(weight(home)<=280,locale+' home budget');
  for(let mask=0;mask<243;mask++){let n=mask;const parts={};for(const key of ['head','leftArm','rightArm','leftFoot','rightFoot']){const v=n%3;n=Math.floor(n/3);parts[key]={broken:v===2,damage:v?1:0};}
   for(const key of ['s056','s116','s051','s117'])for(const score of [-100,100000000]){
    const result={resultLabel:b.SongenI18n.t(key),totalScore:score,wins:3,maxBattles:5,finalParts:parts};const before=JSON.stringify(result);b.__result=result;
    const text=vm.runInContext('makeTotalShareText(__result)',b);
    assert.ok(text.endsWith('\n'+tags),locale+' result tags');assert.deepEqual(text.match(/#[^\s]+/gu),['#尊厳を賭けようか2','#ゲーム制作']);assert.ok(weight(text)<=280,`${locale} mask=${mask} weight=${weight(text)}`);
    const full=b.SongenI18n.t('s154',[b.SongenI18n.t('s001'),result.resultLabel,score,3,5,vm.runInContext('describeParts(__result.finalParts)',b),url]);const compact=[b.SongenI18n.t('s001'),result.resultLabel,b.SongenI18n.t('s157',[score]),b.SongenI18n.t('s158',[3,5]),url,tags].join('\n');assert.equal(text,weight(full)<=280?full:compact,locale+' exact full/compact selection');
    assert.ok(text.includes(String(score)));assert.ok(text.includes(result.resultLabel));assert.ok(text.includes(b.SongenI18n.t('s001')));assert.equal(text.split(url).length,2);assert.equal(JSON.stringify(result),before);
   }
  }
 }
});
test('fixed PNG uses exact large-card metadata and public asset allowlist',()=>{
 for(const attr of ['property="og:image"','name="twitter:image"'])assert.ok(html.includes(`<meta ${attr} content="${url}assets/social-card.png"`));
 assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image"'));for(const [key,v] of [['og:image:width','1200'],['og:image:height','630']])assert.ok(html.includes(`<meta property="${key}" content="${v}"`));
 const p=new URL('../assets/social-card.png',import.meta.url);assert.ok(fs.existsSync(p));const b=fs.readFileSync(p);assert.equal(b.subarray(1,4).toString(),'PNG');assert.equal(b.readUInt32BE(16),1200);assert.equal(b.readUInt32BE(20),630);
 const m=JSON.parse(fs.readFileSync(new URL('./pages-files.json',import.meta.url)));assert.equal(m.required.filter(x=>x==='assets/social-card.png').length,1);assert.ok([...m.required,...m.optional].every(x=>!x.includes('test-results')&&!x.endsWith('.svg')));
});
