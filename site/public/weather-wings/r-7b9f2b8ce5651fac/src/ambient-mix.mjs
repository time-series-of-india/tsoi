// Mix levels are artistic choices. Recordings are textures, not city sound surveys.
export const SOUND_BIRDS=['wire-tailed-swallow','common-myna','alexandrine-parakeet','indian-roller','white-throated-kingfisher','purple-rumped-sunbird'];
export const SOUND_BEDS=['air','sea','river','rain'];
export const SOUND_ASSETS=Object.freeze(Object.fromEntries([...SOUND_BEDS,'thunder',...SOUND_BIRDS].map(id=>[id,'assets/audio/'+(id==='sea'?'sea-wash':id)+'.mp3'])));
export const SOUND_FILES=Object.values(SOUND_ASSETS);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
const around=(values,position)=>{const n=values.length,p=((position%n)+n)%n,i=Math.floor(p),f=smooth(p-i);return values[i]*(1-f)+values[(i+1)%n]*f};
export function ambientMix({city='mumbai',section=0,rain=0,phase='menu',opening=10,hidden=false}={},settings=null){
 const wet=clamp(rain/4.6),arrival=phase==='opening'?smooth((opening-(settings?.opening.fadeStart??1.5))/(settings?.opening.fadeDuration??6)):1;
 const scene=['crashed','completed','splash'].includes(phase)?'result':phase;
 const quiet=settings?(settings.scenes[scene]??100)/100:phase==='paused'?.22:scene==='result'?.45:1;
 const calls=!['paused','result','loading'].includes(scene);
 const active=!hidden&&phase!=='loading';
 const place=city==='mumbai'?{sea:around([.20,.44,.39,.30,.24,.32,.23,.16,.13],section),birds:.8}:
 city==='chennai'?{sea:.43,birds:.55}:
 city==='kolkata'?{river:.31,birds:.8}:
 city==='bengaluru'?{birds:1.6}:
 {birds:around([1.05,1.2,1.4,.65,.35,.65],section)};
 const factor=(active?1:0)*quiet,bed=arrival*(1-wet*(settings?.weather.surroundingsReduction??50)/100)*factor;
 // The sea asset is a softened distant wash; route levels sit behind the birds.
 return {air:((city==='mumbai'?.095:.075)+wet*.10)*(phase==='opening'?.2+.8*arrival:1)*factor,sea:(place.sea||0)*bed*(city==='mumbai'?.5:.25),river:(place.river||0)*bed,rain:wet*.55*factor,
 birds:place.birds*arrival*(1-wet*(settings?.weather.backgroundBirdReduction??88)/100)*(active&&calls?quiet:0),selected:arrival*(1-wet*(settings?.weather.selectedBirdReduction??70)/100)*(active&&calls?quiet:0)};
}
export function backgroundBirds(city){return city==='bengaluru'?['common-myna','purple-rumped-sunbird','indian-roller']:city==='delhi'?['common-myna','alexandrine-parakeet']:city==='kolkata'?['common-myna','white-throated-kingfisher']:['common-myna','wire-tailed-swallow','purple-rumped-sunbird']}
