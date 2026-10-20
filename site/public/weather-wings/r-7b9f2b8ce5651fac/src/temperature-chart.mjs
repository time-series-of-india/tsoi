import {temperatureBand,TEMPERATURE_MONTHS} from './temperature-course.mjs';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function temperatureChartSvg(data,options={}){
 const labels=options.showLabels!==false,paired=!!options.dottedTrace,notes=options.showNotes!==false;
 const readings=(options.targets||[]).filter(t=>Number.isFinite(t.temperature)&&Number.isFinite(t.month));
 const flight=(options.trace||[]).filter(p=>Number.isFinite(p.progress)&&Number.isFinite(p.temperature));
 // Flight height may extend above or below the readings. Keep those excursions visible.
 const bottom=paired?Math.min(-12,...flight.map(p=>p.temperature)):0,top=paired?Math.max(55,...flight.map(p=>p.temperature)):45;
 const plotBottom=paired?100:67,plotHeight=paired?92:60,height=options.minimap?94:labels?(notes?(paired?166:readings.length?140:128):(paired?140:108)):plotBottom+9;
 const x=p=>22+p*20,y=c=>plotBottom-(c-bottom)/(top-bottom)*plotHeight;
 const position=t=>paired&&Number.isFinite(t.chartProgress)?t.chartProgress:t.month+.5;
 const bounds=kind=>readings.filter(t=>t.kind===kind).sort((a,b)=>position(a)-position(b));
 const lows=bounds('Minimum'),highs=bounds('Maximum');
 function interpolate(rows,p){
  const i=rows.findIndex(t=>position(t)>=p);
  if(i===0)return rows[0].temperature;
  if(i<0)return rows.at(-1).temperature;
  const a=rows[i-1],b=rows[i],u=(p-position(a))/(position(b)-position(a)),smooth=u*u*(3-2*u);
  return a.temperature+(b.temperature-a.temperature)*smooth;
 }
 const samples=Array.from({length:265},(_,i)=>{const p=i/22;return {p,...(paired&&lows.length&&highs.length?{low:interpolate(lows,p),high:interpolate(highs,p)}:temperatureBand(data,p))}});
 const path=(rows,key)=>rows.map((r,i)=>(i?'L':'M')+x(r.p).toFixed(2)+' '+y(r[key]).toFixed(2)).join(' ');
 const upper=path(samples,'high'),lower=path(samples,'low');
 const area=upper+' '+path([...samples].reverse(),'low').replace(/^M/,'L')+' Z';
 const trace=flight.map((p,i)=>(i?'L':'M')+x(Math.max(0,Math.min(12,p.progress))).toFixed(2)+' '+y(paired?p.temperature:Math.max(0,Math.min(45,p.temperature))).toFixed(2)).join(' ');
 const targets=readings.map(t=>`<circle cx="${x(position(t)).toFixed(2)}" cy="${y(t.temperature).toFixed(2)}" r="2.2" fill="${t.result==='collected'?(t.kind==='Minimum'?'#416c87':'#aa6845'):'#f4f1eb'}" stroke="${t.kind==='Minimum'?'#416c87':'#aa6845'}" stroke-width=".8"/>`).join('');
 const mapPoints=data.low.map((low,m)=>[low,data.high[m]].map((value,i)=>`<circle data-temperature-point cx="${x(m+.5)}" cy="${y(value).toFixed(2)}" r="2.5" fill="${i?'#aa6845':'#416c87'}"/>`).join('')).join('');
 const hottest=data.high.indexOf(Math.max(...data.high));
 const accessible=`${data.station} monthly average daily minimum and maximum temperatures, ${data.baseline}. ${TEMPERATURE_MONTHS[hottest]} has the highest average maximum at ${data.high[hottest].toFixed(1)} degrees Celsius.${paired?' Dotted line shows your recorded bird flight; horizontal position follows flight time.':''}`;
 const months=TEMPERATURE_MONTHS.map((m,i)=>{const pair=readings.filter(t=>t.month===i);const p=paired&&pair.length?pair.reduce((sum,t)=>sum+position(t),0)/pair.length:i+.5;return `<text x="${x(p)}" y="${options.minimap?89:paired?115:82}" text-anchor="middle">${m.slice(0,3)}</text>`}).join('');
 const legendY=paired?132:100;
 const legend=`<text x="22" y="${legendY}" fill="#aa6845">Max</text><text x="112" y="${legendY}" fill="#416c87">Min</text>${trace?`<text x="203" y="${legendY}" fill="#344d46">Your flight</text>`:''}${notes&&targets?`<text x="140" y="${paired?145:118}" text-anchor="middle">${options.tunnels?'Filled points = passed tunnels':options.hoops?'Filled points = cleared hoops':'Filled points = collected readings'}</text>`:''}${notes?`<text x="140" y="${paired?159:readings.length?132:118}" text-anchor="middle">${paired?'Monthly averages · flight height on the same scale':'Monthly averages · shared 0–45°C scale'}</text>`:''}`;
 return `<svg viewBox="0 0 280 ${height}" role="img" aria-label="${escape(accessible)}"><g font-family="Georgia,serif" font-size="8" fill="#435b70">${labels&&!options.minimap?(paired?[0,10,20,30,40,50]:[10,20,30,40]).map(c=>`<path d="M22 ${y(c)}H262" stroke="#526471" stroke-opacity=".12"/><text x="18" y="${y(c)+3}" text-anchor="end">${c}°</text>`).join(''):''}${options.pointsOnly?'':`${options.minimap?'':`<path d="${area}" fill="#bcab8640"/>`}<path data-temperature-curve="high" d="${upper}" fill="none" stroke="#aa6845" stroke-width="${options.minimap?1:1.5}"/><path data-temperature-curve="low" d="${lower}" fill="none" stroke="#416c87" stroke-width="${options.minimap?1:1.5}"/>`}${options.minimap||options.pointsOnly||!readings.length?mapPoints:''}${trace?`<path data-flight-trace d="${trace}" fill="none" stroke="#344d46" stroke-opacity=".85" stroke-width="${paired?1:.85}"${paired?' stroke-dasharray=".2 2.8" stroke-linecap="round"':''}/>`:''}${targets}${options.minimap?'<circle id="temperature-progress-dot" cx="32" cy="73" r="3.2" fill="#284970" stroke="#f5f2eb" stroke-width="1.2" aria-hidden="true"/>':''}${labels?months+(options.minimap?'':legend):''}</g></svg>`;
}
