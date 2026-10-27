// 今日の暦: which of the calendar claims judged in 『相場のアノマリーを斬る』 fall on a given US session date,
// with the book's verdict. Dates are yyyymmdd numbers (the US Eastern calendar date of the session).
(function(root){
const R=Math.PI/180;
const ymd=d=>d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();
const toD=n=>new Date(Date.UTC(Math.floor(n/10000),Math.floor(n/100)%100-1,n%100));
const addDays=(n,k)=>{const d=toD(n);d.setUTCDate(d.getUTCDate()+k);return ymd(d)};
const wd=n=>toD(n).getUTCDay();
const jd=n=>toD(n).getTime()/864e5+2440587.5;   // 00:00 UTC

// NYSE full holidays from the rules (the same rules as mri-app/scripts/mkt_calendar.py)
function nth(y,m,w,k){if(k>0){const d=new Date(Date.UTC(y,m-1,1));d.setUTCDate(1+(w-d.getUTCDay()+7)%7+7*(k-1));return ymd(d)}
  const d=new Date(Date.UTC(y,m,0));d.setUTCDate(d.getUTCDate()-(d.getUTCDay()-w+7)%7);return ymd(d)}
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
  h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  return y*10000+Math.floor((h+l-7*m+114)/31)*100+((h+l-7*m+114)%31+1)}
const observed=n=>{const w=wd(n);return w===6?addDays(n,-1):w===0?addDays(n,1):n};
const HOL={};
function holidays(y){
  if(HOL[y])return HOL[y];
  const s=new Set([nth(y,1,1,3),nth(y,2,1,3),addDays(easter(y),-2),nth(y,5,1,-1),observed(y*10000+704),nth(y,9,1,1),nth(y,11,4,4),observed(y*10000+1225)]);
  if(y>=2022)s.add(observed(y*10000+619));
  const ny=y*10000+101,w=wd(ny);if(w===0)s.add(addDays(ny,1));else if(w!==6)s.add(ny);
  return HOL[y]=s;
}
const isTrading=n=>{const w=wd(n);return w!==0&&w!==6&&!holidays(Math.floor(n/10000)).has(n)};
const nextTrading=n=>{do n=addDays(n,1);while(!isTrading(n));return n};
const prevTrading=n=>{do n=addDays(n,-1);while(!isTrading(n));return n};
function tradingInMonth(y,m){const out=[];for(let d=1;d<=31;d++){const n=y*10000+m*100+d;if(Math.floor(toD(n).getUTCMonth())+1!==m)break;if(isTrading(n))out.push(n)}return out}

// Mercury: JPL "Approximate Positions of the Major Planets", Keplerian elements valid 1800–2050 (the book's method)
const EL={me:[[0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593],[0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081]],
          em:[[1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0],[0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0]]};
function helio(p,T){
  const [e0,e1]=EL[p],[a,e,I,L,w,O]=e0.map((v,i)=>v+e1[i]*T);
  let M=((L-w)%360+540)%360-180;M*=R;let E=M+e*Math.sin(M);
  for(let k=0;k<8;k++)E-= (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
  const x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E),om=(w-O)*R,Om=O*R,i=I*R;
  return [(Math.cos(om)*Math.cos(Om)-Math.sin(om)*Math.sin(Om)*Math.cos(i))*x+(-Math.sin(om)*Math.cos(Om)-Math.cos(om)*Math.sin(Om)*Math.cos(i))*y,
          (Math.cos(om)*Math.sin(Om)+Math.sin(om)*Math.cos(Om)*Math.cos(i))*x+(-Math.sin(om)*Math.sin(Om)+Math.cos(om)*Math.cos(Om)*Math.cos(i))*y];
}
function mercLon(J){const T=(J-2451545)/36525,m=helio("me",T),e=helio("em",T);return Math.atan2(m[1]-e[1],m[0]-e[0])/R}
// retrograde on a day when the geocentric longitude has fallen since the day before (both at 12:00 UTC); 316 spells 1926–2026, as in the book
function retro(n){const J=jd(n)+0.5;let d=mercLon(J)-mercLon(J-1);d=((d+540)%360)-180;return d<0}
function retroSpan(n){let a=n,b=n;while(retro(addDays(a,-1)))a=addDays(a,-1);while(retro(addDays(b,1)))b=addDays(b,1);return [a,b]}

// Moon phase: the elongation of the Moon from the Sun (low-precision series, good to a fraction of a degree)
function elong(J){
  const T=(J-2451545)/36525,n=x=>((x%360)+360)%360;
  const Ls=n(280.46646+36000.76983*T),Ms=n(357.52911+35999.05029*T)*R,
    sun=Ls+(1.914602-0.004817*T)*Math.sin(Ms)+0.019993*Math.sin(2*Ms)+0.000289*Math.sin(3*Ms);
  const Lm=n(218.3164477+481267.88123421*T),D=n(297.8501921+445267.1114034*T)*R,M=Ms,Mm=n(134.9633964+477198.8675055*T)*R,F=n(93.2720950+483202.0175233*T)*R;
  const moon=Lm+6.288774*Math.sin(Mm)+1.274027*Math.sin(2*D-Mm)+0.658314*Math.sin(2*D)+0.213618*Math.sin(2*Mm)-0.185116*Math.sin(M)
    -0.114332*Math.sin(2*F)+0.058793*Math.sin(2*D-2*Mm)+0.057066*Math.sin(2*D-M-Mm)+0.053322*Math.sin(2*D+Mm)+0.045758*Math.sin(2*D-M)
    -0.040923*Math.sin(M-Mm)-0.034720*Math.sin(D)-0.030383*Math.sin(M+Mm);
  return n(moon-sun);
}
// the calendar date (UTC) of the nearest new or full moon to n, searching ±16 days
function nearestPhase(n,target){
  let best=null;
  for(let k=-16;k<=16;k++){const J=jd(n)+k,a=elong(J),b=elong(J+1);
    const da=((a-target+540)%360)-180,db=((b-target+540)%360)-180;
    if(da<0&&db>=0){const f=-da/(db-da),day=addDays(n,k+Math.floor(f));if(!best||Math.abs(k)<Math.abs(best.k))best={k,day}}}
  return best&&best.day;
}
const daysBetween=(a,b)=>Math.round((toD(b)-toD(a))/864e5);

// FOMC: announcement is the last day of each scheduled meeting (the Fed's calendar)
const FOMC=[20260128,20260318,20260429,20260617,20260729,20260916,20261028,20261209,
            20270127,20270317,20270428,20270609,20270728,20270915,20271027,20271208];

const md=n=>`${Math.floor(n/100)%100}/${n%100}`;
const V={o:"○",t:"△",x:"×"};
// the book's verdicts, in both languages
const FATE={keep:["残っている","Still there"],fade:["減った","Faded"],never:["初めから無かった","Never there"],rev:["減って、反転した","Faded, then reversed"],
  undec:["決められない","Undecided"],pub:["公表されて消えた","Vanished after publication"],alias:["9月と年末年始の別名","Another name for September and the year-end window"]};
const MON=["January","February","March","April","May","June","July","August","September","October","November","December"];
// each item: v (o ○ / t △ / x ×), when, claim, fate — with ja and en for the last three
function today(n){
  const y=Math.floor(n/10000),m=Math.floor(n/100)%100,d=n%100,out=[];
  const add=(v,when,claim,fate)=>out.push({v,when,claim,fate:FATE[fate]});
  const trading=isTrading(n);
  if(retro(n)){const [a,b]=retroSpan(n);add("x",[`水星逆行中（${md(a)}〜${md(b)}）`,`Mercury retrograde (${md(a)}–${md(b)})`],["逆行中は下がる","Stocks fall during Mercury retrograde"],"never")}
  const nm=nearestPhase(n,0),fm=nearestPhase(n,180);
  if(nm&&Math.abs(daysBetween(nm,n))<=3)add("t",[`新月のころ（新月 ${md(nm)}）`,`Around the new moon (${md(nm)})`],["新月のころは上がる","Stocks rise around the new moon"],"undec");
  else if(fm&&Math.abs(daysBetween(fm,n))<=3)add("t",[`満月のころ（満月 ${md(fm)}）`,`Around the full moon (${md(fm)})`],["満月のころは新月より低い","Full moon returns are lower than new moon"],"undec");
  // presidential cycle (midterm year: y%4==2)
  const c=y%4;
  if((c===2&&m>=10)||(c===3&&m<=6))add("o",["中間選挙の年10月〜翌6月","Midterm October to the next June"],["甘い9か月は強い","The sweet 9 months are strong"],"keep");
  if(c===2&&m>=4&&m<=9)add("o",["中間選挙の年4月〜9月","Midterm April to September"],["弱い6か月は弱い","The weak 6 months are weak"],"keep");
  if(c===0)add("x",["大統領選挙の年","Presidential election year"],["選挙の年は上がる","Election years rise"],"never");
  if(c===1)add("x",["選挙の翌年","Post-election year"],["選挙の翌年は弱い","Post-election years are weak"],"never");
  // months
  const mn=[`${m}月`,MON[m-1]];
  if(m===9)add("o",mn,["9月は悪い","September is bad"],"keep");
  if(m===10)add("t",mn,["10月は荒れる","October is volatile"],"fade");
  if(m===11)add("t",mn,["11月は上がる","November rises"],"fade");
  if(m===8)add("x",mn,["夏枯れで8月は弱い","August is weak (summer doldrums)"],"never");
  if(m===1)add("x",mn,["1月のバロメーター","The January barometer"],"never");
  if(m===5)add("x",mn,["Sell in May","Sell in May"],"alias");
  if(trading){
    const T=tradingInMonth(y,m),i=T.indexOf(n),fromEnd=T.length-1-i;
    // the month-turn window: the last 2 trading days and the first 3
    if(i<=2||fromEnd<=1)add("t",i<=2?[`月初 ${i+1}営業日目`,`Trading day ${i+1} of the month`]:fromEnd===0?["月末 最終営業日","Last trading day of the month"]:["月末 最終の前の営業日","Second-to-last trading day of the month"],["月末月初は上がる","The turn of the month rises"],"fade");
    if(d<=15)add("t",["月の前半","First half of the month"],["月の前半は強い","The first half of the month is strong"],"fade");
    const w=wd(n);
    if(w===1)add("t",["月曜日","Monday"],["月曜は下がる","Mondays fall"],"rev");
    if(w===5)add("t",["金曜日","Friday"],["金曜は上がる","Fridays rise"],"rev");
    // the day before a holiday: the next weekday is closed
    let nx=addDays(n,1);while(wd(nx)===0||wd(nx)===6)nx=addDays(nx,1);
    if(!isTrading(nx))add("t",["祝日の前日","Day before a holiday"],["祝日の前は上がる","Pre-holiday days rise"],"fade");
    // Santa Claus rally: the last 5 trading days of December and the first 2 of January
    if((m===12&&fromEnd<=4)||(m===1&&i<=1))add("t",["年末年始の7営業日","The 7 trading days around New Year"],["サンタクロース・ラリー","The Santa Claus rally"],"fade");
    // major SQ: the third Friday of March, June, September, December (moved back to the trading day before when closed)
    if([3,6,9,12].includes(m)){let sq=nth(y,m,5,3);if(!isTrading(sq))sq=prevTrading(sq);if(sq===n)add("x",["メジャーSQ","Triple witching"],["SQの日は荒れる","Triple witching days are volatile"],"never")}
    // FOMC: the day before the announcement and the day itself
    for(const f of FOMC){if(f===n||prevTrading(f)===n){add("x",f===n?["FOMCの発表日","FOMC announcement day"]:["FOMCの発表前日","Day before the FOMC announcement"],["発表の前は上がる","Stocks rise before FOMC announcements"],"pub");break}}
  }
  const order={o:0,t:1,x:2};out.sort((a,b)=>order[a.v]-order[b.v]);
  return {trading,items:out};
}
root.MindCalendar={today,isTrading,retro,retroSpan,nearestPhase,holidays,V};
if(typeof module!=="undefined")module.exports=root.MindCalendar;
})(typeof window!=="undefined"?window:globalThis);
