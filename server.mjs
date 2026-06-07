import { createServer } from "node:http";
import next from "next";
import { WebSocket, WebSocketServer } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  handle(req, res);
});

const wss = new WebSocketServer({ noServer: true });
const clients = new Map();

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${hostname}:${port}`}`);

  if (url.pathname !== "/ws/logistics/maps") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws, request) => {
  const client = {
    cookie: request.headers.cookie || "",
    lastPayload: "",
    timer: null,
  };

  const push = async () => {
    if (ws.readyState !== WebSocket.OPEN) return;

    try {
      const response = await fetch(`http://${hostname}:${port}/api/logistics/maps`, {
        headers: client.cookie ? { cookie: client.cookie } : {},
        cache: "no-store",
      });

      if (!response.ok) {
        ws.send(JSON.stringify({ type: "error", status: response.status }));
        if (response.status === 401 || response.status === 403) ws.close();
        return;
      }

      const data = await response.json();
      const payload = JSON.stringify({ type: "maps", data });
      if (payload !== client.lastPayload) {
        client.lastPayload = payload;
        ws.send(payload);
      }
    } catch {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "error", status: 500 }));
    }
  };

  clients.set(ws, client);
  void push();
  client.timer = setInterval(push, 2000);

  ws.on("close", () => {
    if (client.timer) clearInterval(client.timer);
    clients.delete(ws);
  });
});

server.listen(port, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
  console.log(`> WebSocket maps on ws://${hostname}:${port}/ws/logistics/maps`);
});
