// POST /api/commentary  { text: "GOAL! Mbappé slots it home in the 23rd minute!" }
//  -> audio/mpeg stream
//
// Converts short match commentary text to speech via ElevenLabs. Key stays
// server-side. Free tier: 10k characters/month — plenty for goal-moment clips.

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    res.status(501).json({ error: "ELEVENLABS_API_KEY not configured — commentary audio disabled on this deployment." });
    return;
  }

  const { text, voiceId } = req.body || {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing 'text' in request body" });
    return;
  }
  if (text.length > 300) {
    res.status(400).json({ error: "Text too long — keep commentary clips under 300 characters to conserve free-tier quota." });
    return;
  }

  // Default voice: "Adam" (a standard pre-made ElevenLabs voice, free tier compatible).
  const VOICE = voiceId || "pNInz6obpgDQGcFmaJgB";

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.6, use_speaker_boost: true },
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      throw new Error(`ElevenLabs ${r.status}: ${errText.slice(0, 200)}`);
    }

    const audioBuffer = await r.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store"); // each clip is unique commentary
    res.status(200).send(Buffer.from(audioBuffer));
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
