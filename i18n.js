(function(root){'use strict';
const locales=['ja','en','es','pt-BR','zh-Hans','fr','de','ko','ru','it','zh-Hant','id','tr','vi','th'];
const catalogs=root.SongenCatalogs||{};
function choose(saved,browser=[]){if(locales.includes(saved))return saved;for(const value of browser){const v=String(value).toLowerCase();if(v.startsWith('zh'))return /tw|hk|hant/.test(v)?'zh-Hant':'zh-Hans';if(v.startsWith('pt'))return 'pt-BR';const l=locales.find(x=>x.toLowerCase()===v||x===v.split('-')[0]);if(l)return l;}return 'en';}
let stored;try{stored=root.localStorage?.getItem('songen_wo_kakeyouka2_language_v1');}catch{}
let language=choose(stored,root.navigator?.languages||[]);const bindings=[];
function t(key,args=[]){return (catalogs[language]?.[key]??catalogs.en?.[key]??catalogs.ja?.[key]??key).replace(/\{v(\d+)\}/g,(_,n)=>String(args[Number(n)]??''));}
function apply(){if(!root.document)return;root.document.documentElement.lang=language;root.document.title=t("s001");for(const b of bindings){if(b.attr)b.node.setAttribute(b.attr,t(b.key));else b.node.nodeValue=b.leading+t(b.key)+b.trailing;}}
function set(value){if(!locales.includes(value))return;language=value;try{root.localStorage?.setItem('songen_wo_kakeyouka2_language_v1',language);}catch{}apply();}
function bind(){if(!root.document)return;const source=new Map(Object.entries(catalogs.ja||{}).map(([k,v])=>[v,k]));const walk=root.document.createTreeWalker(root.document.body,4);let node;while(node=walk.nextNode()){if(node.parentElement?.closest('script,style'))continue;const key=source.get(node.nodeValue.trim());if(key)bindings.push({node,key,leading:node.nodeValue.match(/^\s*/)[0],trailing:node.nodeValue.match(/\s*$/)[0]});}for(const node of root.document.querySelectorAll('[aria-label],[placeholder],[title]'))for(const attr of ['aria-label','placeholder','title']){const key=source.get(node.getAttribute(attr));if(key)bindings.push({node,key,attr});}apply();}
root.SongenI18n={locales,catalogs,t,choose,set,bind,get language(){return language;}};
})(globalThis);
