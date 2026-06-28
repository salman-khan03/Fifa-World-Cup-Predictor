// /api/fixtures — returns { fixtures: [...] }
// If FOOTBALL_DATA_API_TOKEN is set, fetches live WC matches; otherwise returns seed.
// Keep the token server-side only — never expose it in the client bundle.

const SEED = [
  // MD1
  {g:"A",d:"Jun 11",h:"Mexico",a:"South Africa",s:[2,0],st:"FT",v:"Estadio Banorte"},
  {g:"A",d:"Jun 11",h:"South Korea",a:"Czechia",s:[2,1],st:"FT",v:"Estadio Akron"},
  {g:"B",d:"Jun 12",h:"Canada",a:"Bosnia",s:[1,1],st:"FT",v:"BMO Field"},
  {g:"D",d:"Jun 13",h:"USA",a:"Paraguay",s:[4,1],st:"FT",v:"SoFi Stadium"},
  {g:"B",d:"Jun 13",h:"Qatar",a:"Switzerland",s:[1,1],st:"FT",v:"Levi's Stadium"},
  {g:"C",d:"Jun 13",h:"Brazil",a:"Morocco",s:[1,1],st:"FT",v:"MetLife Stadium"},
  {g:"D",d:"Jun 13",h:"Australia",a:"Türkiye",s:[2,0],st:"FT",v:"BC Place Stadium"},
  {g:"C",d:"Jun 13",h:"Haiti",a:"Scotland",s:[0,1],st:"FT",v:"Gillette Stadium"},
  {g:"E",d:"Jun 14",h:"Germany",a:"Curaçao",s:[7,1],st:"FT",v:"Reliant Stadium"},
  {g:"F",d:"Jun 14",h:"Netherlands",a:"Japan",s:[2,2],st:"FT",v:"AT&T Stadium"},
  {g:"E",d:"Jun 14",h:"Ivory Coast",a:"Ecuador",s:[1,0],st:"FT",v:"Lincoln Financial Field"},
  {g:"F",d:"Jun 14",h:"Sweden",a:"Tunisia",s:[5,1],st:"FT",v:"Estadio BBVA"},
  {g:"G",d:"Jun 15",h:"Belgium",a:"Egypt",s:[1,1],st:"FT",v:"Lumen Field"},
  {g:"H",d:"Jun 15",h:"Spain",a:"Cape Verde",s:[0,0],st:"FT",v:"Mercedes-Benz Stadium"},
  {g:"H",d:"Jun 15",h:"Saudi Arabia",a:"Uruguay",s:[1,1],st:"FT",v:"Hard Rock Stadium"},
  {g:"G",d:"Jun 15",h:"Iran",a:"New Zealand",s:[2,2],st:"FT",v:"SoFi Stadium"},
  {g:"I",d:"Jun 16",h:"France",a:"Senegal",s:[3,1],st:"FT",v:"MetLife Stadium"},
  {g:"I",d:"Jun 16",h:"Iraq",a:"Norway",s:[1,4],st:"FT",v:"Gillette Stadium"},
  {g:"J",d:"Jun 16",h:"Argentina",a:"Algeria",s:[3,0],st:"FT",v:"Arrowhead Stadium"},
  {g:"J",d:"Jun 16",h:"Austria",a:"Jordan",s:[3,1],st:"FT",v:"Levi's Stadium"},
  {g:"K",d:"Jun 17",h:"Portugal",a:"DR Congo",s:[1,1],st:"FT",v:"Reliant Stadium"},
  {g:"L",d:"Jun 17",h:"England",a:"Croatia",s:[4,2],st:"FT",v:"AT&T Stadium"},
  {g:"L",d:"Jun 17",h:"Ghana",a:"Panama",s:[1,0],st:"FT",v:"BMO Field"},
  {g:"K",d:"Jun 17",h:"Uzbekistan",a:"Colombia",s:[1,3],st:"FT",v:"Estadio Banorte"},
  // MD2
  {g:"B",d:"Jun 18",h:"Switzerland",a:"Bosnia",s:[4,1],st:"FT",v:"SoFi Stadium"},
  {g:"A",d:"Jun 18",h:"Czechia",a:"South Africa",s:[1,1],st:"FT",v:"Mercedes-Benz Stadium"},
  {g:"B",d:"Jun 18",h:"Canada",a:"Qatar",s:[6,0],st:"FT",v:"BC Place Stadium"},
  {g:"A",d:"Jun 18",h:"Mexico",a:"South Korea",s:[1,0],st:"FT",v:"Estadio Akron"},
  {g:"D",d:"Jun 19",h:"USA",a:"Australia",s:[2,0],st:"FT",v:"Lumen Field"},
  {g:"C",d:"Jun 19",h:"Scotland",a:"Morocco",s:[0,1],st:"FT",v:"Gillette Stadium"},
  {g:"D",d:"Jun 19",h:"Türkiye",a:"Paraguay",s:[0,1],st:"FT",v:"Levi's Stadium"},
  {g:"C",d:"Jun 19",h:"Brazil",a:"Haiti",s:[3,0],st:"FT",v:"Lincoln Financial Field"},
  {g:"F",d:"Jun 20",h:"Netherlands",a:"Sweden",s:[5,1],st:"FT",v:"Reliant Stadium"},
  {g:"E",d:"Jun 20",h:"Germany",a:"Ivory Coast",s:[2,1],st:"FT",v:"BMO Field"},
  {g:"E",d:"Jun 20",h:"Ecuador",a:"Curaçao",s:[0,0],st:"FT",v:"Arrowhead Stadium"},
  {g:"F",d:"Jun 20",h:"Tunisia",a:"Japan",s:[0,4],st:"FT",v:"Estadio BBVA"},
  {g:"G",d:"Jun 21",h:"Belgium",a:"Iran",s:[0,0],st:"FT",v:"SoFi Stadium"},
  {g:"H",d:"Jun 21",h:"Spain",a:"Saudi Arabia",s:[4,0],st:"FT",v:"Mercedes-Benz Stadium"},
  {g:"H",d:"Jun 21",h:"Uruguay",a:"Cape Verde",s:[2,2],st:"FT",v:"Hard Rock Stadium"},
  {g:"G",d:"Jun 21",h:"New Zealand",a:"Egypt",s:[1,3],st:"FT",v:"BC Place Stadium"},
  {g:"J",d:"Jun 22",h:"Argentina",a:"Austria",s:[2,0],st:"FT",v:"AT&T Stadium"},
  {g:"I",d:"Jun 22",h:"France",a:"Iraq",s:[3,0],st:"FT",v:"Lincoln Financial Field"},
  {g:"I",d:"Jun 22",h:"Norway",a:"Senegal",s:[3,2],st:"FT",v:"MetLife Stadium"},
  {g:"J",d:"Jun 22",h:"Jordan",a:"Algeria",s:[1,2],st:"FT",v:"Levi's Stadium"},
  {g:"K",d:"Jun 23",h:"Portugal",a:"Uzbekistan",s:[5,0],st:"FT",v:"Reliant Stadium"},
  {g:"L",d:"Jun 23",h:"England",a:"Ghana",s:[0,0],st:"FT",v:"Gillette Stadium"},
  {g:"L",d:"Jun 23",h:"Panama",a:"Croatia",s:[0,1],st:"FT",v:"BMO Field"},
  {g:"K",d:"Jun 23",h:"Colombia",a:"DR Congo",s:[1,0],st:"FT",v:"Estadio Akron"},
  // MD3
  {g:"B",d:"Jun 24",h:"Bosnia",a:"Qatar",s:[3,1],st:"FT",v:"Lumen Field"},
  {g:"B",d:"Jun 24",h:"Switzerland",a:"Canada",s:[2,1],st:"FT",v:"BC Place Stadium"},
  {g:"C",d:"Jun 24",h:"Morocco",a:"Haiti",s:[4,2],st:"FT",v:"Mercedes-Benz Stadium"},
  {g:"C",d:"Jun 24",h:"Scotland",a:"Brazil",s:[0,3],st:"FT",v:"Hard Rock Stadium"},
  {g:"A",d:"Jun 24",h:"Czechia",a:"Mexico",s:[0,3],st:"FT",v:"Estadio Banorte"},
  {g:"A",d:"Jun 24",h:"South Africa",a:"South Korea",s:[1,0],st:"FT",v:"Estadio BBVA"},
  {g:"E",d:"Jun 25",h:"Ecuador",a:"Germany",s:[2,1],st:"FT",v:"MetLife Stadium"},
  {g:"E",d:"Jun 25",h:"Curaçao",a:"Ivory Coast",s:[0,2],st:"FT",v:"Lincoln Financial Field"},
  {g:"F",d:"Jun 25",h:"Japan",a:"Sweden",s:[1,1],st:"FT",v:"AT&T Stadium"},
  {g:"F",d:"Jun 25",h:"Tunisia",a:"Netherlands",s:[1,3],st:"FT",v:"Arrowhead Stadium"},
  {g:"D",d:"Jun 25",h:"Paraguay",a:"Australia",s:[0,0],st:"FT",v:"Levi's Stadium"},
  {g:"D",d:"Jun 25",h:"Türkiye",a:"USA",s:[3,2],st:"FT",v:"SoFi Stadium"},
  {g:"I",d:"Jun 26",h:"Norway",a:"France",s:[1,4],st:"FT",v:"Gillette Stadium"},
  {g:"I",d:"Jun 26",h:"Senegal",a:"Iraq",s:[5,0],st:"FT",v:"BMO Field"},
  {g:"H",d:"Jun 26",h:"Uruguay",a:"Spain",s:[0,1],st:"FT",v:"Estadio Akron"},
  {g:"H",d:"Jun 26",h:"Cape Verde",a:"Saudi Arabia",s:[0,0],st:"FT",v:"Reliant Stadium"},
  {g:"G",d:"Jun 26",h:"Egypt",a:"Iran",s:[1,1],st:"FT",v:"Lumen Field"},
  {g:"G",d:"Jun 26",h:"New Zealand",a:"Belgium",s:[1,5],st:"FT",v:"BC Place Stadium"},
  {g:"L",d:"Jun 27",h:"Panama",a:"England",s:[0,2],st:"FT",v:"MetLife Stadium"},
  {g:"L",d:"Jun 27",h:"Croatia",a:"Ghana",s:[2,1],st:"FT",v:"Lincoln Financial Field"},
  {g:"K",d:"Jun 27",h:"DR Congo",a:"Uzbekistan",s:[3,1],st:"FT",v:"Mercedes-Benz Stadium"},
  {g:"K",d:"Jun 27",h:"Colombia",a:"Portugal",s:[0,0],st:"FT",v:"Hard Rock Stadium"},
  {g:"J",d:"Jun 27",h:"Algeria",a:"Austria",s:[3,3],st:"FT",v:"Arrowhead Stadium"},
  {g:"J",d:"Jun 27",h:"Jordan",a:"Argentina",s:[1,3],st:"FT",v:"AT&T Stadium"},
  // R32
  {g:"R32",d:"Jun 28",h:"South Africa",a:"Canada",st:"UP",v:"SoFi Stadium"},
  {g:"R32",d:"Jun 29",h:"Brazil",a:"Japan",st:"UP",v:"Reliant Stadium"},
  {g:"R32",d:"Jun 29",h:"Germany",a:"Paraguay",st:"UP",v:"Gillette Stadium"},
  {g:"R32",d:"Jun 29",h:"Netherlands",a:"Morocco",st:"UP",v:"Estadio BBVA"},
  {g:"R32",d:"Jun 30",h:"Ivory Coast",a:"Norway",st:"UP",v:"AT&T Stadium"},
  {g:"R32",d:"Jun 30",h:"France",a:"Sweden",st:"UP",v:"MetLife Stadium"},
  {g:"R32",d:"Jun 30",h:"Mexico",a:"Ecuador",st:"UP",v:"Estadio Banorte"},
  {g:"R32",d:"Jul 1",h:"England",a:"DR Congo",st:"UP",v:"Mercedes-Benz Stadium"},
  {g:"R32",d:"Jul 1",h:"Belgium",a:"Senegal",st:"UP",v:"Lumen Field"},
  {g:"R32",d:"Jul 1",h:"USA",a:"Bosnia",st:"UP",v:"Levi's Stadium"},
  {g:"R32",d:"Jul 2",h:"Spain",a:"Austria",st:"UP",v:"SoFi Stadium"},
  {g:"R32",d:"Jul 2",h:"Portugal",a:"Croatia",st:"UP",v:"BMO Field"},
  {g:"R32",d:"Jul 2",h:"Switzerland",a:"Algeria",st:"UP",v:"BC Place Stadium"},
  {g:"R32",d:"Jul 3",h:"Australia",a:"Egypt",st:"UP",v:"AT&T Stadium"},
  {g:"R32",d:"Jul 3",h:"Argentina",a:"Cape Verde",st:"UP",v:"Hard Rock Stadium"},
  {g:"R32",d:"Jul 3",h:"Colombia",a:"Ghana",st:"UP",v:"Arrowhead Stadium"},
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
