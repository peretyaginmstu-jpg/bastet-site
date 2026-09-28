import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './browser.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base=process.argv[2]||'http://127.0.0.1:8747';
const out=resolve(root,'_dev/qa-v5');
mkdirSync(out,{recursive:true});
const checks=[], failures=[], resources=[], errors=[], metrics=[];
function check(ok,label,detail) { checks.push({label,passed:!!ok,detail}); if(!ok) failures.push({label,detail}); }
const browser=await launch();
try {
 const ctx=await browser.newContext({reducedMotion:'reduce'});
 const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 page.on('response',r=>{if(r.status()>=400)resources.push(r.url());});
 async function geometry(label) {
  const g=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
   over:[...document.querySelectorAll('main h1,main h2,main h3,main h4,.service-more,.field,.system-image,.equipment-grid li,.compact-list li')].filter(e=>{
    const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left < -1 || r.right > innerWidth+1);
   }).map(e=>e.id||e.className||e.textContent.slice(0,40))}));
  check(g.scroll<=g.width+1&&!g.over.length,label,g);
 }
 async function contrast() {
  return page.evaluate(()=>{
   const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);
   const blend=(a,b)=>{const alpha=a[3]??1;return a.slice(0,3).map((v,i)=>v*alpha+b[i]*(1-alpha)).concat(1);};
   function background(el){const chain=[];while(el){chain.unshift(el);el=el.parentElement;}let bg=[255,255,255,1];for(const node of chain)bg=blend(rgb(getComputedStyle(node).backgroundColor),bg);return bg;}
   const lum=c=>{const a=c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const bad=[];let node,count=0,min=99;
   while(node=walker.nextNode()){
    const el=node.parentElement;if(!node.textContent.trim()||el.closest('script,style,noscript,svg,option,.visually-hidden,.skip-link'))continue;
    const range=document.createRange();range.selectNodeContents(node);const rect=range.getBoundingClientRect();if(!rect.width||!rect.height)continue;
    let visible=true;for(let p=el;p;p=p.parentElement){const cs=getComputedStyle(p);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<.99||p.getAttribute('aria-hidden')==='true')visible=false;}
    if(!visible)continue;const cs=getComputedStyle(el),bg=background(el),fg=blend(rgb(cs.color),bg);
    const a=lum(bg),b=lum(fg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const required=parseFloat(cs.fontSize)>=24||(parseFloat(cs.fontSize)>=18.66&&parseInt(cs.fontWeight)>=700)?3:4.5;
    count++;min=Math.min(min,ratio);if(ratio+.015<required)bad.push({text:node.textContent.trim().slice(0,60),ratio,required,fg,bg});
   }
   return {count,min,bad};
  });
 }
 for(const width of [320,375,768,1024,1280,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/?qa=1',{waitUntil:'networkidle'});
  await geometry(width+' initial');
  if(width===1440){const hero=await page.evaluate(()=>({cta:document.querySelector('.hero-actions').getBoundingClientRect().bottom,license:document.querySelector('.proof-item').getBoundingClientRect().bottom,price:document.querySelector('.price-note').getBoundingClientRect().bottom,h1:parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)}));check(hero.cta<=900&&hero.price<=900&&hero.license<=900&&hero.h1<=68,'1440×900 CTA, price and license visible',hero);}
  for(const service of ['disinsection','deratization','acaricidal','disinfection']){
   await page.locator(`[data-service-open="${service}"]`).click();
   const s=await page.evaluate(()=>{const open=document.querySelector('.service-card.is-open'),d=open.querySelector('.service-card-detail'),r=d.getBoundingClientRect();return {count:document.querySelectorAll('.service-card.is-open').length,detailHeight:r.height,detailOverflow:d.scrollHeight>d.clientHeight+1,closed:[...document.querySelectorAll('.service-card:not(.is-open)')].map(c=>({height:c.getBoundingClientRect().height,header:c.querySelector('.service-card-copy').getBoundingClientRect().height}))};});
   check(s.count===1&&s.detailHeight>50&&!s.detailOverflow&&s.closed.every(c=>c.height<=c.header+3),width+' service '+service,s);await geometry(width+' '+service);
  }
  for(const kind of ['equipment','preparations']){
   await page.locator(`[data-system="${kind}"]`).click();
   const s=await page.evaluate(()=>{const im=document.querySelector('#systemImage').getBoundingClientRect(),content=document.querySelector('#systemContent').getBoundingClientRect();return {ratio:im.width/im.height,image:document.querySelector('#systemImage img').getAttribute('src'),imageTop:im.top,imageBottom:im.bottom,contentTop:content.top,listSize:[...document.querySelectorAll('#systemContent li')].map(e=>parseFloat(getComputedStyle(e).fontSize))};});
   check(Math.abs(s.ratio-4/3)<.01&&s.image.includes(kind==='equipment'?'equipment-tab':'preparations-tab')&&s.listSize.every(v=>v>=14),width+' tab layout '+kind,s);
   if(width<1024)check(s.imageBottom<=s.contentTop+1,width+' photo before catalogue',s);
   const c=await contrast();check(!c.bad.length,width+' '+kind+' text contrast',c);await geometry(width+' '+kind);
  }
  await page.selectOption('#fObject','territory');await page.locator('.choice:has(input[value="prevention"])').click();
  check(await page.locator('.result-service').count()===4,width+' four-service result');await geometry(width+' populated form');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  const before=await page.locator('.nav-shell').boundingBox();await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await page.waitForTimeout(30);const after=await page.locator('.nav-shell').boundingBox();
  check(before.height===after.height&&before.x===after.x&&before.width===after.width,width+' stable header',{before,after});
  for(const id of ['top','services','equipment','process','documents','request','contacts']){
   await page.goto(base+'/?qa=1#'+id,{waitUntil:'load'});await page.waitForTimeout(80);
   const a=await page.evaluate(id=>({top:document.getElementById(id).getBoundingClientRect().top,header:document.querySelector('header').getBoundingClientRect().bottom}),id);
   check(id==='top'||a.top>=a.header-1,width+' direct #'+id,a);
  }
  for(const href of ['#services','#equipment','#process','#documents','#contacts']){
   if(width<=1180){await page.locator('#burger').click();await page.locator('#mobileMenu a[href="'+href+'"]').click();}
   else await page.locator('.desktop-nav a[href="'+href+'"]').click();
   const a=await page.evaluate(href=>({top:document.querySelector(href).getBoundingClientRect().top,header:document.querySelector('header').getBoundingClientRect().bottom,open:document.querySelector('#burger').getAttribute('aria-expanded')}),href);
   check(a.top>=a.header-1&&a.open==='false',width+' menu '+href,a);
  }
  const targets=await page.evaluate(()=>[...document.querySelectorAll('button,.btn,.round-link,.choice span,.mobile-menu.open a,.footer-nav a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44);}).map(e=>e.className));
  check(!targets.length,width+' 44px control targets',targets);
  await page.goto(base+'/privacy.html',{waitUntil:'networkidle'});await geometry(width+' privacy');const legal=await contrast();check(!legal.bad.length,width+' privacy contrast',legal);
 }
 // Exercise all 60 combinations through the actual UI rendering path.
 await page.goto(base+'/?qa=1');let combinations=0;
 for(const object of await page.evaluate(()=>SITE.OBJECTS.map(o=>o.id)))for(const issue of await page.evaluate(()=>SITE.ISSUES.map(i=>i.id))){
  await page.selectOption('#fObject',object);await page.evaluate(issue=>{for(const el of document.querySelectorAll('#issuesBox input'))el.checked=el.value===issue;document.querySelector('#issuesBox input').dispatchEvent(new Event('change',{bubbles:true}));},issue);
  const p=await page.evaluate(({object,issue})=>{const expected=SITE.pickServices(object,[issue]);return {expected:expected.services.length,actual:document.querySelectorAll('.result-service').length,notes:expected.notes.every(n=>document.querySelector('#pickerResult').textContent.includes(n))};},{object,issue});
  check(p.expected===p.actual&&p.notes,'UI picker '+object+' × '+issue,p);combinations++;
 }
 metrics.push({browserCombinations:combinations});
 // Test handlers, intercept only the final outbound side effects.
 await page.route('**/js/app.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(resolve(root,'js/app.js'),'utf8').replace('window.location.href = url;','window.__mail = url;')}));
 await page.goto(base+'/?qa=1');await page.evaluate(()=>{window.__opened=null;window.__mail=null;window.__copied='';window.open=u=>{window.__opened=u;return null;};Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copied=t;}}});});
 await page.fill('#fPhone','89188266617');await page.fill('#fName','Тест QA');await page.fill('#fPlace','Тестовый объект 800 м²');await page.fill('#fComment','Проверка без отправки');await page.selectOption('#fObject','warehouse');
 for(const id of ['btnMail','btnCopy'])await page.locator('#'+id).click();
 check(await page.evaluate(()=>!window.__mail&&!window.__copied),'all channels blocked without consent');
 await page.locator('#fConsent').check();for(const id of ['btnMail','btnCopy'])await page.locator('#'+id).click();
 const sent=await page.evaluate(()=>({mail:window.__mail,copy:window.__copied}));
 const mail=new URL(sent.mail);for(const [name,text] of [['mail',mail.searchParams.get('body')],['copy',sent.copy]])check(text.includes('Тест QA')&&text.includes('Складские помещения')&&text.includes('800 м²')&&text.includes('Проверка без отправки'),name+' request text');
 check(mail.pathname==='aziev-robert@mail.ru'&&!(await page.locator('#btnWa').count())&&!(await page.locator('a[href*="wa.me"]').count()),'outbound destinations: mail only, no WhatsApp');
 await page.fill('#fPhone','123');await page.evaluate(()=>{window.__mail=null;});await page.locator('#btnMail').click();check(await page.evaluate(()=>!window.__mail&&document.activeElement.id==='fPhone'),'invalid phone blocked with focus');
 await page.fill('#fPhone','89188266617');await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}});document.execCommand=()=>true;});await page.locator('#btnCopy').click();await page.waitForTimeout(50);check((await page.locator('#formStatus').innerText()).includes('скопирован'),'copy denied fallback');
 const cdp=await ctx.newCDPSession(page);const ax=await cdp.send('Accessibility.getFullAXTree');
 check(ax.nodes.some(n=>n.role?.value==='textbox'&&n.name?.value==='Телефон *'),'AX telephone label');
 check(ax.nodes.some(n=>n.role?.value==='tab'&&n.name?.value==='Препараты'),'AX tabs exposed');
 await page.unroute('**/js/app.js');
 // Reduced-motion / no-JS on the smallest width and desktop.
 for(const width of [320,1440]){
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});const p=await nojs.newPage();await p.goto(base);
  const state=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,details:[...document.querySelectorAll('.service-card-detail')].every(e=>e.getBoundingClientRect().height>100),tel:!!document.querySelector('a[href="tel:+79188266617"]')}));check(!state.overflow&&state.details&&state.tel,width+' no JS',state);await nojs.close();
 }
 // Real animations, rapid switching, delayed image decode, keyboard and reduced-motion change.
 const motion=await browser.newContext({viewport:{width:1440,height:900}});const m=await motion.newPage();await m.goto(base,{waitUntil:'networkidle'});
 for(const kind of ['preparations','equipment','preparations','equipment','preparations'])await m.locator(`[data-system="${kind}"]`).click({force:true});
 await m.waitForTimeout(500);check(await m.evaluate(()=>document.querySelector('[aria-selected="true"]').dataset.system==='preparations'&&document.querySelector('#systemImage img').src.includes('preparations-tab')&&document.querySelectorAll('#systemContent li').length===13&&!document.querySelector('#systemContent').hasAttribute('aria-busy')),'rapid switching final state');
 await m.locator('[data-system="preparations"]').focus();await m.keyboard.press('ArrowLeft');await m.waitForTimeout(400);check(await m.evaluate(()=>document.activeElement.dataset.system==='equipment'&&document.activeElement.getAttribute('aria-selected')==='true'),'keyboard tab + focus');
 await m.evaluate(()=>scrollTo({top:400,behavior:'instant'}));await m.waitForTimeout(50);const shift=await m.evaluate(()=>new DOMMatrix(getComputedStyle(document.querySelector('.hero-visual')).transform).m42);check(Math.abs(shift)<=6,'parallax limit',shift);
 await m.emulateMedia({reducedMotion:'reduce'});await m.waitForTimeout(50);const reduced=await m.evaluate(()=>({transform:getComputedStyle(document.querySelector('.hero-visual')).transform,duration:getComputedStyle(document.querySelector('.btn')).transitionDuration}));check(reduced.transform==='none'&&reduced.duration==='0s','live reduced-motion change',reduced);
 await m.emulateMedia({reducedMotion:'no-preference'});const height=await m.evaluate(()=>document.documentElement.scrollHeight);for(let y=0;y<height;y+=650){await m.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await m.waitForTimeout(35);}await m.waitForTimeout(700);
 const unfinished=await m.evaluate(()=>[...document.querySelectorAll('.reveal')].filter(e=>getComputedStyle(e).opacity!=='1').map(e=>({class:e.className,opacity:getComputedStyle(e).opacity,top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height})));
 check(!unfinished.length,'all reveals finish outside QA mode',unfinished);
 await motion.close();
 await page.setViewportSize({width:720,height:900});await page.goto(base+'/?qa=1');await geometry('200% desktop-equivalent reflow');
 check(!errors.length,'console errors',errors);check(!resources.length,'failed resources',resources);
} catch(e) { failures.push({label:'harness error',detail:e.stack}); }
finally { await browser.close(); }
writeFileSync(resolve(out,'editorial-checks.json'),JSON.stringify({checks:checks.length,passed:checks.length-failures.length,failures,metrics,results:checks},null,2));
console.log(JSON.stringify({checks:checks.length,failures,metrics},null,2));
if(failures.length)process.exitCode=1;
