export const INK='#263d50';
const textures=new WeakMap();
const noise=n=>{const v=Math.sin(n*127.1+17)*43758.5453;return v-Math.floor(v)};
// Cache pigment so washes stay still as the world moves.
export function pigment(g){
 if(!textures.has(g)){
  const tile=document.createElement('canvas');tile.width=128;tile.height=128;
  const q=tile.getContext('2d');
  for(let i=0;i<650;i++){
   q.fillStyle=i%3?'#274f6d':'#f5f1e8';q.globalAlpha=.025+noise(i+11)*.055;
   q.beginPath();q.ellipse(noise(i)*128,noise(i+7)*128,1+noise(i+19)*5,.6+noise(i+31)*2,noise(i+37)*3,0,Math.PI*2);q.fill();
  }
  textures.set(g,g.createPattern(tile,'repeat'));
 }
 return textures.get(g);
}
export function inkEdge(g,x,top,bottom,seed){
 if(bottom<=top)return;
 g.beginPath();g.moveTo(x,top);
 for(let y=Math.ceil(top/14)*14;y<bottom;y+=14){const n=y/14;g.lineTo(x+Math.sin(n*1.71+seed)*.42+Math.sin(n*.63+seed*2)*.27,y);}
 g.lineTo(x,bottom);g.stroke();
}
// The vessels, ink edge and collision share one world baseline.
export function seaScreenY(height,cameraY){return (1-cameraY)*height}
export function drawWaterline(g,width,height,cameraY,offset=0,thinBoundary=false){
 const y=seaScreenY(height,cameraY);
 if(y>height+2||y<0)return;
 g.save();g.beginPath();g.rect(0,0,width,y);g.clip();g.fillStyle='rgba(51,102,137,.13)';
 // Scroll the wash, pigment and ripples together with the painted sea.
 g.translate(-offset,0);
 const left=Math.floor(offset/20)*20;
 g.beginPath();g.moveTo(left,y);
 for(let x=left;x<=offset+width+20;x+=20)g.lineTo(x,y-8-Math.sin(x*.041)*1.5-Math.sin(x*.113)*.8);
 g.lineTo(offset+width+20,y);g.closePath();g.fill();
 g.translate(0,y-20);g.fillStyle=pigment(g);g.fillRect(offset,0,width,20);g.translate(0,20-y);
 g.strokeStyle=INK;g.lineWidth=thinBoundary?1:2.3;g.beginPath();
 // Ink stays on the play side of the exact collision plane.
 const edgeLeft=Math.floor(offset/12)*12;
 for(let x=edgeLeft;x<=offset+width+12;x+=12){const yy=y-.35-Math.abs(Math.sin(x*.12))*.45;if(x===edgeLeft)g.moveTo(x,yy);else g.lineTo(x,yy);}
 g.stroke();g.lineWidth=.8;g.strokeStyle='rgba(39,79,109,.55)';
 for(let n=Math.floor((offset-48)/93);n*93+24<offset+width;n++){const x=n*93+24,yy=y-8-noise(x)*6;g.beginPath();g.moveTo(x,yy);g.quadraticCurveTo(x+10,yy-1.4,x+24,yy-.3);g.stroke();}
 g.restore();
}
export function drawSplash(g,x,y,age,reduced){
 if(age<0||age>.6)return;
 const t=reduced?.2:Math.min(1,age/.6);
 g.save();g.beginPath();g.rect(0,0,g.canvas.width,y);g.clip();g.strokeStyle=INK;g.fillStyle='#5d8fab';g.globalAlpha=1-t*.7;g.lineWidth=1.2;
 g.beginPath();g.ellipse(x,y-1,8+t*20,2+t*3,0,Math.PI,Math.PI*2);g.stroke();
 for(let i=0;i<7;i++){const side=(i-3)/3,xx=x+side*(8+t*29),yy=y-3-Math.sin(t*Math.PI)*(13+(i%3)*9);g.beginPath();g.ellipse(xx,yy,1.2,2.5,side*.6,0,Math.PI*2);g.fill();}
 g.restore();
}
export function drawGroundline(g,width,height,cameraY,offset=0){
 const y=seaScreenY(height,cameraY);if(y>height+2||y<0)return;
 g.save();g.beginPath();g.rect(0,0,width,y);g.clip();g.translate(-offset,0);
 g.strokeStyle='#665d45';g.lineWidth=1;g.beginPath();
 const left=Math.floor(offset/12)*12;
 for(let x=left;x<=offset+width+12;x+=12){const yy=y-.35-Math.abs(Math.sin(x*.12))*.45;if(x===left)g.moveTo(x,yy);else g.lineTo(x,yy)}
 g.stroke();g.restore();
}
export function drawGroundImpact(g,x,y,age,reduced){
 if(age<0||age>.6)return;
 const t=reduced?.2:Math.min(1,age/.6);
 g.save();g.fillStyle='#a88b62';g.globalAlpha=(1-t)*.5;
 for(let i=0;i<7;i++){g.beginPath();g.ellipse(x+(i-3)*(3+t*7),y-2-Math.sin(t*Math.PI)*(3+i%3*3),2+t*2,1.2,0,0,Math.PI*2);g.fill()}
 g.restore();
}
