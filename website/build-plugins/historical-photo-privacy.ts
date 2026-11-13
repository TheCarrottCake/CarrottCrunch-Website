import type {Plugin} from 'vite';
import {rm} from 'node:fs/promises';
import {resolve,sep,posix} from 'node:path';
/** Owner originals contain unapproved portraits; keep disk sources, never serve/copy them. */
export function isHistoricalPhotoOriginal(url:string){
 let path=url.split('?')[0];
 for(let n=0;n<3;n++){try{const decoded=decodeURIComponent(path);if(decoded===path)break;path=decoded;}catch{return true;}}
 return /(?:^|\/)images\/server photos(?:\/|$)/i.test(posix.normalize(path.replaceAll('\\','/')));
}
export function historicalPhotoPrivacy(publicDirectory:string,clientDirectory:string):Plugin {
 const source=resolve(publicDirectory,'images','Server Photos'),root=resolve(clientDirectory),generated=resolve(root,'images','Server Photos');
 if(!generated.startsWith(root+sep)||generated===source||source.startsWith(root+sep)||root.startsWith(resolve(publicDirectory)+sep))throw new Error('Unsafe historical-photo build paths');
 const guard=(req:{url?:string},res:{statusCode:number;setHeader:(name:string,value:string)=>void;end:()=>void},next:()=>void)=>{if(!isHistoricalPhotoOriginal(req.url||'/'))return next();res.statusCode=404;res.setHeader('Cache-Control','no-store');res.end();};
 return {name:'historical-photo-original-privacy',configureServer(server){server.middlewares.use(guard);},configurePreviewServer(server){server.middlewares.use(guard);},async writeBundle(){
  // Vite copies public files before writing bundles. Remove only this generated copy.
  await rm(generated,{recursive:true,force:true});
 }};
}
