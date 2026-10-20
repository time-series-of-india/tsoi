import {CLIMATE_CITIES} from './climate-cities.mjs';
import {CITY_PREVIEWS} from './art-sources.mjs';
import {PREPARED_ART} from './prepared-art.mjs';
import {cityClimate} from './city-climate.mjs';
import {temperatureChartSvg} from './temperature-chart.mjs';
import {rainfallChartSvg} from './rainfall-chart.mjs';

// The chooser and completion card share the same paintings and rainfall scale.
export function cityCardsMarkup(){
 return Object.values(CLIMATE_CITIES).map(city=>`<button type="button" class="city-card" data-city="${city.id}" aria-pressed="false"><span class="city-card-painting"></span><span class="city-card-body"><span class="city-card-name">${city.name}</span><span class="city-card-signature"></span><small></small></span></button>`).join('');
}
export function prepareCityCards(container,prefix,metric='rainfall'){
 for(const tile of container.querySelectorAll('[data-city]')){
  if(tile.dataset.prepared===metric)continue;tile.dataset.prepared=metric;
  tile.querySelector('.city-card-painting').replaceChildren();
  const city=CLIMATE_CITIES[tile.dataset.city],preview=CITY_PREVIEWS[city.id];
  const image=document.createElement('img');image.src=PREPARED_ART.previews[city.id];image.alt=preview.place;image.decoding='async';image.style.objectPosition=preview.position;
  image.onerror=()=>{image.remove();tile.querySelector('.city-card-painting').textContent='Scenery unavailable'};
  tile.querySelector('.city-card-painting').append(image);
  const signature=tile.querySelector('.city-card-signature');signature.textContent='Loading '+(metric==='temperature'?'temperatures':'rainfall')+'…';
  cityClimate(city).then(climate=>{if(tile.dataset.prepared!==metric)return;signature.innerHTML=metric==='temperature'?temperatureChartSvg(climate,{showLabels:false}):rainfallChartSvg(climate.rain,climate.station,climate.baseline,{prefix:prefix+'-'+city.id,showLabels:false,showProgress:false})}).catch(()=>{if(tile.dataset.prepared===metric)signature.textContent='Climate data unavailable'});
 }
}
