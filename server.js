require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;

app.use(express.json({ limit: "64kb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ───────── AI proxy endpoint ───────── */
app.post("/api/chat", async (req, res) => {
  const { messages, temperature = 0.85, max_tokens = 1024 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages[] required" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Old Greg's Tavern",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", response.status, err);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ───────── Dice endpoint (server-authoritative rolls) ───────── */
app.get("/api/roll/:sides", (req, res) => {
  const sides = parseInt(req.params.sides, 10) || 20;
  const count = Math.min(parseInt(req.query.n, 10) || 1, 20);
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  res.json({ sides, rolls, total: rolls.reduce((a, b) => a + b, 0) });
});

/* ───────── SPA fallback ───────── */
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n⚔️  Old Greg's Tavern is open on http://localhost:${PORT}\n`);
});
