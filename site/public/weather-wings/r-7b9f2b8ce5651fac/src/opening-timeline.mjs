const ease=(a,b,t)=>{const p=Math.max(0,Math.min(1,(t-a)/(b-a)));return p*p*(3-2*p)};
export const OPENING_SECONDS=10;
// The same shallow path supplies position and pitch at every aspect ratio.
export function openingFrame(seconds,width=1280,height=720){
 const t=Math.max(0,seconds),descent=ease(1.6,10,t),u=Math.max(0,Math.min(1,(t-4)/6));
 const path=u*u*(3-2*u),drop=Math.min(height*.22,width*.12),remaining=1-path;
 const dx=width*.35,dy=3*drop*remaining*remaining;
 return {
  cameraY:2.8*(descent-1),cameraTravel:5*descent,darkness:1-ease(.7,3.8,t),
  wordmark:1-ease(1.1,2,t),
  title:ease(8,9,t),play:ease(9,9.6,t),controls:ease(9.4,10,t),
  birdX:-.07+.35*path,birdY:.46-drop/height*remaining**3,
  birdAngle:Math.atan2(dy,dx),birdOpacity:ease(4,4.6,t),
  complete:t>=OPENING_SECONDS,
 };
}

// Short bursts finish on the glide pose, with space to coast between them.
export function openingWingTime(seconds,bird){
 for(const [start,beats] of [[5.45,2],[7.35,1],[8.85,1]]){
  const elapsed=seconds-start;
  if(elapsed>=0&&elapsed<bird.wingSeconds*beats)return elapsed%bird.wingSeconds;
 }
 return -1;
}
