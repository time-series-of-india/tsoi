export const DEFAULT_CITY='mumbai';
export const CLIMATE_CITIES=Object.freeze({
 mumbai:{id:'mumbai',name:'Mumbai',station:'Colaba',data:'tower-study-data.json',surface:'sea'},
 bengaluru:{id:'bengaluru',name:'Bengaluru',station:'Bengaluru',data:'bengaluru-climate-data.json',surface:'ground'},
 delhi:{id:'delhi',name:'Delhi',station:'Safdarjung',data:'delhi-climate-data.json',surface:'ground'},
 kolkata:{id:'kolkata',name:'Kolkata',station:'Alipore',data:'kolkata-climate-data.json',surface:'river'},
 chennai:{id:'chennai',name:'Chennai',station:'Nungambakkam',data:'chennai-climate-data.json',surface:'sea'},
});
export function climateCity(id){if(id==='bangalore')id='bengaluru';return Object.hasOwn(CLIMATE_CITIES,id)?CLIMATE_CITIES[id]:CLIMATE_CITIES[DEFAULT_CITY]}
export function cityUrl(href,id){const url=new URL(href);url.searchParams.set('city',climateCity(id).id);url.searchParams.set('theme','paper');return url.href}
export function mountCityChoices(city,onFocus=()=>{}){
 document.title=`${city.name} · Rainfall flight`;
 document.querySelector('#stage').setAttribute('aria-label',`${city.name} rainfall flight`);
 document.body.dataset.city=city.id;
 for(const [target,id] of [['.rainfall-ui','flight-city'],['.flight-retry','retry-city']]){
  const label=document.createElement('label');label.className='city-choice';label.htmlFor=id;
  label.append(document.createTextNode('City '));
  const select=document.createElement('select');select.id=id;
  for(const item of Object.values(CLIMATE_CITIES)){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.append(option)}
  select.value=city.id;select.onfocus=onFocus;select.onchange=()=>location.assign(cityUrl(location.href,select.value));
  label.append(select);
  const parent=document.querySelector(target);if(target==='.rainfall-ui')parent.prepend(label);else parent.append(label);
 }
}
