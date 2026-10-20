import {drawPaperGauge} from './paper-gauges.mjs';
export const VISUAL_THEMES=Object.freeze({paper:Object.freeze({id:'paper',label:'Paper',note:'',drawGauge:drawPaperGauge})});
// Legacy theme links open the approved paper version.
export function getVisualTheme(){return VISUAL_THEMES.paper;}
