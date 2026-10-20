// Broad washes preserve the paper grain and avoid holes or moving light bands.
export function drawPaperWeather(g,W,H,{shade,rainDensity=0,rainDrops,reduced,horizon}){
 const cover=Math.max(0,Math.min(1,shade));
 g.save();
 if(cover>0){
  g.globalCompositeOperation='multiply';
  const ceiling=g.createLinearGradient(0,0,0,H);
  ceiling.addColorStop(0,`rgba(105,117,130,${cover*.64})`);
  ceiling.addColorStop(.65,`rgba(133,143,151,${cover*.49})`);
  ceiling.addColorStop(1,`rgba(144,154,162,${cover*.38})`);
  g.fillStyle=ceiling;g.fillRect(0,0,W,H);
  // Cloud shadow cools the sea, with a soft horizon instead of a hard band.
  if(horizon<H){
   const sea=g.createLinearGradient(0,horizon-20,0,horizon+H*.13);
   sea.addColorStop(0,'rgba(110,130,145,0)');
   sea.addColorStop(1,`rgba(110,130,145,${cover*.38})`);
   g.fillStyle=sea;g.fillRect(0,Math.max(0,horizon-20),W,H);
  }
  g.globalCompositeOperation='source-over';
  g.fillStyle=`rgba(145,150,155,${cover*.09})`;g.fillRect(0,0,W,H);
 }
 if(!reduced&&rainDensity>0){
  // Independently seeded particles, grouped only by depth for bounded draw calls.
  for(let bucket=0;bucket<3;bucket++){
   g.strokeStyle=`rgba(63,89,112,${.26+bucket*.08+cover*.045})`;
   g.lineWidth=.65+bucket*.25;g.lineCap='round';g.beginPath();
   for(const drop of rainDrops){
    if(Math.min(2,Math.floor((drop.width-.4)/.45*3))!==bucket)continue;
    const length=drop.length*(.85+Math.min(4.6,rainDensity)*.08);
    g.moveTo(drop.x,drop.y);g.lineTo(drop.x+drop.vx/drop.vy*length,drop.y+length);
   }
   g.stroke();
  }
 }
 g.restore();
}
