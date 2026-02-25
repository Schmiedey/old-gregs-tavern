/* ═══════════════════════════════════════════════
   multiplayer.js — PeerJS WebRTC multiplayer
   ═══════════════════════════════════════════════ */

const Multiplayer = (() => {
  let peer = null;
  let connections = [];
  let hostConn = null;
  let isHost = false;
  let roomCode = null;
  let playerName = "";
  let onMessage = null;
  let onPlayerJoin = null;
  let onPlayerLeave = null;

  function init(name, callbacks = {}) {
    playerName = name;
    onMessage = callbacks.onMessage || (() => {});
    onPlayerJoin = callbacks.onPlayerJoin || (() => {});
    onPlayerLeave = callbacks.onPlayerLeave || (() => {});
  }

  function host(onReady) {
    isHost = true;
    peer = new Peer();
    peer.on("open", (id) => { roomCode = id; onReady(id); });
    peer.on("connection", (conn) => {
      conn.on("open", () => {
        connections.push(conn);
        conn.on("data", (data) => handleIncoming(data, conn));
        conn.on("close", () => {
          connections = connections.filter((c) => c !== conn);
          onPlayerLeave("A player");
        });
        onPlayerJoin(conn);
      });
    });
    peer.on("error", (err) => {
      console.error("PeerJS host error:", err);
      onMessage("error", { message: "Multiplayer error: " + err.type });
    });
  }

  function join(code, onReady) {
    isHost = false;
    roomCode = code;
    peer = new Peer();
    peer.on("open", () => {
      hostConn = peer.connect(code, { reliable: true });
      hostConn.on("open", () => { hostConn.send({ type: "join", name: playerName }); onReady(); });
      hostConn.on("data", (data) => handleIncoming(data, hostConn));
      hostConn.on("close", () => { onMessage("system", { message: "Disconnected from host." }); hostConn = null; });
    });
    peer.on("error", (err) => {
      console.error("PeerJS join error:", err);
      onMessage("error", { message: "Could not connect: " + err.type });
    });
  }

  function handleIncoming(data, conn) {
    if (!data || !data.type) return;
    onMessage(data.type, data);
  }

  function broadcast(data) {
    if (isHost) { for (const conn of connections) { try { conn.send(data); } catch {} } }
    else if (hostConn) { try { hostConn.send(data); } catch {} }
  }

  function sendAction(text) { broadcast({ type: "player-action", name: playerName, text }); }
  function sendNarrative(text, author) { broadcast({ type: "narrative", text, author }); }
  function sendGameState(state) { broadcast({ type: "game-state", state }); }
  function sendSystemMessage(msg) { broadcast({ type: "system", message: msg }); }

  function isHosting() { return isHost && connections.length > 0; }
  function isConnected() { return isHost ? connections.length > 0 : !!hostConn; }

  return { init, host, join, broadcast, sendAction, sendNarrative, sendGameState, sendSystemMessage, isHosting, isConnected };
})();
