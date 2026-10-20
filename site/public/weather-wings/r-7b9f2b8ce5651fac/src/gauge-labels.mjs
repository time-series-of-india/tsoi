import {readingFont} from './reading-type.mjs';
export function drawGaugeReading(g,a,H,viewTop){
 if(a.viewportWidth&&(a.x>=a.viewportWidth||a.x+a.width<=0))return;
 const reading=`${a.rain.toFixed(1)} mm`,month=a.monthLabel||'';
 const y=Math.max(viewTop+32,Math.min(a.water,viewTop+H-20));
 g.globalAlpha=1;g.fillStyle='#263d50';g.textAlign='left';g.font='14px Georgia';
 const x=a.x+a.width+9;
 if(month)g.fillText(month,x,y-13);
 g.font=readingFont(H);g.fillText(reading,x,y+4);
}
