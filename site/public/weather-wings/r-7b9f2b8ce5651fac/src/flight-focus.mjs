// Returning to a live canvas must not reactivate the button that opened a panel.
export function panelReturnTarget({learning=false,dialogs=[],trigger,canvas,lessonCanvas}){
 if(learning&&dialogs.length===1)return lessonCanvas;
 if(trigger?.closest('dialog[open]'))return trigger;
 if(!dialogs.length)return canvas;
 return null;
}

// A tab becoming visible must not put Pause above an existing modal.
export function openPausePanel(app,panel,canResume){
 if(app.closest('[hidden]')||app.querySelector('dialog[open]')||!canResume())return;
 panel.showModal();panel.querySelector('.pause-resume').focus();
}
