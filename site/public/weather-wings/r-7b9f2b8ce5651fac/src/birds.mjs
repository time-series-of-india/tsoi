// Art and visual timing are independent of lift, gravity and collision rules.
const sequence=Object.freeze([2,3,4,5,6,7,0,1]);
const newBird=(id,name,options)=>Object.freeze({id,name,atlas:`../assets/bird/${id}-wash-8.png`,poseCount:8,glidePose:2,sequence,followFlap:false,desktopWidth:68,mobileWidth:52,bodyScale:1,...options});
export const BIRDS=Object.freeze({
 'common-myna':Object.freeze({id:'common-myna',name:'Common myna',atlas:'../assets/bird/common-myna-wash-8.png',poseCount:8,glidePose:2,sequence,wingSeconds:.62,followFlap:false,desktopWidth:68,mobileWidth:52,bodyScale:1}),
 'wire-tailed-swallow':Object.freeze({id:'wire-tailed-swallow',name:'Wire-tailed swallow',atlas:'../assets/bird/wire-tailed-swallow-wash-8.png',poseCount:8,glidePose:2,sequence,wingSeconds:.50,followFlap:false,desktopWidth:68,mobileWidth:52,bodyScale:.68}),
 'alexandrine-parakeet':newBird('alexandrine-parakeet','Alexandrine parakeet',{wingSeconds:.56,bodyScale:.78}),
 'indian-roller':newBird('indian-roller','Indian roller',{wingSeconds:.72,beatWeights:Object.freeze([1,1,1,1.2,1.2,1.4,1.2,1])}),
 'white-throated-kingfisher':newBird('white-throated-kingfisher','White-throated kingfisher',{wingSeconds:.36}),
 'purple-rumped-sunbird':newBird('purple-rumped-sunbird','Purple-rumped sunbird',{wingSeconds:.24,bodyScale:1.06,continuousWings:true}),
});
export const CITY_BIRDS=Object.freeze({mumbai:'wire-tailed-swallow',delhi:'alexandrine-parakeet',bengaluru:'indian-roller',kolkata:'white-throated-kingfisher',chennai:'purple-rumped-sunbird'});
export function defaultBirdForCity(city){return Object.hasOwn(CITY_BIRDS,city)?CITY_BIRDS[city]:'wire-tailed-swallow';}
export const BIRD_LABELS=Object.freeze({
 'wire-tailed-swallow':Object.freeze({native:'तारवाली भिंगरी',roman:'Tarwali Bhingri',lang:'mr',color:'#284970'}),
 'alexandrine-parakeet':Object.freeze({native:'पहाड़ी तोता',roman:'Pahari Tota',lang:'hi',color:'#507548'}),
 'indian-roller':Object.freeze({native:'ನೀಲಕಂಠ',roman:'Neelakantha',lang:'kn',color:'#276797'}),
 'white-throated-kingfisher':Object.freeze({native:'সাদা গলা মাছরাঙ্গা',roman:'Sada-gola Machhranga',lang:'bn',color:'#a8442e'}),
 'purple-rumped-sunbird':Object.freeze({native:'ஊர்த் தேன்சிட்டு',roman:'Oor Thenchittu',lang:'ta',color:'#74437b'}),
 'common-myna':Object.freeze({native:'मैना',roman:'Maina',lang:'hi',color:'#806048'}),
});
export function getBirdProfile(id){return Object.hasOwn(BIRDS,id)?BIRDS[id]:BIRDS['wire-tailed-swallow'];}
export function birdWidth(bird,width,height){
 const shortSide=Math.min(width,height);
 // The short edge keeps the same scale when a phone rotates.
 return shortSide<=600?Math.min(bird.mobileWidth,Math.max(44,shortSide*.132)):bird.desktopWidth;
}
export function advanceBirdAnimation(bird,clock,flapTime,dt){
 if(bird.followFlap)return flapTime;
 // Tiny sunbirds keep a flutter between taps. This changes only the drawing.
 if(bird.continuousWings)return (Math.max(0,clock)+dt)%bird.wingSeconds;
 if(clock<0&&flapTime>=0)clock=0;
 if(clock<0)return -1;
 clock+=dt;
 return clock>=bird.wingSeconds?(flapTime>=0?clock%bird.wingSeconds:-1):clock;
}
export function sampleBirdPose(bird,clock){
 if(clock<0)return {a:bird.glidePose,b:bird.glidePose,mix:0};
 const phase=(clock%bird.wingSeconds)/bird.wingSeconds;
 let index,fraction;
 if(bird.beatWeights){
  const total=bird.beatWeights.reduce((sum,weight)=>sum+weight,0);let remaining=phase*total;index=0;
  while(index<bird.beatWeights.length-1&&remaining>=bird.beatWeights[index])remaining-=bird.beatWeights[index++];
  fraction=remaining/bird.beatWeights[index];
 }else{const f=phase*bird.sequence.length;index=Math.floor(f);fraction=f-index;}
 return {a:bird.sequence[index],b:bird.sequence[(index+1)%bird.sequence.length],mix:fraction*fraction*(3-2*fraction)};
}
