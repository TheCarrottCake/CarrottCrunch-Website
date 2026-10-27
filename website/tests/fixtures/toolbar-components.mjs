import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as eventTime from '../../app/lib/event-time.ts';

export async function toolbarComponents(react = React, router = {}) {
 const imports={react,'react/jsx-runtime':jsx,'../lib/event-time':eventTime,'react-router':{
  useFetcher:()=>({state:'idle',Form:'form'}),Link:({to,...props})=>React.createElement('a',{...props,href:to}),...router,
 }};
 const load=async file=>{const module={exports:{}};const output=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(output,{URLSearchParams,module,exports:module.exports,require:key=>{if(!(key in imports))throw new Error('Unexpected import '+key);return imports[key];}});return module.exports;};
 imports['./featured-image']=await load('app/components/featured-image.tsx');
 imports['./content-image-upload']=await load('app/components/content-image-upload.tsx');
 imports['./featured-image-field']=await load('app/components/featured-image-field.tsx');
 imports['./publication-time']=await load('app/components/publication-time.tsx');
 imports['./delete-draft-button']=await load('app/components/delete-draft-button.tsx');
 imports['./editor-toolbar']=await load('app/components/editor-toolbar.tsx');
 return {imports,load,...imports['./editor-toolbar']};
}
