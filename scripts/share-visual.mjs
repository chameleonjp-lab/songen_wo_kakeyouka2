import {chromium,webkit} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {inspectShareTarget} from './share-visibility.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname),origin='https://songen2.test',official='https://chameleonjp.codeberg.page/songen_wo_kakeyouka2/';
const locales=['ja','en','es','pt-BR','zh-Hans','fr','de','ko','ru','it','zh-Hant','id','tr','vi','th'];
const engine=process.env.BROWSER_ENGINE||'chromium';assert.ok(['chromium','webkit'].includes(engine));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/pages-files.json'),'utf8')),allowed=new Set([...manifest.required,...manifest.optional]);
const out=path.join(root,'test-results/share-visible');fs.mkdirSync(out,{recursive:true});const receipts=[];
const browser=await ({chromium,webkit})[engine].launch({headless:true});
try {
 for(const lang of locales)for(const orientation of ['portrait',...(['ja','en','de'].includes(lang)?['landscape']:[])]){
  const context=await browser.newContext({viewport:orientation==='portrait'?{width:393,height:852}:{width:852,height:393},hasTouch:true,locale:lang,serviceWorkers:'block'});const forbidden=[],errors=[];
  await context.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url());
   // Ranking reads receive an empty local response. No upstream request is made.
   if(u.origin==='https://mlpnjgezrnhdxsxolyzj.supabase.co'&&u.pathname==='/rest/v1/rpc/get_best_score_ranking'&&r.method()==='POST')return route.fulfill({json:[]});
   const relative=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1));
   if(u.origin!==origin||!['GET','HEAD'].includes(r.method())||!allowed.has(relative)){forbidden.push({method:r.method(),origin:u.origin,path:u.pathname});return route.abort('blockedbyclient')}
   return route.fulfill({contentType:relative.endsWith('.html')?'text/html':relative.endsWith('.png')?'image/png':'application/javascript',body:r.method()==='HEAD'?Buffer.alloc(0):fs.readFileSync(path.join(root,relative))});
  });
  await context.routeWebSocket('**/*',ws=>{forbidden.push({webSocket:true});ws.close()});
  await context.addInitScript(language=>{localStorage.setItem('songen_wo_kakeyouka2_language_v1',language);localStorage.setItem('songen_wo_kakeyouka2_audio_v1',JSON.stringify({enabled:false,volume:0}));window.__intents=[];window.open=()=>({opener:null,location:{replace:u=>window.__intents.push(u)}});},lang);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');
  assert.equal(await page.locator('#languageSelect').inputValue(),lang);
  async function share(screen,expected){
   const button=page.locator(screen==='home'?'#homeShareBtn':'#resultShareBtn');
   // The real card enters from opacity:0 / scale(.985). Wait for that finite transition,
   // rather than inspecting its intentional invisible first frame or disabling animation.
   const transition=await button.evaluate(async el=>{
    const entries=[];for(let node=el;node;node=node.parentElement)for(const animation of node.getAnimations())if(animation.animationName==='cardIn')entries.push({node,animation});
    const before=entries.map(({node,animation})=>({opacity:getComputedStyle(node).opacity,state:animation.playState,currentTime:animation.currentTime}));
    await Promise.all(entries.map(({animation})=>animation.finished));
    return {before,after:entries.map(({node,animation})=>({opacity:getComputedStyle(node).opacity,state:animation.playState}))};
   });
   fs.writeFileSync(path.join(out,`${engine}-${lang}-${orientation}-${screen}-transition.json`),JSON.stringify(transition,null,2));
   await button.scrollIntoViewIfNeeded();const geometry=await button.evaluate(inspectShareTarget);
   for(const k of ['visible','viewport','unclipped','hit','fits'])assert.equal(geometry[k],true,`${lang} ${orientation} ${screen} ${k} ${JSON.stringify(geometry)}`);assert.ok(geometry.width>=44&&geometry.height>=44);
   assert.equal(await button.textContent(),await page.evaluate(()=>SongenI18n.t('s007')));const colors=await button.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));assert.deepEqual(colors,{background:'rgb(0, 0, 0)',color:'rgb(255, 255, 255)'});
   if(['ja','en','de'].includes(lang))await page.screenshot({path:path.join(out,`${engine}-${lang}-${orientation}-${screen}.png`)});
   const count=await page.evaluate(()=>__intents.length);await button.tap();const intents=await page.evaluate(()=>__intents);assert.equal(intents.length,count+1);const intent=new URL(intents.at(-1));assert.equal(intent.origin,'https://x.com');assert.equal(intent.pathname,'/intent/post');assert.equal(intent.searchParams.get('text'),expected);assert.ok(expected.endsWith('\n#尊厳を賭けようか2 #ゲーム制作'));assert.equal(await page.locator('#commonShareFallback').evaluate(el=>el.open),false);return geometry;
  }
  const home=await share('home',await page.evaluate(url=>SongenI18n.t('s208',[GAME.title,url]),official));
  await page.locator('#playerNameInput').fill('');await page.locator('#homeStartBtn').tap();await page.locator('#setupStartBtn').tap();
  await page.waitForFunction(()=>state.running&&!state.ended);await page.locator('#retireBtn').tap();await page.locator('#outcomeScreen.active').waitFor();await page.locator('#outcomeResultBtn').tap();await page.locator('#resultScreen.active').waitFor();
  const before=await page.evaluate(()=>JSON.stringify(runState.result));assert.equal(await page.evaluate(()=>runState.receipt.name),'');
  const expected=await page.evaluate(()=>makeTotalShareText(runState.result));const result=await share('result',expected);assert.equal(await page.evaluate(()=>JSON.stringify(runState.result)),before);
  // Detailed report is not a share-text copy button; its separate existing function must survive.
  assert.equal(await page.locator('#copyDetailBtn').count(),1);assert.equal(await page.evaluate(()=>scoreQueue.items().length),0);
  assert.deepEqual(forbidden,[]);assert.deepEqual(errors,[]);receipts.push({lang,orientation,home,result,anonymous:true,score:JSON.parse(before).totalScore,productionWrites:0});await context.close();
 }
 fs.writeFileSync(path.join(out,`${engine}-receipt.json`),JSON.stringify(receipts,null,2));console.log(JSON.stringify({engine,cases:receipts.length,homeResult:true,productionWrites:0}));
} finally {await browser.close()}
