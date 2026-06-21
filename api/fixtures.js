// /api/fixtures — returns { fixtures: [...] }
// If FOOTBALL_DATA_API_TOKEN is set, fetches live WC matches; otherwise returns seed.
// Keep the token server-side only — never expose it in the client bundle.

const SEED = [
  {g:"A",d:"Jun 11",h:"Mexico",a:"South Africa",s:[2,0],st:"FT",v:"Estadio Azteca, Mexico City"},
  {g:"A",d:"Jun 11",h:"South Korea",a:"Czechia",s:[2,1],st:"FT",v:"Atlanta"},
  {g:"B",d:"Jun 12",h:"Canada",a:"Bosnia",s:[1,1],st:"FT",v:"BMO Field, Toronto"},
  {g:"D",d:"Jun 13",h:"USA",a:"Paraguay",s:[4,1],st:"FT",v:"Los Angeles Stadium"},
  {g:"B",d:"Jun 13",h:"Qatar",a:"Switzerland",s:[1,1],st:"FT",v:"San Francisco Bay Area"},
  {g:"C",d:"Jun 13",h:"Brazil",a:"Morocco",s:[1,1],st:"FT",v:"New York/New Jersey"},
  {g:"C",d:"Jun 13",h:"Scotland",a:"Haiti",s:[1,0],st:"FT",v:"Boston"},
  {g:"D",d:"Jun 13",h:"Australia",a:"Türkiye",s:[2,0],st:"FT",v:"BC Place, Vancouver"},
  {g:"E",d:"Jun 14",h:"Germany",a:"Curaçao",s:[7,1],st:"FT",v:"Houston"},
  {g:"F",d:"Jun 14",h:"Netherlands",a:"Japan",s:[2,2],st:"FT",v:"Dallas"},
  {g:"E",d:"Jun 14",h:"Ivory Coast",a:"Ecuador",s:[0,0],st:"FT",v:"Philadelphia"},
  {g:"F",d:"Jun 14",h:"Sweden",a:"Tunisia",st:"UP",v:"Toronto"},
  {g:"G",d:"Jun 15",h:"Belgium",a:"Egypt",st:"UP",v:"Los Angeles"},
  {g:"G",d:"Jun 15",h:"Iran",a:"New Zealand",st:"UP",v:"Houston"},
  {g:"I",d:"Jun 16",h:"France",a:"Senegal",st:"UP",v:"Atlanta"},
  {g:"K",d:"Jun 17",h:"Portugal",a:"Colombia",st:"UP",v:"East Rutherford"},
  {g:"H",d:"Jun 17",h:"Spain",a:"Cape Verde",st:"UP",v:"San Francisco Bay Area"},
  {g:"A",d:"Jun 18",h:"Mexico",a:"South Korea",st:"UP",v:"Guadalajara"},
  {g:"D",d:"Jun 19",h:"USA",a:"Australia",st:"UP",v:"Lumen Field, Seattle"},
  {g:"C",d:"Jun 19",h:"Brazil",a:"Haiti",st:"UP",v:"Los Angeles"},
];

const STATUS = { FINISHED:"FT", IN_PLAY:"LIVE", PAUSED:"LIVE", TIMED:"UP", SCHEDULED:"UP" };
const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function handler(req, res){
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  // cache at the edge for 60s to stay under the free-tier rate limit
  res.setHeader("Cache-Control","s-maxage=60, stale-while-revalidate=120");

  if(!token){
    res.status(200).json({ source:"seed", fixtures: SEED });
    return;
  }
  try{
    // football-data.org: World Cup competition code is "WC"
    const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": token },
    });
    if(!r.ok) throw new Error("upstream " + r.status);
    const data = await r.json();
    const fixtures = (data.matches || []).map(m => {
      const dt = new Date(m.utcDate);
      const ft = m.score?.fullTime || {};
      const played = STATUS[m.status] === "FT";
      return {
        g: m.group ? String(m.group).replace("GROUP_","") : "—",
        d: `${MONTH[dt.getUTCMonth()]} ${dt.getUTCDate()}`,
        h: m.homeTeam?.name || "TBD",
        a: m.awayTeam?.name || "TBD",
        s: played && ft.home != null ? [ft.home, ft.away] : undefined,
        st: STATUS[m.status] || "UP",
        v: m.venue || "",
      };
    });
    res.status(200).json({ source:"football-data.org", fixtures: fixtures.length ? fixtures : SEED });
  }catch(err){
    res.status(200).json({ source:"seed-fallback", error:String(err), fixtures: SEED });
  }
}
