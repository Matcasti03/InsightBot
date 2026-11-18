import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildCapsule} from './model.mjs';
import {PRODUCTS} from './products.mjs';
const host=document.querySelector('#scene'),status=document.querySelector('#status');
try{
const touchDevice=matchMedia('(pointer: coarse)').matches;
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,touchDevice?1.5:2));renderer.setClearColor(0x000000,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.prepend(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.1,100);camera.position.set(7,5.3,8.4);
const env=new T.PMREMGenerator(renderer);const room=new RoomEnvironment();scene.environment=env.fromScene(room,.04).texture;room.dispose();env.dispose();
scene.add(new T.HemisphereLight(0xe4ffff,0x35465c,2));for(const [x,y,z,power] of [[4,7,5,100],[-4,2,-3,70]]){const l=new T.PointLight(0xbcefff,power);l.position.set(x,y,z);scene.add(l)}
const model=buildCapsule();scene.add(model.root);model.root.rotation.z=-.35;
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=18;controls.enablePan=false;controls.autoRotate=!touchDevice&&!matchMedia('(prefers-reduced-motion: reduce)').matches;controls.autoRotateSpeed=.65;document.querySelector('#rotate').checked=controls.autoRotate;
const bounds=new T.Box3(),sphere=new T.Sphere();let fittedDistance=0;
function fitCamera(reset=false){
 model.root.updateMatrixWorld(true);bounds.setFromObject(model.root);bounds.getBoundingSphere(sphere);
 const vertical=T.MathUtils.degToRad(camera.fov)/2;const horizontal=Math.atan(Math.tan(vertical)*camera.aspect);
 const distance=sphere.radius/Math.sin(Math.min(vertical,horizontal))*1.12;
 const direction=camera.position.clone().sub(controls.target).normalize();
 const zoom=fittedDistance&&!reset?T.MathUtils.clamp(camera.position.distanceTo(controls.target)/fittedDistance,.7,2):1;
 controls.target.copy(sphere.center);camera.position.copy(sphere.center).addScaledVector(direction,distance*zoom);
 controls.minDistance=distance*.65;controls.maxDistance=distance*2.5;fittedDistance=distance;controls.update();
}

const state={explode:0,transparent:false,extension:0,opening:.55,lights:true};
function refresh(){model.update(state);const visible=state.explode>.05||state.transparent;document.querySelector('#part-markers').hidden=!visible;document.querySelector('#open-products').hidden=!visible;if(fittedDistance)fitCamera();document.querySelector('#ext-value').textContent=Math.round(state.extension*100)+'%';document.querySelector('#open-value').textContent=Math.round(state.opening*100)+'%';document.querySelector('#explode-value').textContent=Math.round(state.explode*100)+'%';}
for(const [id,key] of [['explode','explode'],['extension','extension'],['opening','opening']])document.querySelector('#'+id).addEventListener('input',e=>{state[key]=+e.target.value/100;refresh()});
document.querySelector('#xray').onchange=e=>{state.transparent=e.target.checked;refresh()};document.querySelector('#lights').onchange=e=>{state.lights=e.target.checked;refresh()};document.querySelector('#rotate').onchange=e=>controls.autoRotate=e.target.checked;
document.querySelector('#reset').onclick=()=>{Object.assign(state,{explode:0,transparent:false,extension:0,opening:.55,lights:true});for(const id of ['explode','extension'])document.querySelector('#'+id).value=0;document.querySelector('#opening').value=55;document.querySelector('#xray').checked=false;document.querySelector('#lights').checked=true;camera.position.set(7,5.3,8.4);controls.target.set(0,0,0);fittedDistance=0;refresh();fitCamera(true)};
const markers=[];
function selectProduct(product){
 document.querySelectorAll('[data-product]').forEach(b=>b.classList.toggle('selected',b.dataset.product===product.id));
 document.querySelector('#detail-title').textContent=product.role+' — '+product.name;
 document.querySelector('#product-status').textContent=product.status;
 document.querySelector('#detail').textContent=product.spec+' '+product.reason;
 document.querySelector('#product-pending').textContent=product.pending;
 const source=document.querySelector('#product-source');source.hidden=!product.url;
 if(product.url)source.href=product.url;else source.removeAttribute('href');
 document.querySelector('#product-origin').textContent='Fonte: '+product.source;
 if(state.explode<=.05){state.explode=.75;document.querySelector('#explode').value=75;}
 if(product.id==='gripper'){state.extension=.85;document.querySelector('#extension').value=85;}
 controls.autoRotate=false;document.querySelector('#rotate').checked=false;refresh();
}
for(const product of PRODUCTS){
 for(const target of ['catalog','product-strip','part-markers']){
  const button=document.createElement('button');button.type='button';button.dataset.product=product.id;
  button.title=product.role+' — '+product.name;button.setAttribute('aria-label',button.title);
  if(target==='part-markers'){
   button.className='part-marker';button.textContent=product.number;markers.push({button,product});
  }else{
   button.textContent=product.number+' · '+(target==='catalog'?product.name:product.short);
   if(target==='catalog'){button.className='catalog-button';button.dataset.part=product.id;const role=document.createElement('small');role.textContent=product.role;button.append(role);}
  }
  button.onclick=()=>selectProduct(product);document.getElementById(target).append(button);
 }
}
const anchor=new T.Vector3();
function updateMarkers(){
 if(document.querySelector('#part-markers').hidden)return;
 const placed=[],width=host.clientWidth,height=host.clientHeight;
 for(const {button,product} of markers){
  anchor.fromArray(product.anchor);model.parts[product.part].localToWorld(anchor);anchor.project(camera);
  button.hidden=anchor.z<-1||anchor.z>1;
  let x=T.MathUtils.clamp((anchor.x+1)*width/2,16,width-16),y=T.MathUtils.clamp((1-anchor.y)*height/2,16,height-16);
  for(let i=0;i<12&&placed.some(p=>Math.hypot(p.x-x,p.y-y)<30);i++){x=T.MathUtils.clamp(x+28,16,width-16);if(i>5)y=T.MathUtils.clamp(y+30,16,height-16);}
  placed.push({x,y});button.style.left=x+'px';button.style.top=y+'px';
 }
}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
document.querySelector('#png').onclick=()=>{renderer.render(scene,camera);renderer.domElement.toBlob(b=>download(b,'InSightBot-capsula-3D.png'))};
document.querySelector('#glb').onclick=async()=>{const b=document.querySelector('#glb');b.disabled=true;try{model.root.updateMatrixWorld(true);const buffer=await new GLTFExporter().parseAsync(model.root,{binary:true});download(new Blob([buffer],{type:'model/gltf-binary'}),'InSightBot-capsula-conceitual.glb')}catch(e){status.textContent='Não foi possível exportar: '+e.message}finally{b.disabled=false}};
function resize(){const {width,height}=host.getBoundingClientRect();if(width<1||height<1)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();fitCamera();}
new ResizeObserver(resize).observe(host);
let lost=false;renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;status.textContent='O 3D foi pausado pelo navegador. Aguardando recuperação…'});
renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;resize();status.textContent=touchDevice?'Um dedo gira · dois dedos ampliam':'Arraste para girar · role para ampliar'});
refresh();resize();let last=0;const clock=new T.Clock();renderer.setAnimationLoop(time=>{if(lost||document.hidden)return;if(touchDevice&&time-last<32)return;last=time;controls.update(Math.min(clock.getDelta(),.1));renderer.render(scene,camera);updateMarkers()});
status.textContent=touchDevice?'Um dedo gira · dois dedos ampliam':'Arraste para girar · role para ampliar';window.capsuleViewer={model,state,renderer,scene,camera,controls,fitCamera};
}catch(e){status.textContent='O navegador não conseguiu iniciar o 3D. Abra este arquivo no Chrome ou Safari com WebGL ativado.';console.error(e)}
