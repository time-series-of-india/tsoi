// Source adapters supply explicit units. Unknown observations stay null.
const optionalNumber=(value,name,min=-Infinity,max=Infinity)=>{
 if(value==null)return null;
 if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new TypeError(`Invalid ${name}`);
 return value;
};
export function createWeatherState(input={}){
 return Object.freeze({
  source:input.source??'study',
  observedAt:input.observedAt??null,
  temperatureC:optionalNumber(input.temperatureC,'temperatureC'),
  windSpeedMps:optionalNumber(input.windSpeedMps,'windSpeedMps',0),
  windGustMps:optionalNumber(input.windGustMps,'windGustMps',0),
  windFromDegrees:optionalNumber(input.windFromDegrees,'windFromDegrees',0,360),
  precipitationMmPerHour:optionalNumber(input.precipitationMmPerHour,'precipitationMmPerHour',0),
  cloudCover:optionalNumber(input.cloudCover,'cloudCover',0,1),
  solarElevationDegrees:optionalNumber(input.solarElevationDegrees,'solarElevationDegrees',-90,90),
  // Lightning is independent of rainfall for real weather adapters.
  thunderstorm:typeof input.thunderstorm==='boolean'?input.thunderstorm:null,
 });
}
// Preserve the approved study palette without presenting presets as measurements.
export function studyWeather(monsoon,rainLevel){
 if(!Number.isInteger(rainLevel)||rainLevel<0||rainLevel>3)throw new RangeError('Invalid rain level');
 return {
  weather:createWeatherState({cloudCover:monsoon?[.28,.42,.65,.88][rainLevel]:.16}),
  presentation:{rainDensity:monsoon?[0,1,2.4,4.6][rainLevel]:0,lightning:monsoon&&rainLevel===3},
 };
}
// Artistic transfer curve, not meteorological rain-class thresholds.
function rainDensity(rate){
 if(rate==null)return 0;
 const rates=[0,.5,4,12],densities=[0,1,2.4,4.6];
 for(let i=1;i<rates.length;i++)if(rate<=rates[i])return densities[i-1]+(densities[i]-densities[i-1])*(rate-rates[i-1])/(rates[i]-rates[i-1]);
 return densities[3];
}
export function atmosphereFromWeather(weather,presentation={}){
 const cover=weather.cloudCover??.16;
 return Object.freeze({
  cloudCover:cover,
  rainDensity:presentation.rainDensity??rainDensity(weather.precipitationMmPerHour),
  lightning:presentation.lightning??weather.thunderstorm===true,
  // Rendering fallback only; it does not fill in missing observations.
  cloudWash:cover>.16,
 });
}
