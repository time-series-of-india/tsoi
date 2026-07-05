import type { ECharts } from 'echarts';

// Click-to-isolate legend behaviour, shared by the dashboards and the reads so the
// two behave the same way: click a legend entry to isolate it (everything else
// hidden), click that same entry again to restore all. Without this, a click
// falls back to ECharts' default toggle, which just hides the clicked entry.
//
// `restore` should fully re-render the chart's option (setOption(opt, true)),
// which reliably brings every series or slice back. Returns a reset function the
// caller can invoke after its own re-renders to clear the isolation state.
export function legendIsolation(chart: ECharts, restore: () => void) {
  let isolated: string | null = null;
  let busy = false;
  chart.on('legendselectchanged', (params: any) => {
    if (busy) return; // ignore the events our own dispatchAction calls emit
    busy = true;
    const clicked: string = params.name;
    const names = Object.keys(params.selected);
    if (isolated === clicked) {
      isolated = null;
      restore();
    } else {
      isolated = clicked;
      names.forEach((n) =>
        chart.dispatchAction({ type: n === clicked ? 'legendSelect' : 'legendUnSelect', name: n })
      );
    }
    busy = false;
  });
  return () => { isolated = null; };
}
