import {loadImage} from './asset-loader.mjs';
import {getBirdProfile} from './birds.mjs';
import {PREPARED_ART} from './prepared-art.mjs';

export function flightArtworkSources(city,bird){
 const scenery=PREPARED_ART.cities[city],poses=PREPARED_ART.birds[getBirdProfile(bird).id];
 return [...new Set([...scenery.plates,...(scenery.sky?[scenery.sky,scenery.water]:[]),...poses.map(p=>p.src)])];
}
export function watchFlightArtwork(city,bird,onProgress){return loadImage.subscribe(flightArtworkSources(city,bird),onProgress)}

// The last step is renderer readiness. A decoded image alone cannot enable Play.
export function loadingPercent({loaded,total},ready=false){return ready?100:total?Math.min(99,Math.floor(100*loaded/total)):0}
export function renderLoadingProgress(root,{loaded=0,total=0,ready=false,label,error=''}){
 root.hidden=ready;
 const text=root.querySelector('.loading-label'),meter=root.querySelector('.loading-meter');
 const message=error||label;if(text.textContent!==message)text.textContent=message;
 meter.hidden=Boolean(error);
 meter.setAttribute('aria-label',label);
 const percent=loadingPercent({loaded,total},ready);
 if(total||ready)meter.setAttribute('aria-valuenow',String(percent));else meter.removeAttribute('aria-valuenow');
 root.querySelector('.loading-fill').style.transform=`scaleX(${percent/100})`;
}
