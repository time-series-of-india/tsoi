import {getBirdProfile,sampleBirdPose} from './birds.mjs';
import {loadBirdArt,loadImage} from './asset-loader.mjs';
import {CITY_PREVIEWS} from './art-sources.mjs';
import {PREPARED_ART} from './prepared-art.mjs';
export {CITY_PREVIEWS};

export function mountBirdPreview(canvas,id,{animated=false}={}){
 let art,selected=id,frame=0,disposed=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const width=canvas.width||260,height=canvas.height||150,q=canvas.getContext('2d');
 function draw(now=0){
  q.clearRect(0,0,width,height);if(!art)return;
  const phase=(now/1000)%3,pose=sampleBirdPose(art.profile,animated&&!reduced.matches&&phase<art.profile.wingSeconds?phase:-1);
  // Still portraits can fill their space; animated birds reserve the whole wing arc.
  const visiblePoses=animated?art.poses:[art.poses[art.profile.glidePose]];
  const length=Math.max(...visiblePoses.map(p=>p.image.width)),heightMax=Math.max(...visiblePoses.map(p=>p.image.height));
  const scale=Math.min(width*.75/length,height*.82/heightMax);
  function put(index,alpha){const p=art.poses[index];q.globalAlpha=alpha;const x=animated?width*.82-p.beakX*scale:(width-p.image.width*scale)/2,y=animated?height*.5-p.beakY*scale:(height-p.image.height*scale)/2;q.drawImage(p.image,x,y,p.image.width*scale,p.image.height*scale)}
  put(pose.a,1-pose.mix);if(pose.mix)put(pose.b,pose.mix);q.globalAlpha=1;
 }
 function animate(now){if(disposed)return;if(canvas.getClientRects().length>0&&!document.hidden)draw(now);frame=requestAnimationFrame(animate)}
 async function select(next){selected=next;art=null;draw();canvas.setAttribute('aria-label',getBirdProfile(next).name);try{const result=await loadBirdArt(next);if(disposed||selected!==next)return;art=result;canvas.removeAttribute('data-error');draw()}catch{if(selected===next){canvas.dataset.error='true';canvas.setAttribute('aria-label',getBirdProfile(next).name+' · preview unavailable')}}}
 select(id);if(animated)frame=requestAnimationFrame(animate);
 return {select,dispose(){disposed=true;cancelAnimationFrame(frame)}};
}
export function mountSceneryPreview(container){
 let request=0;container.innerHTML='<div class="preview-image-slot"></div><p class="preview-caption"></p><p class="preview-status" role="status"></p>';
 const slot=container.querySelector('.preview-image-slot'),caption=container.querySelector('.preview-caption'),status=container.querySelector('.preview-status');
 return {async select(city){
  const ticket=++request,preset=CITY_PREVIEWS[city.id];status.textContent='Loading '+city.name+'…';caption.textContent=preset.place;
  try{
   const source=await loadImage(PREPARED_ART.previews[city.id],{priority:'high'});if(ticket!==request)return;
   // A canvas copy shares the decoded painting without initiating another request.
   const canvas=document.createElement('canvas');canvas.className='preview-painting';canvas.width=source.width;canvas.height=source.height;
   canvas.setAttribute('role','img');canvas.setAttribute('aria-label',city.name+' watercolour scenery: '+preset.place);
   canvas.style.objectPosition=preset.position;canvas.getContext('2d').drawImage(source,0,0);slot.replaceChildren(canvas);status.textContent='';
  }catch{if(ticket===request)status.textContent='Scenery preview unavailable. You can still select this city.'}
 }};
}
