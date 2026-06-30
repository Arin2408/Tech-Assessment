"use client";

/**
 * useTaskFeed — subscribe to the live WebSocket feed and dispatch normalized
 * events into the store.
 *
 * Handles:
 *  - reconnect with capped exponential backoff
 *  - clean teardown on unmount (no dangling sockets / timers)
 *  - unrecognized frames (parseFeedEvent returns null -> ignored)
 *  - events for not-yet-loaded tasks (handled in the slice as partial stubs)
 *
 * A connection-status value is exposed so the UI can show live/reconnecting.
 */

import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { applyFeedEvent } from "@/store/tasksSlice";
import { parseFeedEvent } from "@/lib/feed";
import { WS_URL } from "@/lib/api";

export type FeedStatus = "connecting" | "open" | "reconnecting" | "closed";

const MAX_BACKOFF_MS = 15_000;
const BASE_BACKOFF_MS = 1_000;

export function useTaskFeed(url: string = WS_URL): FeedStatus {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<FeedStatus>("connecting");

  // Refs survive re-renders so reconnect logic isn't torn down each render.
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUs = useRef(false);

  useEffect(() => {
    closedByUs.current = false;

    const connect = () => {
      setStatus(retryRef.current === 0 ? "connecting" : "reconnecting");
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setStatus("open");
      };

      ws.onmessage = (event: MessageEvent) => {
        const parsed = parseFeedEvent(event.data);
        if (parsed) dispatch(applyFeedEvent(parsed));
      };

      ws.onerror = () => {
        // onclose will follow; reconnect is scheduled there.
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!closedByUs.current) scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (closedByUs.current) return;
      setStatus("reconnecting");
      const attempt = retryRef.current++;
      const delay = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      timerRef.current = setTimeout(connect, delay);
    };

    connect();

    return () => {
      closedByUs.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      wsRef.current = null;
      setStatus("closed");
    };
  }, [url, dispatch]);

  return status;
}
