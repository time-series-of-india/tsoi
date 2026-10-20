const viewports=new WeakMap();
// Zoom can change CSS size and scale while leaving the backing pixels unchanged.
export function resizeCanvas(canvas,context,width,height,scale){
 const pixelWidth=Math.round(width*scale),pixelHeight=Math.round(height*scale),previous=viewports.get(canvas);
 if(canvas.width===pixelWidth&&canvas.height===pixelHeight&&previous?.width===width&&previous?.height===height&&previous?.scale===scale)return false;
 if(canvas.width!==pixelWidth)canvas.width=pixelWidth;
 if(canvas.height!==pixelHeight)canvas.height=pixelHeight;
 context.setTransform(scale,0,0,scale,0,0);
 viewports.set(canvas,{width,height,scale});return true;
}
