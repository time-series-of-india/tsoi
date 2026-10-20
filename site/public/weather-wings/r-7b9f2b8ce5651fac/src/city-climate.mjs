const cache=new Map();
export function seedCityClimate(city,data){if(data)cache.set(city.id,Promise.resolve(data))}
export function cityClimate(city){
 if(!cache.has(city.id))cache.set(city.id,fetch('./'+city.data).then(response=>{if(!response.ok)throw Error('Rainfall unavailable');return response.json()}).then(value=>{if(value.rain?.length!==12||!value.rain.every(n=>Number.isFinite(n)&&n>=0))throw Error('Invalid rainfall');return value}).catch(error=>{cache.delete(city.id);throw error}));
 return cache.get(city.id);
}
