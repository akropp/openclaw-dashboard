import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type React from "react";
import type { ConnectionStatus, GatewayConfig, WsEvent } from "./types";
import { OpenClawWebSocket } from "./websocket";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const GATEWAY_URL_KEY = "openclaw-gateway-url";
const GATEWAY_TOKEN_KEY = "openclaw-gateway-token";

const POLLING_INTERVAL_MS = 30_000;

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

interface WebSocketContextValue {
  ws: OpenClawWebSocket | null;
  connectionStatus: ConnectionStatus;
  configure: (url: string, token: string) => void;
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

interface WebSocketProviderProps {
  children: React.ReactNode;
}

function readConfig(): GatewayConfig | null {
  const url = localStorage.getItem(GATEWAY_URL_KEY);
  const token = localStorage.getItem(GATEWAY_TOKEN_KEY);
  if (url !== null && token !== null && url.length > 0 && token.length > 0) {
    return { url, token };
  }
  return null;
}

export function WebSocketProvider({ children }: WebSocketProviderProps): React.ReactNode {
  const wsRef = useRef<OpenClawWebSocket | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  // Initialise the ws instance from whatever is already in localStorage.
  // We do this lazily so the ref is stable across renders.
  if (wsRef.current === null) {
    const config = readConfig();
    if (config !== null) {
      wsRef.current = new OpenClawWebSocket(config);
    }
  }

  // Attach status listener and connect on first mount, clean up on unmount.
  useEffect(() => {
    const ws = wsRef.current;
    if (ws === null) {
      return;
    }

    // Sync state with the instance's current status immediately.
    setConnectionStatus(ws.getStatus());

    const unsubscribe = ws.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    ws.connect();

    return () => {
      unsubscribe();
      ws.disconnect();
    };
  }, []); // intentionally empty — we only want mount/unmount lifecycle here

  const configure = useCallback((url: string, token: string): void => {
    // Persist to localStorage.
    localStorage.setItem(GATEWAY_URL_KEY, url);
    localStorage.setItem(GATEWAY_TOKEN_KEY, token);

    // Tear down the existing connection if one is active.
    if (wsRef.current !== null) {
      wsRef.current.disconnect();
    }

    // Create a fresh instance with the new config.
    const ws = new OpenClawWebSocket({ url, token });
    wsRef.current = ws;

    // Wire up the status listener before connecting.
    setConnectionStatus(ws.getStatus());
    ws.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    ws.connect();
  }, []);

  const value: WebSocketContextValue = {
    ws: wsRef.current,
    connectionStatus,
    configure,
  };

  // hooks.ts is a plain .ts file (no JSX transform in scope here), so we use
  // createElement directly instead of JSX syntax.
  return createElement(WebSocketContext.Provider, { value }, children);
}

// -----------------------------------------------------------------------------
// useWebSocket
// -----------------------------------------------------------------------------

export function useWebSocket(): OpenClawWebSocket {
  const ctx = useContext(WebSocketContext);
  if (ctx === null) {
    throw new Error("useWebSocket must be used inside <WebSocketProvider>");
  }
  if (ctx.ws === null) {
    throw new Error(
      "useWebSocket: no WebSocket instance available — call configure() first"
    );
  }
  return ctx.ws;
}

// -----------------------------------------------------------------------------
// useConnectionStatus
// -----------------------------------------------------------------------------

export function useConnectionStatus(): ConnectionStatus {
  const ctx = useContext(WebSocketContext);
  if (ctx === null) {
    throw new Error("useConnectionStatus must be used inside <WebSocketProvider>");
  }
  return ctx.connectionStatus;
}

// -----------------------------------------------------------------------------
// useGatewayConfig
// -----------------------------------------------------------------------------

interface UseGatewayConfigResult {
  config: GatewayConfig | null;
  configure: (url: string, token: string) => void;
}

export function useGatewayConfig(): UseGatewayConfigResult {
  const ctx = useContext(WebSocketContext);
  if (ctx === null) {
    throw new Error("useGatewayConfig must be used inside <WebSocketProvider>");
  }

  // Derive the current config directly from localStorage so that it reflects
  // the values that were most recently persisted by configure().
  const [config, setConfig] = useState<GatewayConfig | null>(readConfig);

  const configure = useCallback(
    (url: string, token: string): void => {
      ctx.configure(url, token);
      setConfig({ url, token });
    },
    [ctx]
  );

  return { config, configure };
}

// -----------------------------------------------------------------------------
// useRequest
// -----------------------------------------------------------------------------

interface UseRequestResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRequest<T>(
  method: string,
  params?: Record<string, unknown>
): UseRequestResult<T> {
  const ctx = useContext(WebSocketContext);
  if (ctx === null) {
    throw new Error("useRequest must be used inside <WebSocketProvider>");
  }

  const { ws, connectionStatus } = ctx;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to params to avoid unnecessary effect re-runs when the
  // caller passes an inline object literal.
  const paramsRef = useRef<Record<string, unknown> | undefined>(params);
  paramsRef.current = params;

  // fetchCounter is incremented by refetch() to trigger a manual re-fetch.
  const [fetchCounter, setFetchCounter] = useState(0);

  const fetch = useCallback((): void => {
    if (ws === null || connectionStatus !== "connected") {
      return;
    }

    setLoading(true);
    setError(null);

    ws.request<T>(method, paramsRef.current)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setLoading(false);
      });
  }, [ws, connectionStatus, method]);

  // Fetch on mount, when method changes, when the connection becomes live, or
  // when refetch() is called.
  useEffect(() => {
    fetch();
  }, [fetch, fetchCounter]);

  // 30-second polling fallback.
  useEffect(() => {
    if (connectionStatus !== "connected") {
      return;
    }

    const id = setInterval(() => {
      fetch();
    }, POLLING_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, [fetch, connectionStatus]);

  const refetch = useCallback((): void => {
    setFetchCounter((c) => c + 1);
  }, []);

  return { data, loading, error, refetch };
}

// -----------------------------------------------------------------------------
// useEvents
// -----------------------------------------------------------------------------

export function useEvents(
  eventType: string,
  handler: (data: unknown) => void
): void {
  const ctx = useContext(WebSocketContext);
  if (ctx === null) {
    throw new Error("useEvents must be used inside <WebSocketProvider>");
  }

  const { ws } = ctx;

  // Keep a stable ref to the handler so the effect does not need to re-run
  // every time the caller's inline function reference changes.
  const handlerRef = useRef<(data: unknown) => void>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (ws === null) {
      return;
    }

    const unsubscribe = ws.onEvent((event: WsEvent) => {
      if (event.event === eventType) {
        handlerRef.current(event.data);
      }
    });

    return unsubscribe;
  }, [ws, eventType]);
}
