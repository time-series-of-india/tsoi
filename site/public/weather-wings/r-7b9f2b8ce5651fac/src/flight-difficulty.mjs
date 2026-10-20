// Hard is anchored to the user's October 4 Mac and portrait-phone flights.
// Landscape inherits the phone profile; monitor clearance keeps the prior 7:9
// monitor-to-laptop relationship. Those two layouts are derived, not playtested.
// Heights are measured playfields, excluding the input gutter.
export const HARD_REFERENCES=Object.freeze({
 portrait:{width:411,height:743,birdWidth:41.6,speed:3.1,spacing:2.675,opening:.55},
 landscape:{width:853,height:295,birdWidth:35.2,speed:3.1,spacing:2.675,opening:.55},
 laptop:{width:1470,height:785,birdWidth:54.4,speed:2.95,spacing:2.275,opening:.65},
 monitor:{width:2560,height:1358,birdWidth:54.4,speed:2.95,spacing:2.275,opening:.65*7/9},
});
export const MEDIUM_REFERENCES=Object.freeze(Object.fromEntries(Object.entries(HARD_REFERENCES).map(([name,ref])=>
 [name,{...ref,speed:ref.speed/1.1,spacing:ref.spacing/1.1,opening:ref.opening/.9}])));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
export function hardFlightSettings({width,height,birdWidth,shortSide=Math.min(width,height)}){
 const w=Number.isFinite(width)&&width>0?width:393,h=Number.isFinite(height)&&height>0?height:822;
 const size=Number.isFinite(birdWidth)&&birdWidth>0?birdWidth:(Math.min(w,h)<=600?41.6:54.4);
 const mobile=w>h?HARD_REFERENCES.landscape:HARD_REFERENCES.portrait;
 // Preserve opening-to-body clearance near each phone reference, with bounded scaling.
 const phoneOpening=mobile.opening*clamp((mobile.height/h)*(size/mobile.birdWidth),.85,1.15);
 const {laptop,monitor}=HARD_REFERENCES;
 const effectiveHeight=h*laptop.birdWidth/size;
 const desktopBlend=clamp((effectiveHeight-laptop.height)/(monitor.height-laptop.height),0,1);
 const desktopOpening=mix(laptop.opening,monitor.opening,desktopBlend);
 // Blend tablet and small-window sizes rather than abruptly changing the preset.
 const desktopWeight=clamp(((Number.isFinite(shortSide)?shortSide:Math.min(w,h))-600)/160,0,1);
 return {speed:mix(mobile.speed,laptop.speed,desktopWeight),spacing:mix(mobile.spacing,laptop.spacing,desktopWeight),opening:mix(phoneOpening,desktopOpening,desktopWeight)};
}

const LEGACY_DIFFICULTIES=Object.freeze({
 easy:{label:'Easy',description:'Wider openings and more time to recover.',speed:.8,spacing:1,opening:1.25},
 medium:{label:'Medium',description:'Balanced flight, adjusted for your screen when you start.',speed:1,spacing:1,opening:1},
 hard:{label:'Hard',description:'Faster flight and tighter openings. Plan each climb.',speed:1.1,spacing:1.1,opening:.9},
});
export const RAINFALL_DEFAULTS=Object.freeze({speed:1.5,spacing:1.425,opening:.7,flap:1,gravity:1});
export const RAINFALL_PORTRAIT_DEFAULTS=Object.freeze({speed:1.4,spacing:1.5,opening:.7,flap:1,gravity:1});
export function isPortraitPhone({width,height}={}){return width>0&&width<=600&&height>width}
export const FLIGHT_DIFFICULTIES=Object.freeze({default:{label:'Default',description:'A gentle flight.',...RAINFALL_DEFAULTS}});
export function isFlightPreset(mode){return Object.hasOwn(FLIGHT_DIFFICULTIES,mode)}
export function mediumFlightSettings(viewport){
 const hard=hardFlightSettings(viewport);
 return {speed:hard.speed/1.1,spacing:hard.spacing/1.1,opening:hard.opening/.9};
}
export function presetFlightSettings(mode,viewport){
 if(mode==='hard')return hardFlightSettings(viewport);
 if(isFlightPreset(mode)||!Object.hasOwn(LEGACY_DIFFICULTIES,mode))return {...(isPortraitPhone(viewport)?RAINFALL_PORTRAIT_DEFAULTS:RAINFALL_DEFAULTS)};
 const base=mediumFlightSettings(viewport),scale=FLIGHT_DIFFICULTIES[mode]||LEGACY_DIFFICULTIES[mode]||FLIGHT_DIFFICULTIES.default;
 // Hard keeps Medium's uniform month cadence: faster travel gets proportionally more spacing.
 return {speed:base.speed*scale.speed,spacing:base.spacing*scale.spacing,opening:base.opening*scale.opening};
}
