// /api/hero-image — POST { prompt }  ->  { image: "data:image/png;base64,..." }
// Calls Google's Gemini image model ("nano banana") server-side so GEMINI_API_KEY
// is NEVER shipped to the browser. Generates ORIGINAL art only — no real people/logos.

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";

// Guard rail appended to every prompt to keep output portfolio-safe.
const SAFE_SUFFIX =
  " Style: original digital illustration, abstract and atmospheric. " +
  "Do NOT depict any real, identifiable person, player, celebrity, team crest, " +
  "brand, or trademarked logo. No text overlays.";

export default async function handler(req, res){
  if(req.method !== "POST"){ res.status(405).json({ error:"POST only" }); return; }
  const key = process.env.GEMINI_API_KEY;
  if(!key){ res.status(501).json({ error:"GEMINI_API_KEY not configured" }); return; }

  const prompt = (req.body?.prompt || "Cinematic packed football stadium at golden hour")
    .slice(0, 600) + SAFE_SUFFIX;

  try{
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      }
    );
    if(!r.ok){ res.status(502).json({ error:"Gemini upstream " + r.status, detail: await r.text() }); return; }
    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const img = parts.find(p => p.inlineData?.data);
    if(!img){ res.status(502).json({ error:"No image returned", raw:data }); return; }
    const mime = img.inlineData.mimeType || "image/png";
    res.status(200).json({ image: `data:${mime};base64,${img.inlineData.data}` });
  }catch(err){
    res.status(500).json({ error: String(err) });
  }
}
