// The VIX event state machine from 『VIXの声を聴け』 chapters 9–10, run over the daily VIX highs.
// Thresholds for a day come from the previous month's confirmed row (log10 mean and sd of monthly highs).
(function(root){
function thresholds(months){
  const T={};
  for(let i=1;i<months.length;i++){const p=months[i-1];T[months[i][0]]={s1:Math.pow(10,p[4]+p[5]),s2:Math.pow(10,p[4]+2*p[5])};}
  return T;
}
function lwma(a,i,n){if(i<n-1)return null;let s=0,w=0;for(let k=0;k<n;k++){s+=a[i-k]*(n-k);w+=n-k;}return s/w;}
// days: [[yyyymmdd, high], ...] ascending. Returns per-day states and the list of events with their waves.
function runEvents(days,months){
  const T=thresholds(months),hi=days.map(d=>d[1]),L5=hi.map((_,i)=>lwma(hi,i,5)),L10=hi.map((_,i)=>lwma(hi,i,10));
  const ev=[],st=new Array(days.length);let cur=null;
  for(let i=0;i<days.length;i++){
    const [d,h]=days[i],t=T[Math.floor(d/100)];
    if(!t){st[i]={phase:"none"};continue;}
    if(!cur){
      if(h>t.s2){cur={start:d,waves:[],below1:0,touched1:false,peak:h,peakDay:d};ev.push(cur);cur.waves.push({start:d,peak:h,peakDay:d,signal:null,end:null,below2:0});}
    }else{
      const w=cur.waves[cur.waves.length-1];
      if(h>cur.peak){cur.peak=h;cur.peakDay=d;}
      if(h<t.s1){cur.below1++;cur.touched1=true;}else cur.below1=0;
      if(w.end==null){
        if(h>w.peak){w.peak=h;w.peakDay=d;}
        if(w.signal==null){
          // the 5-day LWMA has turned down and crossed under the 10-day (checked against the book's 17 waves)
          if(L5[i]<L5[i-1]&&L5[i]<L10[i])w.signal=d;
        }else{
          if(h<t.s2)w.below2++;else w.below2=0;
          if(w.below2>=5)w.end=d;
        }
      }else if(h>t.s2&&!cur.touched1){
        cur.waves.push({start:d,peak:h,peakDay:d,signal:null,end:null,below2:0});
      }
      if(cur.below1>=10){cur.end=d;cur=null;}
    }
    const e=cur,w=e&&e.waves[e.waves.length-1];
    st[i]={phase:!e?"none":(w.end==null&&w.signal==null?"panic":"rebound"),high:h,s1:t.s1,s2:t.s2,l5:L5[i],l10:L10[i]};
  }
  return {st,ev};
}
// latch a signal: level by rule, held (with certified levels) until the reset rule fires
function latch(rows,lvl,reset,cert){
  let cur=0;const out=[];
  for(const r of rows){const l=Math.max(lvl(r),cert[r[0]]||0);if(l>cur)cur=l;else if(cur&&reset(r))cur=l;out.push(cur);}
  return out;
}
root.MindEngine={thresholds,lwma,runEvents,latch};
if(typeof module!=="undefined")module.exports=root.MindEngine;
})(typeof window!=="undefined"?window:globalThis);
