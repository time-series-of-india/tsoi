const sections=items=>Object.freeze(items.map(([id,name,focus=.5])=>Object.freeze({id,name,focus})));
export const CITY_ROUTES=Object.freeze({
 delhi:{directory:'delhi-paved-route',sceneryScale:.85,shoreline:.81,sceneryHaze:{sky:.19,bank:.16,water:.05},note:'Mehrauli to Old Delhi',join:'opaque-canopy',groundReference:'mehrauli',sections:sections([
  ['mehrauli','Mehrauli / Qutb Minar',.55],['hauz-khas','Hauz Khas'],['lodhi-garden','Lodhi Garden'],['india-gate','India Gate',.55],['connaught-place','Connaught Place'],['old-delhi','Old Delhi / Red Fort',.54]])},
 bengaluru:{directory:'bengaluru-park-route',note:'Around Cubbon Park',aspect:1658/949,join:'opaque-canopy',groundBlend:[.755,.78],sections:sections([
  ['library','Central Library / Seshadri Iyer Memorial Hall'],['bandstand','Cubbon Park Bandstand'],['attara-kacheri','Attara Kacheri / High Court'],['vidhana-soudha','Vidhana Soudha'],['queens-park','Queen’s Park'],['bal-bhavan','Bal Bhavan / Putani Express']])},
 kolkata:{directory:'kolkata-calm-route',sceneryScale:.85,shoreline:.78,sceneryHaze:{sky:.38,bank:.32,water:.10},note:'Prinsep Ghat to Dakshineswar',aspect:1672/941,join:'opaque-canopy',groundBlend:[.79,.82],
  // The first approach reaches 90% of Prinsep; keep the cut beyond its landing.
  joinWindows:{babughat:[.48,.95]},sections:sections([
  ['prinsep','Prinsep Ghat / Vidyasagar Setu',.65],['babughat','Babughat'],['millennium','Millennium Park / Fairlie Ghat',.58],['howrah','Howrah Bridge'],['bagbazar','Bagbazar riverfront'],['dakshineswar','Dakshineswar',.53]])},
 chennai:{directory:'chennai-quality-route',skyReference:'paper/bandra.png',skyBlend:[.44,.54],note:'San Thome to Senate House',aspect:1672/941,join:'opaque-canopy',groundBlend:[.723,.757],weatherHorizon:.763,sections:sections([
  ['santhome','San Thome',.53],['lighthouse','Marina Lighthouse',.53],['vivekananda','Vivekananda House',.53],['presidency','Presidency College',.53],['chepauk','Chepauk Palace',.53],['senate','Senate House',.55]])},
});
export const ROUTE_ASPECT=1659/948,ROUTE_OVERLAP=.18;
export function cityRoute(id){return Object.hasOwn(CITY_ROUTES,id)?CITY_ROUTES[id]:null}
export function routeAssetNames(route){return [...route.sections.map(s=>'paper/'+route.directory+'/'+s.id+'.png'),...(route.skyReference?[route.skyReference]:[])]}
const wrap=(value,length)=>((value%length)+length)%length;
export function routeLayout(height,route){const tileWidth=height*(route.sceneryScale??1)*(route.aspect??ROUTE_ASPECT),stride=tileWidth*(1-ROUTE_OVERLAP);return {tileWidth,stride,overlap:tileWidth*ROUTE_OVERLAP,length:stride*route.sections.length}}
export function visibleRouteSections(width,height,offset,route){
 const {tileWidth,stride}=routeLayout(height,route),tiles=[];
 for(let n=Math.floor(offset/stride+1e-10)-1;n*stride-offset<width-1e-7;n++)tiles.push({index:wrap(n,route.sections.length),x:n*stride-offset,width:tileWidth});
 return tiles;
}
export function routeSectionOffset(width,height,section,route){const {tileWidth,stride}=routeLayout(height,route),index=wrap(Math.floor(section),route.sections.length);return index*stride+tileWidth*route.sections[index].focus-width*.45}

// Keep the bank fixed while moving painted landmarks farther away. The split
// sits in open water, below all shoreline forms and the bank join treatment.
export function routeVerticalFrame(height,route){
 const scale=route.sceneryScale??1,top=height*(route.shoreline??.78)*(1-scale);
 return {scale,top,split:scale===1?1:.82};
}
