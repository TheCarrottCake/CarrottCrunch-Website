import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

test('Nested picker Escape and input keys never dismiss or submit the parent item editor',async()=>{
 const parent={},picker={};let dismissed=0,confirmed=0,prevented=0;
 class Element{closest(){return picker;}}
 class Input extends Element{}
 const imports={react:{useEffect(){},useId:()=>'test-editor',useRef:()=>({current:null})},'react/jsx-runtime':jsx};
 const module={exports:{}};
 const source=await readFile('app/components/studio-item-dialog.tsx','utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>imports[name],Element,HTMLInputElement:Input,window:{confirm(){confirmed++;return true;}}});
 const dialog=module.exports.StudioItemDialog({title:'Test editor',dirty:true,onDismiss:()=>dismissed++,children:null,actions:null});
 dialog.props.onCancel({target:picker,currentTarget:parent,preventDefault:()=>prevented++});
 dialog.props.onKeyDown({key:'Enter',target:new Input(),currentTarget:parent,preventDefault:()=>prevented++});
 assert.equal(dismissed,0);assert.equal(confirmed,0);assert.equal(prevented,0);
 dialog.props.onCancel({target:parent,currentTarget:parent,preventDefault:()=>prevented++});
 assert.equal(dismissed,1);assert.equal(confirmed,1);assert.equal(prevented,1);
});
