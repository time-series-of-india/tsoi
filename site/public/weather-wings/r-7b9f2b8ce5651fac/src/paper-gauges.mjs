import {drawGaugeReading} from './gauge-labels.mjs';
import {INK,inkEdge,pigment} from './painted-ink.mjs';
export function drawPaperGauge(g,a,H,viewTop,_style,_storm,rainScale=.0016){
 const x=a.x,w=a.width,texture=pigment(g);
 g.save();
 for(const [top,bottom,inverted] of [[viewTop-5,a.upper,true],[a.lower,H,false]]){
  if(bottom<=top)continue;
  g.fillStyle='rgba(97,143,170,.075)';g.fillRect(x,top,w,bottom-top);
  g.save();g.beginPath();g.rect(x,top,w,bottom-top);g.clip();g.translate(x,0);g.globalAlpha=.55;g.fillStyle=texture;g.fillRect(0,top,w,bottom-top);g.restore();
  g.strokeStyle=INK;g.lineWidth=1.55;g.globalAlpha=.93;
  inkEdge(g,x,top,bottom,a.i+1);inkEdge(g,x+w,top,bottom,a.i+8);
  g.save();g.globalAlpha=.15;g.lineWidth=3.4;inkEdge(g,x+.6,top,bottom,a.i+11);inkEdge(g,x+w-.6,top,bottom,a.i+18);g.restore();
  const rim=inverted?bottom:top;g.fillStyle='rgba(82,129,157,.20)';g.lineWidth=1.1;
  g.beginPath();g.moveTo(x,rim);g.bezierCurveTo(x+w*.23,rim-1.6,x+w*.72,rim-1.5,x+w,rim);g.bezierCurveTo(x+w*.72,rim+1.8,x+w*.23,rim+1.4,x,rim);g.fill();g.stroke();
 }
 // Pigment stays inside the measured water; the waterline stays exact.
 g.globalAlpha=1;g.fillStyle='rgba(65,136,179,.39)';g.fillRect(x+1,a.water,w-2,H-a.water);
 g.save();g.beginPath();g.rect(x+1,a.water,w-2,H-a.water);g.clip();g.translate(x,a.water);g.fillStyle=texture;g.fillRect(0,0,w,H-a.water);g.restore();
 g.strokeStyle='#386b8c';g.lineWidth=1.1;g.beginPath();g.moveTo(x+1,a.water);g.lineTo(x+w-1,a.water);g.stroke();
 g.strokeStyle=INK;g.fillStyle=INK;g.lineWidth=.85;g.font='11px Georgia';g.textAlign='left';
 for(let mm=0;mm<1600;mm+=200){const yy=(1-mm*rainScale)*H;if(yy<a.lower+8||yy<viewTop||yy>viewTop+H-5)continue;g.beginPath();g.moveTo(x+5,yy);g.lineTo(x+13,yy+.15);g.stroke();g.fillText(String(mm),x+17,yy+3);}
 drawGaugeReading(g,a,H,viewTop);g.restore();
}
