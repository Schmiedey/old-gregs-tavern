/* ═══════════════════════════════════════════════
   server.js — Local dev server with streaming proxy
   Optional: the game works client-side on GitHub Pages
   without this server. This is for local development
   so your API key stays out of the browser.
   ═══════════════════════════════════════════════ */

require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

app.use(express.json());
app.use(express.static("public"));

app.post("/api/chat", async (req, res) => {
  const { model, messages, temperature, max_tokens, stream } = req.body;
  const body = {
    model: model || "google/gemini-2.0-flash-001",
    messages,
    temperature: temperature ?? 0.85,
    max_tokens: max_tokens ?? 1024,
    stream: !!stream,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": "http://localhost:" + PORT,
        "X-Title": "Old Greg's Tavern",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).send(errText);
    }

    if (stream) {
      // Stream SSE through to the client
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); return; }
          res.write(Buffer.from(value));
        }
      };
      pump().catch((err) => {
        console.error("Stream error:", err);
        res.end();
      });
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🍺 Old Greg's Tavern — http://localhost:${PORT}\n`);
  console.log(`   API Key: ${API_KEY ? "✅ loaded from .env" : "⚠️  not set — game will use client-side key"}`);
  console.log(`   Streaming proxy enabled\n`);
});
