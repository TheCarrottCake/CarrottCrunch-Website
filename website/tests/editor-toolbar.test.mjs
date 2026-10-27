import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toolbarComponents } from './fixtures/toolbar-components.mjs';
function find(root,match){if(!root||typeof root!=='object')return [];if(Array.isArray(root))return root.flatMap(n=>find(n,match));return [...(match(root)?[root]:[]),...find(root.props?.children,match)];}
function one(tree,match){const nodes=find(tree,match);assert.equal(nodes.length,1);return nodes[0];}
const text=n=>find(n,c=>typeof c.props?.children==='string').map(c=>c.props.children).join(' ')+' '+(Array.isArray(n.props?.children)?n.props.children.filter(c=>typeof c==='string').join(' '):'');
const w={content_id:'test-content',editorial_revision:3,version:7,status:'draft',live_release_id:null};
async function harness(){
 const slots=[];let cursor=0,effects=[];
 const react={useId:()=> 'toolbar-test',useState:value=>{const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],next=>{slots[i]=next;}];},useRef:value=>{const i=cursor++;return slots[i]??={current:value};},useEffect:fn=>{effects.push(fn);}};
 const fetcher={state:'idle',data:undefined,Form:'fetcher-form'};
 const {EditorToolbar}=await toolbarComponents(react,{useFetcher:()=>fetcher});
 const props={workflow:w,csrf:'test-csrf',title:'TEST ONLY saved title',kind:'announcement',role:'Owner',formId:'editor-form'};
 return {fetcher,render:(extra={})=>{cursor=0;effects=[];return EditorToolbar({...props,...extra});},effects:()=>effects};
}
test('toolbar confirmation identifies revision, traps focus, cancels safely and submits only once',async()=>{
 const h=await harness();let tree=h.render();const publish=one(tree,n=>n.type==='button'&&text(n).includes('Approve & Publish'));let restored=0;publish.props.onClick({currentTarget:{focus(){restored++;}}});tree=h.render();
 const dialog=one(tree,n=>n.type==='dialog');assert.ok(dialog.props['aria-labelledby']);assert.ok(dialog.props['aria-describedby']);assert.ok(text(dialog).includes('revision 3'));assert.ok(text(dialog).includes('publicly now'));
 let shown=0,closed=0,cancelFocus=0;dialog.props.ref.current={open:false,showModal(){this.open=true;shown++;},close(){this.open=false;closed++;}};
 const cancel=one(dialog,n=>n.type==='button'&&n.props.children==='Cancel');cancel.props.ref.current={focus(){cancelFocus++;}};h.effects()[0]();assert.equal(shown,1);assert.equal(cancelFocus,1);cancel.props.onClick();assert.equal(closed,1);dialog.props.onClose();assert.equal(restored,1);assert.equal(find(h.render(),n=>n.type==='dialog').length,0);
 tree=h.render();one(tree,n=>n.type==='button'&&text(n).includes('Approve & Publish')).props.onClick({currentTarget:{focus(){}}});tree=h.render();const form=one(tree,n=>n.type==='fetcher-form');assert.equal(form.props.action,'/control/workflow/test-content');for(const [name,value]of [['intent','approve-publish'],['revision',3],['version',7],['_csrf','test-csrf'],['returnTo','editor']])assert.equal(one(form,n=>n.props?.name===name).props.value,value);
 let prevented=0;form.props.onSubmit({preventDefault(){prevented++;}});form.props.onSubmit({preventDefault(){prevented++;}});assert.equal(prevented,1);const pending=h.render();one(pending,n=>n.type==='dialog').props.onCancel({preventDefault(){prevented++;}});assert.equal(prevented,2);
 h.fetcher.data={status:409,message:'TEST ONLY conflict'};tree=h.render();h.effects()[1]();tree=h.render();assert.ok(find(tree,n=>n.type==='button'&&text(n).includes('Approve & Publish')).every(n=>n.props.disabled));
});
test('unsaved edits block submission and publishing while Save stays available',async()=>{
 const h=await harness();const tree=h.render({dirty:true});assert.equal(one(tree,n=>n.type==='button'&&n.props.form==='editor-form').props.disabled,false);
 for(const label of ['Approve & Publish','Schedule Publish'])assert.equal(one(tree,n=>n.type==='button'&&text(n).includes(label)).props.disabled,true);
 const moderator=h.render({role:'Moderator',dirty:true});assert.equal(one(moderator,n=>n.type==='button'&&text(n).includes('Submit for Review')).props.disabled,true);assert.equal(find(moderator,n=>n.type==='button'&&text(n).includes('Approve & Publish')).length,0);
});
