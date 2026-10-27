import assert from 'node:assert/strict';
import {test} from 'node:test';
import {toolbarComponents} from './fixtures/toolbar-components.mjs';
function find(root,predicate){if(!root||typeof root!=='object')return [];if(Array.isArray(root))return root.flatMap(n=>find(n,predicate));return [...(predicate(root)?[root]:[]),...find(root.props?.children,predicate)];}
function one(root,predicate){const nodes=find(root,predicate);assert.equal(nodes.length,1);return nodes[0];}
const asset={assetId:'11111111-1111-1111-1111-111111111111',version:5,grantId:'test-grant',title:'TEST image',alt:'TEST alt',creator:'TEST Artist',source:'',width:2,height:1,thumbnail:'/control/media/test/preview',eligible:true,reasons:[]};
const prepared={id:'22222222-2222-2222-2222-222222222222',assetId:asset.assetId,alt:asset.alt,creator:asset.creator,source:'',anonymous:false,available:true,width:2,height:1,cardWidth:2,cardHeight:1,src:asset.thumbnail,cardSrc:asset.thumbnail};
async function harness(){
 const slots=[];let cursor=0,fetchCursor=0,effects=[],value='',changes=[],loads=[],submissions=[];
 const react={useId:()=> 'test-picker',useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],next=>slots[i]=next];},useRef:initial=>{const i=cursor++;return slots[i]??={current:initial};},useEffect:effect=>effects.push(effect)};
 const list={state:'idle',data:{items:[asset,{...asset,assetId:'unavailable',eligible:false,reasons:['Editorial approval required.']}],more:false,offset:0},load:url=>loads.push(url)};
 const prepare={state:'idle',data:undefined,submit:(fields,options)=>submissions.push({fields,options})};
 const current={state:'idle',data:undefined,load:url=>loads.push(url)};
 const {imports}=await toolbarComponents(react,{useFetcher:()=>[list,prepare,current][fetchCursor++]});
 const Component=imports['./featured-image-field'].FeaturedImageField;
 return {list,prepare,current,loads,submissions,changes,effects:()=>effects,render(extra={}){cursor=0;fetchCursor=0;effects=[];return Component({value,csrf:'TEST csrf',onChange:id=>{value=id;changes.push(id);},...extra});}};
}
test('picker selection is explicit, eligible-only, CSRF-protected and restores focus',async()=>{
 const h=await harness();let tree=h.render();let restored=0;
 const trigger=one(tree,n=>n.type==='button'&&n.props.children==='Choose from Library');trigger.props.ref.current={focus(){restored++;}};
 trigger.props.onClick();tree=h.render();assert.match(h.loads[0],/^\/control\/media\/picker\?/);
 const dialog=one(tree,n=>n.type==='dialog');assert.ok(dialog.props['aria-labelledby']);
 const options=find(tree,n=>n.props?.className==='media-picker-option');assert.equal(options.length,2);assert.equal(options[1].props['aria-disabled'],true);
 options[1].props.onClick();tree=h.render();assert.equal(one(tree,n=>n.type==='button'&&n.props.children==='Select image').props.disabled,true);
 options[0].props.onClick();tree=h.render();const select=one(tree,n=>n.type==='button'&&n.props.children==='Select image');assert.equal(select.props.disabled,false);select.props.onClick();
 assert.deepEqual({...h.submissions[0].fields},{_csrf:'TEST csrf',assetId:asset.assetId,version:'5',grantId:asset.grantId});assert.equal(h.submissions[0].options.method,'post');assert.equal(h.changes.length,0,'Preparation must finish before selection');
 h.prepare.data={image:prepared};tree=h.render();h.effects()[3]();assert.deepEqual(h.changes,[prepared.id]);
 dialog.props.onClose();assert.equal(restored,1);
 tree=h.render();one(tree,n=>n.type==='button'&&n.props.children==='Remove image').props.onClick();assert.deepEqual(h.changes,[prepared.id,'']);assert.equal(restored,2);
});
test('cancel ignores late preparation and errors preserve selected editor input',async()=>{
 const h=await harness();let tree=h.render({value:'existing-image'});
 one(tree,n=>n.type==='button'&&n.props.children==='Choose from Library').props.onClick();tree=h.render({value:'existing-image'});
 one(tree,n=>n.props?.className==='media-picker-option'&&n.props['aria-disabled']===false).props.onClick();tree=h.render({value:'existing-image'});
 one(tree,n=>n.type==='button'&&n.props.children==='Select image').props.onClick();
 one(tree,n=>n.type==='button'&&n.props.children==='Cancel').props.onClick();h.prepare.data={image:prepared};h.render({value:'existing-image'});h.effects()[3]();assert.equal(h.changes.length,0);
 tree=h.render({value:'existing-image'});assert.equal(one(tree,n=>n.props?.name==='featuredImageId').props.value,'existing-image');
});
