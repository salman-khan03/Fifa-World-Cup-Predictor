// /api/predict  — POST { home, away, neutral }  ->  win/draw/loss + scorelines
// Self-contained so it deploys on Vercel with zero extra wiring.

const TEAMS = {
  Spain:91,France:90,Argentina:89,England:88,Brazil:88,Portugal:86,Germany:85,Netherlands:84,
  Belgium:82,Croatia:80,Uruguay:80,Colombia:80,Morocco:79,Senegal:78,Norway:78,Switzerland:78,
  USA:77,Japan:77,Mexico:76,Ecuador:76,Austria:75,Sweden:75,Canada:74,"South Korea":74,
  "Türkiye":74,"Ivory Coast":74,Iran:73,Egypt:73,Algeria:73,Australia:72,Scotland:72,Czechia:72,
  Ghana:72,Bosnia:71,Paraguay:71,Tunisia:71,"Saudi Arabia":70,Qatar:69,Panama:68,Uzbekistan:68,
  "DR Congo":68,Iraq:67,"South Africa":66,Jordan:66,"New Zealand":64,"Cape Verde":64,Haiti:63,"Curaçao":62,
};
const HOSTS = new Set(["USA","Mexico","Canada"]);
const fact = n => { let r=1; for(let i=2;i<=n;i++) r*=i; return r; };
const pois = (k,l) => Math.exp(-l)*Math.pow(l,k)/fact(k);

export default function handler(req, res){
  const body = req.method === "POST" ? (req.body || {}) : (req.query || {});
  const home = body.home, away = body.away;
  const neutral = body.neutral === false || body.neutral === "false" ? false : true;
  if(!TEAMS[home] || !TEAMS[away]){
    res.status(400).json({ error: "Unknown team. Pass home & away from the supported list." });
    return;
  }
  const rH = TEAMS[home], rA = TEAMS[away];
  const hostBoost = (!neutral && HOSTS.has(home)) ? 0.18 : 0;
  const diff = (rH - rA)/100, base = 1.38;
  const xgH = Math.max(0.15, base*Math.exp(0.95*diff + hostBoost));
  const xgA = Math.max(0.15, base*Math.exp(-0.95*diff - hostBoost*0.5));
  let pW=0,pD=0,pL=0; const scl=[];
  for(let i=0;i<8;i++) for(let j=0;j<8;j++){
    const p = pois(i,xgH)*pois(j,xgA);
    if(i>j)pW+=p; else if(i===j)pD+=p; else pL+=p;
    scl.push({ score:`${i}-${j}`, p:+(p*100).toFixed(2) });
  }
  res.status(200).json({
    home, away,
    expectedGoals:{ home:+xgH.toFixed(2), away:+xgA.toFixed(2) },
    probabilities:{ homeWin:+(pW*100).toFixed(1), draw:+(pD*100).toFixed(1), awayWin:+(pL*100).toFixed(1) },
    topScorelines: scl.sort((a,b)=>b.p-a.p).slice(0,5),
  });
}
