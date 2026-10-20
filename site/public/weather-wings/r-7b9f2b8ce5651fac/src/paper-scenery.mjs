import {createSkyContinuation} from './sky-continuation.mjs';
import {drawPaperWeather} from './paper-weather.mjs';
export const PAPER_SECTIONS=Object.freeze([
 {id:'mangroves',name:'Mangroves',focus:.5},
 {id:'juhu',name:'Juhu',focus:.5},
 {id:'khar',name:'Juhu–Bandra coast',focus:.5},
 {id:'bandra',name:'Bandra',focus:.5},
 {id:'sealink',name:'Sea Link',focus:.36},
 {id:'marine-drive',name:'Marine Drive / Wankhede / Nariman',focus:.5},
 {id:'south-turn',name:'Southern tip',focus:.5},
 {id:'taj-gateway',name:'Taj / Gateway',focus:.5},
 {id:'east-harbour',name:'East harbour',focus:.5},
]);

export function paperRouteLayout(_width,height){
 const tileWidth=height*16/9,overlap=tileWidth*.12;
 return {tileWidth,overlap,stride:tileWidth-overlap,length:(tileWidth-overlap)*PAPER_SECTIONS.length};
}

export function visiblePaperSections(width,height,offset){
 const layout=paperRouteLayout(width,height),tiles=[];
 for(let n=Math.floor(offset/layout.stride)-1;n*layout.stride-offset<width;n++){
  tiles.push({index:((n%PAPER_SECTIONS.length)+PAPER_SECTIONS.length)%PAPER_SECTIONS.length,x:n*layout.stride-offset,width:layout.tileWidth});
 }
 return tiles;
}

// Find an opaque cut through similar pixels instead of dissolving buildings.
export function paperJoinPath(previous,current,width,height,overlap,maxFraction=.9,minFraction=.1){
 const lo=Math.max(1,Math.floor(overlap*minFraction)),hi=Math.max(lo+1,Math.floor(overlap*maxFraction));
 let costs=new Float64Array(overlap).fill(Infinity);
 const parents=new Int8Array(overlap*height),path=new Int32Array(height);
 for(let y=0;y<height;y++){
  const next=new Float64Array(overlap).fill(Infinity);
  for(let x=lo;x<hi;x++){
   const a=(y*width+width-overlap+x)*4,b=(y*width+x)*4;
   let error=0;for(let c=0;c<3;c++)error+=(previous[a+c]-current[b+c])**2;
   let best=x;
   if(y){if(x>lo&&costs[x-1]<costs[best])best=x-1;if(x+1<hi&&costs[x+1]<costs[best])best=x+1;}
   next[x]=error+(y?costs[best]:0)+Math.abs(x-overlap*.5)*.01;
   parents[y*overlap+x]=best-x;
  }
  costs=next;
 }
 let x=lo;for(let candidate=lo+1;candidate<hi;candidate++)if(costs[candidate]<costs[x])x=candidate;
 for(let y=height-1;y>=0;y--){path[y]=x;x+=parents[y*overlap+x];}
 return path;
}

export function preparePaperScenery(images,sky,calmWater,makeCanvas=()=>document.createElement('canvas')){
 const width=images[0].width,height=Math.round(images[0].height*.80),overlap=Math.round(width*.12);
 // These paintings drifted in sky grain during successive landscape edits.
 // Reuse Bandra's approved sky above their skyline, preserving the source art.
 const skyReference=images[PAPER_SECTIONS.findIndex(section=>section.id==='bandra')];
 const restoredSkySections=new Set(['khar','marine-drive','east-harbour']);
 const sharedSky=makeCanvas();sharedSky.width=width;sharedSky.height=height;
 const skyContext=sharedSky.getContext('2d');
 skyContext.drawImage(skyReference,0,0,skyReference.width,skyReference.height*.80,0,0,width,height);
 skyContext.globalCompositeOperation='destination-in';
 // All three skylines begin below 66% of the full painting. Finish the blend
 // at 64%, leaving buildings, palms, foliage and the shoreline untouched.
 const skyMask=skyContext.createLinearGradient(0,height*.55/.80,0,height*.64/.80);
 skyMask.addColorStop(0,'#000');skyMask.addColorStop(1,'transparent');
 skyContext.fillStyle=skyMask;skyContext.fillRect(0,0,width,height);
 const plates=images.map((image,index)=>{
  const canvas=makeCanvas();canvas.width=width;canvas.height=height;
  const q=canvas.getContext('2d',{willReadFrequently:true});
  q.drawImage(image,0,0,image.width,image.height*.80,0,0,width,height);
  if(restoredSkySections.has(PAPER_SECTIONS[index].id))q.drawImage(sharedSky,0,0);
  return {canvas,pixels:q.getImageData(0,0,width,height).data};
 });
 const strips=plates.map(({canvas,pixels},i)=>{
  const q=canvas.getContext('2d');
  const seam=paperJoinPath(plates[(i+plates.length-1)%plates.length].pixels,pixels,width,height,overlap);
  const joined=q.getImageData(0,0,width,height);
  for(let y=0;y<height;y++){
   // Blend only empty sky over the fully opaque preceding plate. The lower
   // coastline uses an opaque cut, preserving every building's opacity.
   const skyBlend=Math.max(0,Math.min(1,(height*.74-y)/(height*.09)));
   for(let x=0;x<overlap;x++){
    const alpha=skyBlend*x/overlap+(1-skyBlend)*(x>=seam[y]?1:0);
    joined.data[(y*width+x)*4+3]=Math.round(alpha*255);
   }
  }
  q.putImageData(joined,0,0);
  // Only open water blends into the calm sea. Land and buildings stay opaque.
  q.globalCompositeOperation='destination-in';
  const bottom=q.createLinearGradient(0,height*.975,0,height);
  bottom.addColorStop(0,'#000');bottom.addColorStop(1,'transparent');
  q.fillStyle=bottom;q.fillRect(0,0,width,height);
  return canvas;
 });
 const skyExtensions=strips.map(plate=>createSkyContinuation(plate,.57/.80,makeCanvas));
 return {strips,skyExtensions,sky,calmWater};
}
export function createPaperScenery(images,sky,calmWater){
 return createPaperRenderer(preparePaperScenery(images,sky,calmWater));
}
export function createPaperRenderer({strips,skyExtensions,sky,calmWater}){
 function mirrored(g,image,sx,sy,sw,sh,y,height,offset,width){
  const tileWidth=height*sw/sh;
  const first=Math.floor(offset/tileWidth);
  for(let n=first;n*tileWidth-offset<width;n++){
   const x=n*tileWidth-offset;
   g.save();g.translate(x+(n%2?tileWidth:0),y);g.scale(n%2?-1:1,1);
   g.drawImage(image,sx,sy,sw,sh,0,0,tileWidth,height);g.restore();
  }
 }
 let lastSection=-1,anchor=0,soundSection=0;
 return {get soundSection(){return soundSection},draw(g,W,H,{travel,cameraY,section,shade,rainDrops,reduced,rainDensity=0}){
  const source=calmWater,layout=paperRouteLayout(W,H);
  if(lastSection!==section){anchor=travel;lastSection=section;}
  const offset=(travel-anchor)*32+section*layout.stride+layout.tileWidth*PAPER_SECTIONS[section].focus-W*.5;
  soundSection=(offset+W*.5-layout.tileWidth*.5)/layout.stride;
  const sceneryY=-cameraY*H*.28,horizon=H*.78+sceneryY;
  g.save();
  mirrored(g,sky,0,0,sky.width,sky.height,0,H,offset,W);
  // All painted textures share the coast displacement; no sliding texture bands.
  if(horizon<H){
   g.fillStyle='#c7dce2';g.fillRect(0,horizon,W,H-horizon);
   mirrored(g,source,0,source.height*.78,source.width,source.height*.22,horizon,H*.22,offset,W);
  }
  for(const tile of visiblePaperSections(W,H,offset)){
   const plate=strips[tile.index],skyHeight=H*.57;
   skyExtensions[tile.index].draw(g,tile.x,sceneryY,tile.width,skyHeight);
   g.drawImage(plate,tile.x,sceneryY,tile.width,H*.80);
  }
  drawPaperWeather(g,W,H,{shade,rainDensity,rainDrops,reduced,horizon});
  g.restore();
 }};
}
