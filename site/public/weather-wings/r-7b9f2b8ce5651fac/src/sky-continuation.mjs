// Upright overlapping strips extend painted clouds above the camera view.
const BLEND=.16;
export function skyRows(baseY,height){
 const stride=height*(1-BLEND),count=Math.max(1,Math.ceil((baseY+height*BLEND)/stride));
 return Array.from({length:count},(_,i)=>baseY-(count-i)*stride);
}
function fadeTop(canvas,height){
 const g=canvas.getContext('2d');g.save();g.globalCompositeOperation='destination-in';
 const mask=g.createLinearGradient(0,0,0,height);mask.addColorStop(0,'transparent');mask.addColorStop(1,'#000');
 g.fillStyle=mask;g.fillRect(0,0,canvas.width,canvas.height);g.restore();
}
export function createSkyContinuation(plate,fraction,makeCanvas=()=>document.createElement('canvas')){
 const sky=makeCanvas();sky.width=plate.width;sky.height=Math.round(plate.height*fraction);
 sky.getContext('2d').drawImage(plate,0,0,plate.width,sky.height,0,0,sky.width,sky.height);
 const blend=sky.height*BLEND;
 fadeTop(sky,blend);fadeTop(plate,blend);
 return {draw(g,x,baseY,width,height){
  for(const y of skyRows(baseY,height))g.drawImage(sky,x,y,width,height);
 }};
}

// A prepared plate already contains the same top fade as its sky crop.
export function preparedSkyContinuation(plate,fraction){
 const sourceHeight=Math.round(plate.height*fraction);
 return {draw(g,x,baseY,width,height){
  for(const y of skyRows(baseY,height))g.drawImage(plate,0,0,plate.width,sourceHeight,x,y,width,height);
 }};
}
