import {loadImage,loadBirdArt} from './asset-loader.mjs';
import {temperatureBand} from './temperature-course.mjs';
import {PREPARED_ART} from './prepared-art.mjs';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export async function flightShareCard(model,data){
 const [scenery,bird]=await Promise.all([loadImage(PREPARED_ART.previews[model.city.id]),loadBirdArt(model.bird.id)]);
 const canvas=document.createElement('canvas');drawCityShareCard(canvas,model,data,scenery,bird);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image export unavailable.')),'image/png'));
}
// City artwork and climate data are independent of the player's result.
export function drawCityShareCard(canvas,model,data,scenery,bird){
 canvas.width=1200;canvas.height=900;const g=canvas.getContext('2d');
 g.fillStyle='#f4f1eb';g.fillRect(0,0,1200,900);g.fillStyle='#344d56';
 g.font='52px Georgia';g.fillText(model.city.name,58,77);g.font='26px Georgia';g.fillText('Weather Wings · '+model.mode,60,121);
 const cropH=Math.min(scenery.height,scenery.width*300/1200),cropY=Math.max(0,scenery.height-cropH);
 g.drawImage(scenery,0,cropY,scenery.width,cropH,0,156,1200,300);
 const pose=bird.poses[bird.profile.glidePose],scale=Math.min(220/pose.image.width,100/pose.image.height);g.drawImage(pose.image,860,206,pose.image.width*scale,pose.image.height*scale);
 const temperature=model.mode==='Between Degrees';
 g.fillStyle='#293f4c';g.font='34px Georgia';g.fillText(temperature?'Monthly temperatures':'Monthly rainfall',58,516);
 g.font='22px Georgia';g.fillText(temperature?'Average daily minimum and maximum · °C':'Average monthly total · mm',60,554);
 const max=temperature?45:Math.max(1000,...data.rain),left=76,step=94,bottom=765,height=180;
 g.strokeStyle='#b8c1bd';g.lineWidth=1;g.beginPath();g.moveTo(58,bottom);g.lineTo(1142,bottom);g.stroke();
 if(temperature){
  for(const [key,color] of [['low','#416c87'],['high','#aa6845']]){g.strokeStyle=color;g.lineWidth=3;g.beginPath();for(let n=0;n<=264;n++){const month=n/24,value=temperatureBand(data,month+.5)[key],x=left+month*step,y=bottom-value/max*height;if(n)g.lineTo(x,y);else g.moveTo(x,y)}g.stroke();}
  g.font='20px Georgia';g.fillStyle='#416c87';g.fillText('Min',972,554);g.fillStyle='#aa6845';g.fillText('Max',1066,554);
 }
 for(let i=0;i<12;i++){
  const x=left+i*step;
  if(temperature){for(const [key,color] of [['low','#416c87'],['high','#aa6845']]){g.fillStyle=color;g.beginPath();g.arc(x,bottom-data[key][i]/max*height,6,0,Math.PI*2);g.fill();}}
  else{g.fillStyle='#63869a';g.fillRect(x-19,bottom-data.rain[i]/max*height,38,data.rain[i]/max*height);}
  g.fillStyle='#53656b';g.font='18px Georgia';g.textAlign='center';g.fillText(MONTHS[i],x,bottom+28);
 }
 g.textAlign='left';g.fillStyle='#53656b';
 g.font='18px Georgia';g.fillText(`${data.station} · ${data.baseline} normals · WMO / NCEI`,60,837);
 g.fillText('timeseriesofindia.com · Weather Wings',60,871);g.textAlign='right';g.fillText(model.bird.name,1140,871);
 return canvas;
}
