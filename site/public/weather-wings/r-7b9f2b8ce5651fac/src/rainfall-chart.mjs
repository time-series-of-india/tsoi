export function chartProgress(elapsed,leadIn,interval){return Math.max(0,(elapsed-leadIn)/interval)%12}
export function progressX(progress){return 12+22*progress}
export function rainfallChartSvg(rain,station='Colaba',baseline='1991–2020',options={}){
 const prefix=options.prefix||'rain',showLabels=options.showLabels!==false,height=showLabels?94:70;
 const escape=value=>String(value).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const peak=Math.max(...rain),month=['January','February','March','April','May','June','July','August','September','October','November','December'][rain.indexOf(peak)];
 const bars=rain.map((mm,i)=>{
  const x=5+i*22,h=mm/1000*54,y=65-h;
  return `<g opacity="${options.cleared==null||i<options.cleared?1:.22}"><rect x="${x}" y="${y}" width="14" height="${h}" fill="#689eba" fill-opacity=".66"/><rect x="${x}" y="${y}" width="14" height="${h}" fill="url(#${prefix}-pigment)"/><path d="M${x} 65 L${x+.35} ${y} L${x+13.6} ${y} L${x+14} 65" fill="none" stroke="#416c87" stroke-opacity=".22" stroke-width=".55"/></g>`;
 }).join('');
 const labels=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>`<text x="${12+i*22}" y="89" text-anchor="middle">${m}</text>`).join('');
 return `<svg viewBox="0 0 280 ${height}" width="280" height="${height}" role="img" aria-label="${escape(station)} monthly rainfall, ${escape(baseline)} normals. ${month} is the wettest month at ${peak.toFixed(1)} mm."><defs><pattern id="${prefix}-pigment" width="13" height="17" patternUnits="userSpaceOnUse"><path d="M1 2L7 1M4 9L12 7M0 15L6 14" stroke="#234664" stroke-opacity=".13" stroke-width="1.8"/><path d="M0 5L9 3M5 13L13 11" stroke="#fff9ed" stroke-opacity=".22" stroke-width="2.5"/></pattern></defs>${bars}<path d="M1 65Q63 64.6 130 65T269 65" fill="none" stroke="#263d50" stroke-width=".9"/><g fill="#263d50" font-family="Georgia,serif" font-size="10.5">${showLabels?labels:''}</g>${options.showProgress===false?'':`<circle id="${prefix}-progress-dot" cx="${options.completed?254:12}" cy="73" r="3.2" fill="#284970" stroke="#f5f2eb" stroke-width="1.2" aria-hidden="true"/>`}</svg>`;
}
