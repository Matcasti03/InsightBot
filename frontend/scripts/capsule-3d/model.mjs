import * as T from 'three';
import { PRODUCTS } from './products.mjs';
export function buildCapsule(){
 const root=new T.Group();root.name='InSightBot_Concept';
 const mat=(color,metalness=.2,roughness=.3)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const shellmat=mat('#dce8ef',.68,.22),steel=mat('#96aebf',.9,.2),dark=mat('#102c40',.7,.25),teal=mat('#16c6cb',.65,.22),pcb=mat('#0b6859',.3,.4),gold=mat('#d3b36d',.75,.3);
 const lens=new T.MeshPhysicalMaterial({color:'#087da8',metalness:.5,roughness:.1,clearcoat:1,emissive:'#07426c',emissiveIntensity:.65});
 const led=new T.MeshStandardMaterial({color:'#e6ffff',emissive:'#6cffff',emissiveIntensity:2});
 function mesh(geo,material,parent,name,pos=[0,0,0]){let m=new T.Mesh(geo,material);m.name=name;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function cyl(r,h,material,parent,name,pos){return mesh(new T.CylinderGeometry(r,r,h,64),material,parent,name,pos)}
 function ring(r,t,material,parent,name,y){let m=mesh(new T.TorusGeometry(r,t,14,80),material,parent,name,[0,y,0]);m.rotation.x=Math.PI/2;return m}
 const shell=[];
 for(let i=0;i<2;i++){
  const g=new T.Group();g.name=i?'Carcaca_esquerda':'Carcaca_direita';root.add(g);shell.push(g);
  mesh(new T.CylinderGeometry(1,1,3.2,64,1,true,i*Math.PI,Math.PI),shellmat,g,'Carcaca');
  mesh(new T.SphereGeometry(1,64,32,i*Math.PI,Math.PI,0,Math.PI/2),shellmat,g,'Domo_frontal',[0,1.6,0]);
  mesh(new T.SphereGeometry(1,64,32,i*Math.PI,Math.PI,Math.PI/2,Math.PI/2),shellmat,g,'Domo_traseiro',[0,-1.6,0]);
 }
 const core=new T.Group();core.name='Componentes_internos';root.add(core);
 const energy=new T.Group();energy.name='Modulo_energia_ilustrativo';core.add(energy);cyl(.72,1.15,gold,energy,'Energia',[0,-.95,0]);ring(.73,.035,dark,energy,'Isolamento',-1.48);ring(.73,.035,dark,energy,'Isolamento',-.4);
 const electronics=new T.Group();electronics.name='Eletronica_ilustrativa';core.add(electronics);
 mesh(new T.BoxGeometry(1.2,.13,1.2),pcb,electronics,'Placa',[0,.12,0]);
 for(const [x,z] of [[-.28,-.28],[.3,-.25],[0,.28]]){mesh(new T.BoxGeometry(.34,.13,.3),dark,electronics,'Circuito',[x,.25,z]);for(let k=0;k<4;k++)mesh(new T.BoxGeometry(.025,.05,.06),gold,electronics,'Contato',[x-.12+k*.08,.23,z+.18]);}
 const magnetic=new T.Group();magnetic.name='Modulo_magnetico_ilustrativo';core.add(magnetic);ring(.64,.15,mat('#dd6478',.55,.3),magnetic,'Polo_representado',.7);ring(.64,.15,teal,magnetic,'Polo_representado',1.0);
 const camera=new T.Group();camera.name='Camera_e_iluminacao';root.add(camera);
 cyl(.58,.18,dark,camera,'Base_optica',[0,2.43,0]);cyl(.28,.12,steel,camera,'Anel_lente',[0,2.56,0]);cyl(.22,.025,lens,camera,'Lente',[0,2.63,0]);
 for(let i=0;i<6;i++){let a=i*Math.PI/3;cyl(.075,.06,led,camera,'LED',[.42*Math.cos(a),2.55,.42*Math.sin(a)]);}
 const rear=new T.Group();rear.name='Comunicacao_ilustrativa';root.add(rear);cyl(.4,.05,teal,rear,'Tampa_traseira',[0,-2.57,0]);
 for(let i=0;i<3;i++)ring(.33+i*.13,.018,gold,core,'Antena_ilustrativa',-1.77-i*.12);
 const seam1=ring(1.007,.025,teal,root,'Junta_superior',1.58),seam2=ring(1.007,.025,teal,root,'Junta_inferior',-1.58);
 const gripper=new T.Group();gripper.name='Microgarra_conceitual';root.add(gripper);gripper.position.set(.67,2.15,0);
 cyl(.12,.18,dark,gripper,'Porta_microgarra',[0,0,0]);
 const shaft=cyl(.045,1,steel,gripper,'Haste',[0,.5,0]);
 const wrist=new T.Group();gripper.add(wrist);const jawL=new T.Group(),jawR=new T.Group();wrist.add(jawL,jawR);
 for(const [jaw,sign] of [[jawL,1],[jawR,-1]]){
  const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(.13*sign,.15,0),new T.Vector3(.15*sign,.34,0),new T.Vector3(.035*sign,.45,0)]);
  mesh(new T.TubeGeometry(curve,24,.028,10,false),steel,jaw,'Mandibula');
 }
 const storage=new T.Group();storage.name='Reservatorio_amostra_conceitual';storage.position.set(.52,1.48,.18);core.add(storage);
 const reservoirMaterial=new T.MeshPhysicalMaterial({color:'#a8edec',transparent:true,opacity:.5,roughness:.15,metalness:.1,side:T.DoubleSide});
 cyl(.21,.62,reservoirMaterial,storage,'Compartimento_amostra');cyl(.22,.07,teal,storage,'Tampa_reservatorio',[0,.345,0]);
 const parts={shell,camera,energy,electronics,magnetic,gripper,rear,storage};
 root.userData={status:'Concept only; candidate components, not a validated assembly',scale:'Illustrative, not dimensionally verified'};
 for(const product of PRODUCTS){const g=parts[product.part];g.userData.products??=[];g.userData.products.push({name:product.name,status:product.status,source:product.url});}

 function update({explode=0,transparent=false,extension=0,opening=.55,lights=true}){
  shell.forEach((g,i)=>{g.position.x=(i?-1:1)*explode*1.9;});
  shellmat.transparent=transparent;shellmat.opacity=transparent?.17:1;shellmat.depthWrite=!transparent;shellmat.side=T.DoubleSide;
  camera.position.y=explode*.7;rear.position.y=-explode*.6;energy.position.y=-explode*.25;magnetic.position.y=explode*.25;storage.position.x=.52+explode*.55;
  seam1.visible=seam2.visible=explode<.05;
  const len=.06+extension*1.1;shaft.scale.y=len;shaft.position.y=len/2;wrist.position.y=len;wrist.scale.setScalar(extension>.02?1:0.01);
  jawL.rotation.z=-opening*.65;jawR.rotation.z=opening*.65;
  led.emissiveIntensity=lights?2.5:0;led.color.set(lights?'#dfffff':'#657482');
 }
 update({});return {root,parts,update};
}
