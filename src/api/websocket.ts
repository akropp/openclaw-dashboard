import type { GatewayConfig, ConnectionStatus, WsMessage, WsResponse, WsEvent } from "./types";
import { loadOrCreateDeviceIdentity, signDevicePayload, buildDeviceAuthPayload } from "./device-identity";

const CLIENT_ID = "openclaw-control-ui";
const CLIENT_VERSION = "1.0.0";
const CLIENT_MODE = "ui";
const CLIENT_ROLE = "operator";
const CLIENT_SCOPES = ["operator.admin", "operator.read", "operator.write", "operator.approvals", "operator.pairing"];

const REQUEST_TIMEOUT_MS = 10_000;

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class OpenClawWebSocket {
  private readonly config: GatewayConfig;
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = "disconnected";

  private requestCounter = 0;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private connectNonce: string | null = null;

  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly eventHandlers = new Set<(event: WsEvent) => void>();
  private readonly statusHandlers = new Set<(status: ConnectionStatus) => void>();

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  connect(): void {
    this.intentionalClose = false;
    this.openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.rejectAllPending(new Error("WebSocket disconnected by client"));
    if (this.socket !== null) {
      this.socket.close(1000, "client disconnect");
      this.socket = null;
    }
    this.setStatus("disconnected");
  }

  request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.socket === null || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not connected"));
        return;
      }

      const id = this.nextId();

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timed out: ${method} (id=${id})`));
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      const message = JSON.stringify({
        type: "req",
        id,
        method,
        params: params ?? {},
      });

      this.socket.send(message);
    });
  }

  onEvent(handler: (event: WsEvent) => void): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  // -------------------------------------------------------------------------
  // Socket lifecycle
  // -------------------------------------------------------------------------

  private openSocket(): void {
    if (this.status === "connecting" || this.status === "connected") {
      return;
    }

    this.setStatus(this.reconnectAttempt === 0 ? "connecting" : "reconnecting");
    this.connectNonce = null;

    const socket = new WebSocket(this.config.url);
    this.socket = socket;

    socket.addEventListener("open", () => this.handleOpen());
    socket.addEventListener("message", (ev: MessageEvent<string>) => this.handleMessage(ev));
    socket.addEventListener("close", (ev: CloseEvent) => this.handleClose(ev));
    socket.addEventListener("error", () => {});
  }

  private handleOpen(): void {
    this.reconnectAttempt = 0;
    // Wait for connect.challenge event from gateway before sending connect.
  }

  private handleMessage(ev: MessageEvent<string>): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(ev.data) as unknown;
    } catch {
      return;
    }

    // Check for connect.challenge event (sent before connect handshake)
    const frame = parsed as { type?: string; event?: string; payload?: { nonce?: string } };
    if (frame.type === "event" || frame.type === "evt") {
      if (frame.event === "connect.challenge") {
        const nonce = frame.payload?.nonce;
        if (typeof nonce === "string") {
          this.connectNonce = nonce;
          void this.sendConnect();
        }
        return;
      }
    }

    if (!isWsMessage(parsed)) {
      return;
    }

    const message: WsMessage = parsed;

    switch (message.type) {
      case "res":
        this.routeResponse(message);
        break;
      case "evt":
        this.routeEvent(message);
        break;
      case "req":
        break;
    }
  }

  private handleClose(ev: CloseEvent): void {
    this.socket = null;
    this.connectNonce = null;

    if (this.intentionalClose) {
      this.setStatus("disconnected");
      return;
    }

    this.rejectAllPending(
      new Error(`WebSocket closed unexpectedly (code=${ev.code}, reason=${ev.reason})`)
    );

    this.scheduleReconnect();
  }

  // -------------------------------------------------------------------------
  // Connect handshake with device identity
  // -------------------------------------------------------------------------

  private async sendConnect(): Promise<void> {
    if (this.socket === null || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const connectId = "connect-1";

    const timer = setTimeout(() => {
      this.pendingRequests.delete(connectId);
      this.socket?.close(1000, "connect handshake timeout");
    }, REQUEST_TIMEOUT_MS);

    this.pendingRequests.set(connectId, {
      resolve: () => {
        this.setStatus("connected");
      },
      reject: (err: Error) => {
        console.error("Connect handshake failed:", err.message);
        this.socket?.close(1000, "connect handshake rejected");
      },
      timer,
    });

    const deviceIdentity = await loadOrCreateDeviceIdentity();
    const signedAtMs = Date.now();
    const nonce = this.connectNonce ?? "";
    const authToken = this.config.token;

    const payload = buildDeviceAuthPayload({
      deviceId: deviceIdentity.deviceId,
      clientId: CLIENT_ID,
      clientMode: CLIENT_MODE,
      role: CLIENT_ROLE,
      scopes: CLIENT_SCOPES,
      signedAtMs,
      token: authToken,
      nonce,
    });
    const signature = await signDevicePayload(deviceIdentity.privateKey, payload);

    const authMessage = JSON.stringify({
      type: "req",
      id: connectId,
      method: "connect",
      params: {
        auth: { token: authToken },
        client: {
          id: CLIENT_ID,
          version: CLIENT_VERSION,
          platform: navigator.platform ?? "web",
          mode: CLIENT_MODE,
        },
        role: CLIENT_ROLE,
        scopes: CLIENT_SCOPES,
        device: {
          id: deviceIdentity.deviceId,
          publicKey: deviceIdentity.publicKey,
          signature,
          signedAt: signedAtMs,
          nonce,
        },
        caps: [],
        minProtocol: 3,
        maxProtocol: 3,
      },
    });

    this.socket.send(authMessage);
  }

  // -------------------------------------------------------------------------
  // Message routing
  // -------------------------------------------------------------------------

  private routeResponse(message: WsResponse): void {
    const pending = this.pendingRequests.get(message.id);
    if (pending === undefined) {
      return;
    }

    this.pendingRequests.delete(message.id);
    clearTimeout(pending.timer);

    if (message.error !== undefined || message.ok === false) {
      const errMsg = message.error
        ? `Server error ${message.error.code}: ${message.error.message}`
        : "Request failed";
      pending.reject(new Error(errMsg));
    } else {
      pending.resolve(message.payload ?? message.result);
    }
  }

  private routeEvent(message: WsEvent): void {
    this.eventHandlers.forEach((handler) => handler(message));
  }

  // -------------------------------------------------------------------------
  // Reconnection
  // -------------------------------------------------------------------------

  private scheduleReconnect(): void {
    const delay = Math.min(
      BACKOFF_BASE_MS * Math.pow(2, this.reconnectAttempt),
      BACKOFF_MAX_MS
    );
    this.reconnectAttempt += 1;

    this.setStatus("reconnecting");

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) {
      return;
    }
    this.status = next;
    this.statusHandlers.forEach((handler) => handler(next));
  }

  private nextId(): string {
    this.requestCounter += 1;
    return `req-${this.requestCounter}`;
  }

  private rejectAllPending(reason: Error): void {
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.reject(reason);
    });
    this.pendingRequests.clear();
  }
}

// -------------------------------------------------------------------------
// Type guard
// -------------------------------------------------------------------------

function isWsMessage(value: unknown): value is WsMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj["type"] !== "string") {
    return false;
  }

  switch (obj["type"]) {
    case "req":
      return (
        typeof obj["id"] === "string" &&
        typeof obj["method"] === "string" &&
        typeof obj["params"] === "object" &&
        obj["params"] !== null
      );
    case "res":
      return typeof obj["id"] === "string";
    case "evt":
      return typeof obj["event"] === "string";
    default:
      return false;
  }
}
