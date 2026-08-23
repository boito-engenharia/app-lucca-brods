// BRODS — servidor de salas (relay por WebSocket). O jogo roda no aparelho do dono da sala;
// este Worker só apresenta os jogadores uns aos outros e repassa mensagens.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': '*' };
function makeCode(n = 4) { let s = ''; for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }

export default {
  async fetch(req, bindings) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/') return new Response('BRODS server ok', { headers: CORS });
    if (url.pathname === '/new') {
      for (let i = 0; i < 5; i++) {
        const c = makeCode(); const id = bindings.ROOM.idFromName(c); const stub = bindings.ROOM.get(id);
        const r = await stub.fetch('https://room/status'); const st = await r.json();
        if (!st.members) { await stub.fetch('https://room/reserve'); return Response.json({ code: c }, { headers: CORS }); }
      }
      return Response.json({ error: 'tente de novo' }, { status: 500, headers: CORS });
    }
    const m = url.pathname.match(/^\/room\/([A-Z0-9]{4,6})$/i);
    if (m) { const id = bindings.ROOM.idFromName(m[1].toUpperCase()); return bindings.ROOM.get(id).fetch(req); }
    return new Response('not found', { status: 404, headers: CORS });
  }
};

export class Room {
  constructor(state, bindings) { this.state = state; }
  hostWs() { return this.state.getWebSockets('host')[0] || null; }
  hostIdNow() { const h = this.hostWs(); if (!h) return null; const a = h.deserializeAttachment() || {}; return a.id || null; }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/status') { const n = this.state.getWebSockets().length; const ra = (await this.state.storage.get('reservedAt')) || 0; const fresh = ra && Date.now() - ra < 60000; return Response.json({ members: n || (fresh ? 1 : 0) }); }
    if (url.pathname === '/reserve') { await this.state.storage.put('reservedAt', Date.now()); return Response.json({ ok: true }); }
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426, headers: CORS });
    const name = (url.searchParams.get('name') || 'Jogador').slice(0, 14);
    const wantHost = url.searchParams.get('host') === '1';
    const pid = url.searchParams.get('id') || crypto.randomUUID().slice(0, 8);
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    const sockets = this.state.getWebSockets();
    if (sockets.length >= 12) { server.accept(); server.close(1008, 'sala cheia'); return new Response(null, { status: 101, webSocket: client }); }
    // se o host ainda está conectado, o pedido de host é ignorado
    const hostAlive = !!this.hostWs();
    const isHost = !hostAlive && (wantHost || sockets.length === 0);
    this.state.acceptWebSocket(server, [pid, isHost ? 'host' : 'guest']);
    server.serializeAttachment({ id: pid, name, host: isHost, color: url.searchParams.get('color') || '0' });
    const hostId = this.hostIdNow(); const members = this.members();
    server.send(JSON.stringify({ t: 'welcome', you: pid, host: hostId, members }));
    this.broadcast({ t: 'members', members, host: hostId }, server);
    return new Response(null, { status: 101, webSocket: client });
  }
  members() { return this.state.getWebSockets().map(ws => { const a = ws.deserializeAttachment() || {}; return { id: a.id, name: a.name, host: !!a.host, color: a.color }; }); }
  broadcast(obj, except) { const s = typeof obj === 'string' ? obj : JSON.stringify(obj); for (const ws of this.state.getWebSockets()) { if (ws === except) continue; try { ws.send(s); } catch (e) { } } }
  sendTo(id, s) { for (const ws of this.state.getWebSockets(id)) { try { ws.send(s); } catch (e) { } } }
  async webSocketMessage(ws, msg) {
    const a = ws.deserializeAttachment() || {};
    if (typeof msg !== 'string') return;
    if (msg === 'ping') { ws.send('pong'); return; }
    if (a.host) {
      // host → "*:<json>" (todos) ou "<id>:<json>" (um jogador)
      const i = msg.indexOf(':'); if (i > 0 && i < 10) { const to = msg.slice(0, i); const body = msg.slice(i + 1); if (to === '*') this.broadcast(body, ws); else this.sendTo(to, body); return; }
      this.broadcast(msg, ws);
    } else {
      // convidado → host, com o id do remetente prefixado
      const h = this.hostWs(); if (h) { try { h.send(a.id + ':' + msg); } catch (e) { } }
    }
  }
  async webSocketClose(ws, code, reason) {
    const a = ws.deserializeAttachment() || {};
    try { ws.close(); } catch (e) { }
    if (a.host) { this.broadcast({ t: 'host_left' }); for (const s of this.state.getWebSockets()) { try { s.close(1000, 'host saiu'); } catch (e) { } } return; }
    const members = this.members().filter(m => m.id !== a.id); const hostId = this.hostIdNow();
    this.broadcast({ t: 'members', members, host: hostId });
    const h = this.hostWs(); if (h) { try { h.send(JSON.stringify({ t: 'left', id: a.id, name: a.name })); } catch (e) { } }
  }
  async webSocketError(ws) { await this.webSocketClose(ws); }
}
