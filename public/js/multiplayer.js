/* ═══════════════════════════════════════════════
   multiplayer.js — PeerJS WebRTC multiplayer
   Host creates a room, guests join with room code.
   Host runs AI. All players share the narrative.
   ═══════════════════════════════════════════════ */

const Multiplayer = (() => {
  let peer = null;
  let connections = []; // host keeps all guest connections
  let hostConn = null;  // guest keeps connection to host
  let isHost = false;
  let roomCode = null;
  let playerName = "";
  let onMessage = null; // callback: (type, data) => void
  let onPlayerJoin = null;
  let onPlayerLeave = null;

  function init(name, callbacks = {}) {
    playerName = name;
    onMessage = callbacks.onMessage || (() => {});
    onPlayerJoin = callbacks.onPlayerJoin || (() => {});
    onPlayerLeave = callbacks.onPlayerLeave || (() => {});
  }

  /**
   * Host a game — returns room code via callback
   */
  function host(onReady) {
    isHost = true;
    peer = new Peer();

    peer.on("open", (id) => {
      roomCode = id;
      onReady(id);
    });

    peer.on("connection", (conn) => {
      conn.on("open", () => {
        connections.push(conn);
        conn.on("data", (data) => handleIncoming(data, conn));
        conn.on("close", () => {
          connections = connections.filter((c) => c !== conn);
          onPlayerLeave(data?.name || "A player");
        });
        // Send current game state to new joiner
        onPlayerJoin(conn);
      });
    });

    peer.on("error", (err) => {
      console.error("PeerJS host error:", err);
      onMessage("error", { message: "Multiplayer error: " + err.type });
    });
  }

  /**
   * Join a game with a room code
   */
  function join(code, onReady) {
    isHost = false;
    roomCode = code;
    peer = new Peer();

    peer.on("open", () => {
      hostConn = peer.connect(code, { reliable: true });

      hostConn.on("open", () => {
        // Send join message
        hostConn.send({ type: "join", name: playerName });
        onReady();
      });

      hostConn.on("data", (data) => handleIncoming(data, hostConn));

      hostConn.on("close", () => {
        onMessage("system", { message: "Disconnected from host." });
        hostConn = null;
      });
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

  /**
   * Broadcast data to all connected peers
   * Host: sends to all guests. Guest: sends to host.
   */
  function broadcast(data) {
    if (isHost) {
      for (const conn of connections) {
        try { conn.send(data); } catch {}
      }
    } else if (hostConn) {
      try { hostConn.send(data); } catch {}
    }
  }

  /**
   * Send a player action (guest → host, or host broadcasts narrative)
   */
  function sendAction(text) {
    broadcast({ type: "player-action", name: playerName, text });
  }

  function sendNarrative(text, author) {
    broadcast({ type: "narrative", text, author });
  }

  function sendGameState(state) {
    broadcast({ type: "game-state", state });
  }

  function sendSystemMessage(message) {
    broadcast({ type: "system", message });
  }

  function isConnected() {
    if (isHost) return connections.length > 0;
    return hostConn !== null;
  }

  function isHosting() { return isHost; }
  function getRoomCode() { return roomCode; }
  function getPlayerCount() { return isHost ? connections.length + 1 : (hostConn ? 2 : 1); }

  function disconnect() {
    if (peer) { try { peer.destroy(); } catch {} }
    peer = null;
    connections = [];
    hostConn = null;
    isHost = false;
    roomCode = null;
  }

  return {
    init, host, join, broadcast, sendAction, sendNarrative,
    sendGameState, sendSystemMessage, isConnected, isHosting,
    getRoomCode, getPlayerCount, disconnect,
  };
})();
