const T = (name, code, rating, conf, host = false) => ({ name, code, rating, conf, host });

export const TEAMS = [
  T("Spain", "ESP", 91, "UEFA"), T("France", "FRA", 90, "UEFA"), T("Argentina", "ARG", 89, "CONMEBOL"),
  T("England", "ENG", 88, "UEFA"), T("Brazil", "BRA", 88, "CONMEBOL"), T("Portugal", "POR", 86, "UEFA"),
  T("Germany", "GER", 85, "UEFA"), T("Netherlands", "NED", 84, "UEFA"), T("Belgium", "BEL", 82, "UEFA"),
  T("Croatia", "CRO", 80, "UEFA"), T("Uruguay", "URU", 80, "CONMEBOL"), T("Colombia", "COL", 80, "CONMEBOL"),
  T("Morocco", "MAR", 79, "CAF"), T("Senegal", "SEN", 78, "CAF"), T("Norway", "NOR", 78, "UEFA"),
  T("Switzerland", "SUI", 78, "UEFA"), T("USA", "USA", 77, "CONCACAF", true), T("Japan", "JPN", 77, "AFC"),
  T("Mexico", "MEX", 76, "CONCACAF", true), T("Ecuador", "ECU", 76, "CONMEBOL"), T("Austria", "AUT", 75, "UEFA"),
  T("Sweden", "SWE", 75, "UEFA"), T("Canada", "CAN", 74, "CONCACAF", true), T("South Korea", "KOR", 74, "AFC"),
  T("Türkiye", "TUR", 74, "UEFA"), T("Ivory Coast", "CIV", 74, "CAF"), T("Iran", "IRN", 73, "AFC"),
  T("Egypt", "EGY", 73, "CAF"), T("Algeria", "ALG", 73, "CAF"), T("Australia", "AUS", 72, "AFC"),
  T("Scotland", "SCO", 72, "UEFA"), T("Czechia", "CZE", 72, "UEFA"), T("Ghana", "GHA", 72, "CAF"),
  T("Bosnia", "BIH", 71, "UEFA"), T("Paraguay", "PAR", 71, "CONMEBOL"), T("Tunisia", "TUN", 71, "CAF"),
  T("Saudi Arabia", "KSA", 70, "AFC"), T("Qatar", "QAT", 69, "AFC"), T("Panama", "PAN", 68, "CONCACAF"),
  T("Uzbekistan", "UZB", 68, "AFC"), T("DR Congo", "COD", 68, "CAF"), T("Iraq", "IRQ", 67, "AFC"),
  T("South Africa", "RSA", 66, "CAF"), T("Jordan", "JOR", 66, "AFC"), T("New Zealand", "NZL", 64, "OFC"),
  T("Cape Verde", "CPV", 64, "CAF"), T("Haiti", "HAI", 63, "CONCACAF"), T("Curaçao", "CUW", 62, "CONCACAF"),
];

export const byName = Object.fromEntries(TEAMS.map(t => [t.name, t]));

export const FLAG_ISO = {
  ESP:"es", FRA:"fr", ARG:"ar", ENG:"gb-eng", BRA:"br", POR:"pt", GER:"de",
  NED:"nl", BEL:"be", CRO:"hr", URU:"uy", COL:"co", MAR:"ma", SEN:"sn",
  NOR:"no", SUI:"ch", USA:"us", JPN:"jp", MEX:"mx", ECU:"ec", AUT:"at",
  SWE:"se", CAN:"ca", KOR:"kr", TUR:"tr", CIV:"ci", IRN:"ir", EGY:"eg",
  ALG:"dz", AUS:"au", SCO:"gb-sct", CZE:"cz", GHA:"gh", BIH:"ba", PAR:"py",
  TUN:"tn", KSA:"sa", QAT:"qa", PAN:"pa", UZB:"uz", COD:"cd", IRQ:"iq",
  RSA:"za", JOR:"jo", NZL:"nz", CPV:"cv", HAI:"ht", CUW:"cw",
};

export const SEED_FX = [
  // ── GROUP STAGE · Matchday 1 ─────────────────────────────────────────────
  // Jun 11
  { g:"A", d:"Jun 11", t:"13:00", h:"Mexico",       a:"South Africa",  s:[2,0], st:"FT", v:"Estadio Banorte, Mexico City",           poss:[55,45] },
  { g:"A", d:"Jun 11", t:"20:00", h:"South Korea",  a:"Czechia",       s:[2,1], st:"FT", v:"Estadio Akron, Guadalajara",             poss:[48,52] },
  // Jun 12
  { g:"B", d:"Jun 12", t:"15:00", h:"Canada",       a:"Bosnia",        s:[1,1], st:"FT", v:"BMO Field, Toronto",                     poss:[51,49] },
  { g:"D", d:"Jun 12", t:"18:00", h:"USA",          a:"Paraguay",      s:[4,1], st:"FT", v:"SoFi Stadium, Los Angeles",              poss:[56,44] },
  // Jun 13
  { g:"B", d:"Jun 13", t:"12:00", h:"Qatar",        a:"Switzerland",   s:[1,1], st:"FT", v:"Levi's Stadium, San Francisco",          poss:[37,63] },
  { g:"C", d:"Jun 13", t:"18:00", h:"Brazil",       a:"Morocco",       s:[1,1], st:"FT", v:"MetLife Stadium, New York/NJ",           poss:[59,41] },
  { g:"D", d:"Jun 13", t:"21:00", h:"Australia",    a:"Türkiye",       s:[2,0], st:"FT", v:"BC Place, Vancouver",                    poss:[46,54] },
  { g:"C", d:"Jun 13", t:"21:00", h:"Haiti",        a:"Scotland",      s:[0,1], st:"FT", v:"Gillette Stadium, Boston",               poss:[33,67] },
  // Jun 14
  { g:"E", d:"Jun 14", t:"12:00", h:"Germany",      a:"Curaçao",       s:[7,1], st:"FT", v:"NRG Stadium, Houston",                   poss:[74,26] },
  { g:"F", d:"Jun 14", t:"15:00", h:"Netherlands",  a:"Japan",         s:[2,2], st:"FT", v:"AT&T Stadium, Dallas",                   poss:[63,37] },
  { g:"E", d:"Jun 14", t:"19:00", h:"Ivory Coast",  a:"Ecuador",       s:[1,0], st:"FT", v:"Lincoln Financial Field, Philadelphia",  poss:[47,53] },
  { g:"F", d:"Jun 14", t:"20:00", h:"Sweden",       a:"Tunisia",       s:[5,1], st:"FT", v:"Estadio BBVA, Monterrey",                poss:[62,38] },
  // Jun 15
  { g:"G", d:"Jun 15", t:"12:00", h:"Belgium",      a:"Egypt",         s:[1,1], st:"FT", v:"Lumen Field, Seattle",                   poss:[61,39] },
  { g:"H", d:"Jun 15", t:"12:00", h:"Spain",        a:"Cape Verde",    s:[0,0], st:"FT", v:"Mercedes-Benz Stadium, Atlanta",         poss:[72,28] },
  { g:"H", d:"Jun 15", t:"18:00", h:"Saudi Arabia", a:"Uruguay",       s:[1,1], st:"FT", v:"Hard Rock Stadium, Miami",               poss:[40,60] },
  { g:"G", d:"Jun 15", t:"18:00", h:"Iran",         a:"New Zealand",   s:[2,2], st:"FT", v:"SoFi Stadium, Los Angeles",              poss:[53,47] },
  // Jun 16
  { g:"I", d:"Jun 16", t:"15:00", h:"France",       a:"Senegal",       s:[3,1], st:"FT", v:"MetLife Stadium, New York/NJ",           poss:[58,42] },
  { g:"I", d:"Jun 16", t:"18:00", h:"Iraq",         a:"Norway",        s:[1,4], st:"FT", v:"Gillette Stadium, Boston",               poss:[38,62] },
  { g:"J", d:"Jun 16", t:"20:00", h:"Argentina",    a:"Algeria",       s:[3,0], st:"FT", v:"Arrowhead Stadium, Kansas City",         poss:[61,39] },
  { g:"J", d:"Jun 16", t:"21:00", h:"Austria",      a:"Jordan",        s:[3,1], st:"FT", v:"Levi's Stadium, San Francisco" },
  // Jun 17
  { g:"K", d:"Jun 17", t:"12:00", h:"Portugal",     a:"DR Congo",      s:[1,1], st:"FT", v:"NRG Stadium, Houston" },
  { g:"L", d:"Jun 17", t:"15:00", h:"England",      a:"Croatia",       s:[4,2], st:"FT", v:"AT&T Stadium, Dallas" },
  { g:"L", d:"Jun 17", t:"19:00", h:"Ghana",        a:"Panama",        s:[1,0], st:"FT", v:"BMO Field, Toronto" },
  { g:"K", d:"Jun 17", t:"20:00", h:"Uzbekistan",   a:"Colombia",      s:[1,3], st:"FT", v:"Estadio Banorte, Mexico City" },

  // ── GROUP STAGE · Matchday 2 ─────────────────────────────────────────────
  // Jun 18
  { g:"B", d:"Jun 18", t:"12:00", h:"Switzerland",  a:"Bosnia",        s:[4,1], st:"FT", v:"SoFi Stadium, Los Angeles" },
  { g:"A", d:"Jun 18", t:"12:00", h:"South Africa", a:"Czechia",       s:[1,1], st:"FT", v:"Mercedes-Benz Stadium, Atlanta" },
  { g:"B", d:"Jun 18", t:"15:00", h:"Canada",       a:"Qatar",         s:[6,0], st:"FT", v:"BC Place, Vancouver" },
  { g:"A", d:"Jun 18", t:"19:00", h:"Mexico",       a:"South Korea",   s:[1,0], st:"FT", v:"Estadio Akron, Guadalajara" },
  // Jun 19
  { g:"D", d:"Jun 19", t:"12:00", h:"USA",          a:"Australia",     s:[2,0], st:"FT", v:"Lumen Field, Seattle" },
  { g:"C", d:"Jun 19", t:"18:00", h:"Scotland",     a:"Morocco",       s:[0,1], st:"FT", v:"Gillette Stadium, Boston" },
  { g:"D", d:"Jun 19", t:"20:00", h:"Türkiye",      a:"Paraguay",      s:[0,1], st:"FT", v:"Levi's Stadium, San Francisco" },
  { g:"C", d:"Jun 19", t:"20:30", h:"Brazil",       a:"Haiti",         s:[3,0], st:"FT", v:"Lincoln Financial Field, Philadelphia" },
  // Jun 20
  { g:"F", d:"Jun 20", t:"12:00", h:"Netherlands",  a:"Sweden",        s:[5,1], st:"FT", v:"NRG Stadium, Houston" },
  { g:"E", d:"Jun 20", t:"16:00", h:"Germany",      a:"Ivory Coast",   s:[2,1], st:"FT", v:"BMO Field, Toronto" },
  { g:"E", d:"Jun 20", t:"19:00", h:"Ecuador",      a:"Curaçao",       s:[0,0], st:"FT", v:"Arrowhead Stadium, Kansas City" },
  { g:"F", d:"Jun 20", t:"22:00", h:"Tunisia",      a:"Japan",         s:[0,4], st:"FT", v:"Estadio BBVA, Monterrey" },
  // Jun 21
  { g:"G", d:"Jun 21", t:"12:00", h:"Belgium",      a:"Iran",          s:[0,0], st:"FT", v:"SoFi Stadium, Los Angeles" },
  { g:"H", d:"Jun 21", t:"12:00", h:"Spain",        a:"Saudi Arabia",  s:[4,0], st:"FT", v:"Mercedes-Benz Stadium, Atlanta" },
  { g:"G", d:"Jun 21", t:"18:00", h:"New Zealand",  a:"Egypt",         s:[1,3], st:"FT", v:"BC Place, Vancouver" },
  { g:"H", d:"Jun 21", t:"18:00", h:"Uruguay",      a:"Cape Verde",    s:[2,2], st:"FT", v:"Hard Rock Stadium, Miami" },
  // Jun 22
  { g:"J", d:"Jun 22", t:"12:00", h:"Argentina",    a:"Austria",       s:[2,0], st:"FT", v:"AT&T Stadium, Dallas" },
  { g:"I", d:"Jun 22", t:"17:00", h:"France",       a:"Iraq",          s:[3,0], st:"FT", v:"Lincoln Financial Field, Philadelphia" },
  { g:"I", d:"Jun 22", t:"20:00", h:"Norway",       a:"Senegal",       s:[3,2], st:"FT", v:"MetLife Stadium, New York/NJ" },
  { g:"J", d:"Jun 22", t:"20:00", h:"Jordan",       a:"Algeria",       s:[1,2], st:"FT", v:"Levi's Stadium, San Francisco" },
  // Jun 23
  { g:"K", d:"Jun 23", t:"12:00", h:"Portugal",     a:"Uzbekistan",    s:[5,0], st:"FT", v:"NRG Stadium, Houston" },
  { g:"L", d:"Jun 23", t:"16:00", h:"England",      a:"Ghana",         s:[0,0], st:"FT", v:"Gillette Stadium, Boston" },
  { g:"L", d:"Jun 23", t:"19:00", h:"Panama",       a:"Croatia",       s:[0,1], st:"FT", v:"BMO Field, Toronto" },
  { g:"K", d:"Jun 23", t:"20:00", h:"Colombia",     a:"DR Congo",      s:[1,0], st:"FT", v:"Estadio Akron, Guadalajara" },

  // ── GROUP STAGE · Matchday 3 ─────────────────────────────────────────────
  // Jun 24
  { g:"B", d:"Jun 24", t:"12:00", h:"Bosnia",       a:"Qatar",         s:[3,1], st:"FT", v:"Lumen Field, Seattle" },
  { g:"B", d:"Jun 24", t:"12:00", h:"Switzerland",  a:"Canada",        s:[2,1], st:"FT", v:"BC Place, Vancouver" },
  { g:"C", d:"Jun 24", t:"18:00", h:"Morocco",      a:"Haiti",         s:[4,2], st:"FT", v:"Mercedes-Benz Stadium, Atlanta" },
  { g:"C", d:"Jun 24", t:"18:00", h:"Scotland",     a:"Brazil",        s:[0,3], st:"FT", v:"Hard Rock Stadium, Miami" },
  { g:"A", d:"Jun 24", t:"19:00", h:"Czechia",      a:"Mexico",        s:[0,3], st:"FT", v:"Estadio Banorte, Mexico City" },
  { g:"A", d:"Jun 24", t:"19:00", h:"South Africa", a:"South Korea",   s:[1,0], st:"FT", v:"Estadio BBVA, Monterrey" },
  // Jun 25
  { g:"E", d:"Jun 25", t:"16:00", h:"Ecuador",      a:"Germany",       s:[2,1], st:"FT", v:"MetLife Stadium, New York/NJ" },
  { g:"E", d:"Jun 25", t:"16:00", h:"Curaçao",      a:"Ivory Coast",   s:[0,2], st:"FT", v:"Lincoln Financial Field, Philadelphia" },
  { g:"F", d:"Jun 25", t:"18:00", h:"Japan",        a:"Sweden",        s:[1,1], st:"FT", v:"AT&T Stadium, Dallas" },
  { g:"F", d:"Jun 25", t:"18:00", h:"Tunisia",      a:"Netherlands",   s:[1,3], st:"FT", v:"Arrowhead Stadium, Kansas City" },
  { g:"D", d:"Jun 25", t:"19:00", h:"Paraguay",     a:"Australia",     s:[0,0], st:"FT", v:"Levi's Stadium, San Francisco" },
  { g:"D", d:"Jun 25", t:"19:00", h:"Türkiye",      a:"USA",           s:[3,2], st:"FT", v:"SoFi Stadium, Los Angeles" },
  // Jun 26
  { g:"I", d:"Jun 26", t:"15:00", h:"Norway",       a:"France",        s:[1,4], st:"FT", v:"Gillette Stadium, Boston" },
  { g:"I", d:"Jun 26", t:"15:00", h:"Senegal",      a:"Iraq",          s:[5,0], st:"FT", v:"BMO Field, Toronto" },
  { g:"H", d:"Jun 26", t:"18:00", h:"Uruguay",      a:"Spain",         s:[0,1], st:"FT", v:"Estadio Akron, Guadalajara" },
  { g:"H", d:"Jun 26", t:"19:00", h:"Cape Verde",   a:"Saudi Arabia",  s:[0,0], st:"FT", v:"NRG Stadium, Houston" },
  { g:"G", d:"Jun 26", t:"20:00", h:"Egypt",        a:"Iran",          s:[1,1], st:"FT", v:"Lumen Field, Seattle" },
  { g:"G", d:"Jun 26", t:"20:00", h:"New Zealand",  a:"Belgium",       s:[1,5], st:"FT", v:"BC Place, Vancouver" },
  // Jun 27
  { g:"L", d:"Jun 27", t:"17:00", h:"Panama",       a:"England",       s:[0,2], st:"FT", v:"MetLife Stadium, New York/NJ" },
  { g:"L", d:"Jun 27", t:"17:00", h:"Croatia",      a:"Ghana",         s:[2,1], st:"FT", v:"Lincoln Financial Field, Philadelphia" },
  { g:"K", d:"Jun 27", t:"19:30", h:"DR Congo",     a:"Uzbekistan",    s:[3,1], st:"FT", v:"Mercedes-Benz Stadium, Atlanta" },
  { g:"K", d:"Jun 27", t:"19:30", h:"Colombia",     a:"Portugal",      s:[0,0], st:"FT", v:"Hard Rock Stadium, Miami" },
  { g:"J", d:"Jun 27", t:"21:00", h:"Algeria",      a:"Austria",       s:[3,3], st:"FT", v:"Arrowhead Stadium, Kansas City" },
  { g:"J", d:"Jun 27", t:"21:00", h:"Jordan",       a:"Argentina",     s:[1,3], st:"FT", v:"AT&T Stadium, Dallas" },

  // ── ROUND OF 32 ──────────────────────────────────────────────────────────
  { g:"R32", d:"Jun 28", t:"12:00", h:"South Africa", a:"Canada",      st:"UP", v:"SoFi Stadium, Los Angeles" },
  { g:"R32", d:"Jun 29", t:"12:00", h:"Brazil",       a:"Japan",       st:"UP", v:"NRG Stadium, Houston" },
  { g:"R32", d:"Jun 29", t:"16:30", h:"Germany",      a:"Paraguay",    st:"UP", v:"Gillette Stadium, Boston" },
  { g:"R32", d:"Jun 29", t:"19:00", h:"Netherlands",  a:"Morocco",     st:"UP", v:"Estadio BBVA, Monterrey" },
  { g:"R32", d:"Jun 30", t:"12:00", h:"Ivory Coast",  a:"Norway",      st:"UP", v:"AT&T Stadium, Dallas" },
  { g:"R32", d:"Jun 30", t:"17:00", h:"France",       a:"Sweden",      st:"UP", v:"MetLife Stadium, New York/NJ" },
  { g:"R32", d:"Jun 30", t:"19:00", h:"Mexico",       a:"Ecuador",     st:"UP", v:"Estadio Banorte, Mexico City" },
  { g:"R32", d:"Jul 1",  t:"12:00", h:"England",      a:"DR Congo",    st:"UP", v:"Mercedes-Benz Stadium, Atlanta" },
  { g:"R32", d:"Jul 1",  t:"13:00", h:"Belgium",      a:"Senegal",     st:"UP", v:"Lumen Field, Seattle" },
  { g:"R32", d:"Jul 1",  t:"17:00", h:"USA",          a:"Bosnia",      st:"UP", v:"Levi's Stadium, San Francisco" },
  { g:"R32", d:"Jul 2",  t:"12:00", h:"Spain",        a:"Austria",     st:"UP", v:"SoFi Stadium, Los Angeles" },
  { g:"R32", d:"Jul 2",  t:"19:00", h:"Portugal",     a:"Croatia",     st:"UP", v:"BMO Field, Toronto" },
  { g:"R32", d:"Jul 2",  t:"20:00", h:"Switzerland",  a:"Algeria",     st:"UP", v:"BC Place, Vancouver" },
  { g:"R32", d:"Jul 3",  t:"13:00", h:"Australia",    a:"Egypt",       st:"UP", v:"AT&T Stadium, Dallas" },
  { g:"R32", d:"Jul 3",  t:"18:00", h:"Argentina",    a:"Cape Verde",  st:"UP", v:"Hard Rock Stadium, Miami" },
  { g:"R32", d:"Jul 3",  t:"20:30", h:"Colombia",     a:"Ghana",       st:"UP", v:"Arrowhead Stadium, Kansas City" },
];

export const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];
export const ROUND_LABELS = { R32:"Round of 32", R16:"Round of 16", QF:"Quarter-final", SF:"Semi-final", F:"Final", "3P":"3rd Place" };