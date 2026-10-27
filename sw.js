// Keeps the app opening fast with weak or no signal. Live data is cached by the page itself.
const C="spi-solunar-v2", WAIT=3000;/* longest the app waits on the network before using its saved copy */
const SHELL=["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"];
const FONT_CSS="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap";
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>Promise.all([c.addAll(SHELL),c.add(FONT_CSS).catch(()=>{})])).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
const save=(q,r)=>{if(r.ok||r.type==="opaque"){const cp=r.clone();caches.open(C).then(c=>c.put(q,cp))}return r};
const after=ms=>new Promise(res=>setTimeout(res,ms));
const noCSS=()=>new Response("",{headers:{"Content-Type":"text/css"}});
/* App files: the network's copy if it arrives within WAIT, otherwise the saved one.
   A slow download keeps going in the background and refreshes the saved copy for next time. */
function shell(e){const q=e.request,net=fetch(q).then(r=>save(q,r));e.waitUntil(net.catch(()=>{}));
  const saved=()=>caches.match(q).then(r=>r||(q.mode==="navigate"?caches.match("./index.html"):undefined));
  return Promise.race([net,after(WAIT).then(saved).then(r=>r||net)]).catch(()=>saved().then(r=>r||Response.error()))}
/* Google Fonts never change, so the saved copy wins. A stylesheet that isn't saved yet can't hold up the page longer than WAIT. */
function font(e){const q=e.request;
  return caches.match(q,{ignoreVary:true}).then(hit=>{if(hit)return hit;
    const net=fetch(q).then(r=>save(q,r));if(q.destination!=="style")return net;
    e.waitUntil(net.catch(()=>{}));return Promise.race([net,after(WAIT).then(noCSS)]).catch(noCSS)})}
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);
  if(u.origin===location.origin)e.respondWith(shell(e));
  else if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))e.respondWith(font(e))});
