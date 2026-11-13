import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {isHistoricalPhotoOriginal,historicalPhotoPrivacy} from '../build-plugins/historical-photo-privacy.ts';
test('unapproved raw collection cannot be served through case, encoding, filesystem or dot-path aliases',()=>{
 for(const path of ['/images/Server%20Photos/IMG_0505.png','/images/server photos/unknown.png','/images/Server%2520Photos/unknown.png','/@fs/C:/repo/public/images/Server%20Photos/IMG_0505.png','/images/other/../Server%20Photos/Love.png','/images/Server%20Photos','/images%2fServer%20Photos%2fIMG_0505.png'])assert.equal(isHistoricalPhotoOriginal(path),true,path);
 for(const path of ['/servers','/images/historical-minecraft/historical-tree-settlement-800.jpg','/branding/carrottcrunch-icon.svg'])assert.equal(isHistoricalPhotoOriginal(path),false,path);
});
test('build exclusion removes generated originals only, preserving source originals and display copies',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'carrott-photo-privacy-'));try{
 const source=join(temp,'public'),client=join(temp,'build/client');
 for(const dir of [join(source,'images/Server Photos'),join(client,'images/Server Photos'),join(client,'images/historical-minecraft')])await mkdir(dir,{recursive:true});
 const original=join(source,'images/Server Photos/unknown.png'),generated=join(client,'images/Server Photos/unknown.png'),display=join(client,'images/historical-minecraft/selected.jpg');
 await writeFile(original,'TEST original');await writeFile(generated,'TEST copied original');await writeFile(display,'TEST optimized copy');
 const plugin=historicalPhotoPrivacy(source,client);await plugin.writeBundle();
 assert.equal(await readFile(original,'utf8'),'TEST original');await assert.rejects(access(generated));assert.equal(await readFile(display,'utf8'),'TEST optimized copy');
 assert.throws(()=>historicalPhotoPrivacy(source,source),/Unsafe/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
