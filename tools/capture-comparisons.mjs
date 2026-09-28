import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './browser.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const browser=await launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 for(const [width,section] of [[1440,'top'],[375,'top'],[1440,'equipment'],[1440,'preparations'],[1440,'request-empty'],[320,'service-acaricidal']]){
  await page.goto(`http://127.0.0.1:8745/_dev/compare.html?width=${width}&section=${section}`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
  await page.screenshot({path:resolve(root,`_dev/qa-v5/comparison-${section}-${width}.png`),fullPage:true});
 }
 console.log('Six comparison boards captured; all 90 view/state pairs available in _dev/compare.html.');
} finally { await browser.close(); }
