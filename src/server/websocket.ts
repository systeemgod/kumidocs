import type { PresenceUser, User, WsClientMessage, WsServerMessage } from "@/lib/types";
import type { ServerWebSocket } from "bun";

interface WsData {
  user: User;
  pageId: string | undefined;
  sessionId: string;
  lastHeartbeat: number;
}

let sessionCounter = 0;

const sessions = new Map<string, ServerWebSocket<WsData>>(); // sessionId -> ws
const pageViewers = new Map<string, Set<string>>(); // pageId -> Set<sessionId>
const pageEditors = new Map<string, string>(); // pageId -> sessionId holding edit-lock

function send(ws: ServerWebSocket<WsData>, msg: WsServerMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch (error: unknown) {
    console.error("WebSocket send error:", error);
  }
}

// ── Sync status tracking ──────────────────────────────────────────────────────
// Tracks whether the server can reach and sync with the remote git origin.
// Broadcasts to all connected clients on state changes so the UI can show
// a persistent banner when remote sync is degraded.

type SyncState = "ok" | "failing";
interface SyncStatus {
  pull: SyncState;
  push: SyncState;
}

let currentSyncStatus: SyncStatus = { pull: "ok", push: "ok" };

function broadcastConfigChanged(): void {
  const msg: WsServerMessage = { type: "config_changed" };
  for (const ws of sessions.values()) {
    send(ws, msg);
  }
}

function broadcastSyncStatus(status: SyncStatus): void {
  const prev = currentSyncStatus;
  // Avoid spamming clients with no-op updates
  if (prev.pull === status.pull && prev.push === status.push) {
    return;
  }
  currentSyncStatus = status;
  const msg: WsServerMessage = { ...status, type: "sync_status" };
  for (const ws of sessions.values()) {
    send(ws, msg);
  }
}

/** Fetch the current sync status (for sending to newly connected clients). */
function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

function broadcastToAll(msg: WsServerMessage): void {
  for (const ws of sessions.values()) {
    send(ws, msg);
  }
}

function broadcastToPage(pageId: string, msg: WsServerMessage, except?: string): void {
  const sids = pageViewers.get(pageId);
  if (!sids) {
    return;
  }
  for (const sid of sids) {
    if (sid === except) {
      continue;
    }
    const ws = sessions.get(sid);
    if (ws) {
      send(ws, msg);
    }
  }
}

function presenceUpdate(pageId: string): WsServerMessage {
  const sids = pageViewers.get(pageId) ?? new Set<string>();
  const editorSid = pageEditors.get(pageId);

  const viewers: PresenceUser[] = [];
  let editor: PresenceUser | undefined;

  for (const sid of sids) {
    const ws = sessions.get(sid);
    if (!ws) {
      continue;
    }
    const presenceUser: PresenceUser = {
      email: ws.data.user.email,
      id: ws.data.user.id,
      name: ws.data.user.displayName,
    };
    viewers.push(presenceUser);
    if (sid === editorSid) {
      editor = presenceUser;
    }
  }

  return { editor, pageId, type: "presence_update", viewers };
}

function leaveCurrentPage(ws: ServerWebSocket<WsData>): void {
  const sid = ws.data.sessionId;
  const pageId = ws.data.pageId;
  if (pageId === undefined || pageId === "") {
    return;
  }

  const viewers = pageViewers.get(pageId);
  if (viewers) {
    viewers.delete(sid);
    if (viewers.size === 0) {
      pageViewers.delete(pageId);
    }
  }
  if (pageEditors.get(pageId) === sid) {
    pageEditors.delete(pageId);
  }
  // Only broadcast an update if there are still viewers (or editors) on this page,
  // otherwise the entry is gone and there's nothing to update.
  if (pageViewers.has(pageId) || pageEditors.has(pageId)) {
    broadcastToAll(presenceUpdate(pageId));
  }
  ws.data.pageId = undefined;
}

function wsOpen(ws: ServerWebSocket<WsData>): void {
  ws.data.sessionId = String(++sessionCounter);
  ws.data.pageId = undefined;
  ws.data.lastHeartbeat = Date.now();
  sessions.set(ws.data.sessionId, ws);
}

function wsMessage(ws: ServerWebSocket<WsData>, raw: string | Buffer): void {
  ws.data.lastHeartbeat = Date.now();
  let msg: WsClientMessage;
  try {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    msg = JSON.parse(String(raw)) as WsClientMessage;
  } catch {
    return;
  }

  const sid = ws.data.sessionId;

  switch (msg.type) {
    case "hello": {
      if (ws.data.pageId !== msg.pageId) {
        leaveCurrentPage(ws);
      }
      ws.data.pageId = msg.pageId;
      if (!pageViewers.has(msg.pageId)) {
        pageViewers.set(msg.pageId, new Set());
      }
      const viewers = pageViewers.get(msg.pageId);
      if (viewers) {
        viewers.add(sid);
      }
      // Broadcast join to ALL sessions so every sidebar reflects the new location.
      const update = presenceUpdate(msg.pageId);
      broadcastToAll(update);
      // Send a full snapshot of all active pages to the newly-connected client
      // so their sidebar is immediately populated without waiting for navigations.
      for (const [pageId] of pageViewers) {
        if (pageId !== msg.pageId) {
          send(ws, presenceUpdate(pageId));
        }
      }
      // Send the current remote sync status so the client can show a banner
      // immediately without waiting for the next sync event.
      send(ws, { ...getSyncStatus(), type: "sync_status" });
      break;
    }

    case "editing_start": {
      const existingSid = pageEditors.get(msg.pageId);
      if (
        existingSid !== undefined &&
        existingSid !== "" &&
        existingSid !== sid &&
        sessions.has(existingSid)
      ) {
        // Already locked by another active session; reject and send back current state
        send(ws, presenceUpdate(msg.pageId));
        return;
      }
      pageEditors.set(msg.pageId, sid);
      broadcastToPage(msg.pageId, presenceUpdate(msg.pageId));
      break;
    }

    case "editing_stop": {
      if (pageEditors.get(msg.pageId) === sid) {
        pageEditors.delete(msg.pageId);
        broadcastToPage(msg.pageId, presenceUpdate(msg.pageId));
      }
      break;
    }

    case "bye": {
      leaveCurrentPage(ws);
      break;
    }

    case "heartbeat": {
      send(ws, { type: "heartbeat_ack" });
      break;
    }
    default: {
      break;
    }
  }
}

function wsClose(ws: ServerWebSocket<WsData>): void {
  const sid = ws.data.sessionId;
  leaveCurrentPage(ws);
  sessions.delete(sid);
}

// Called from the background pull loop after repo advances
function broadcastPageChanged(
  pageId: string,
  commitSha: string | undefined,
  changedBy: string,
  changedByName: string,
): void {
  const msg: WsServerMessage = {
    changedBy,
    changedByName,
    ...(commitSha !== undefined && { commitSha }),
    pageId,
    type: "page_changed",
  };
  // Broadcast to all sessions; the client suppresses echoes of its own saves
  // via the `if (msg.changedBy === user?.id) return;` check in the WS listener.
  for (const ws of sessions.values()) {
    send(ws, msg);
  }
}

function broadcastPageDeleted(pageId: string): void {
  const msg: WsServerMessage = { pageId, type: "page_deleted" };
  for (const ws of sessions.values()) {
    send(ws, msg);
  }
}

function broadcastPageCreated(pageId: string, path: string): void {
  const msg: WsServerMessage = { pageId, path, type: "page_created" };
  for (const ws of sessions.values()) {
    send(ws, msg);
  }
}

function sendSaveConflict(userId: string, pageId: string): void {
  for (const ws of sessions.values()) {
    if (ws.data.user.id === userId) {
      send(ws, {
        message:
          "Your changes could not be saved: a remote conflict occurred and could not be resolved.",
        pageId,
        type: "save_conflict_lost",
      });
    }
  }
}

function getEditorForPage(pageId: string): User | undefined {
  const sid = pageEditors.get(pageId);
  if (sid === undefined || sid === "") {
    return undefined;
  }
  const ws = sessions.get(sid);
  return ws?.data.user;
}

// Prune sessions that haven't sent a heartbeat in 90 seconds.
// ws.close() triggers the wsClose handler which calls leaveCurrentPage, so
// presence and edit-lock cleanup happens automatically.
function pruneDeadSessions(): void {
  const cutoff = Date.now() - 90_000;
  for (const ws of sessions.values()) {
    if (ws.data.lastHeartbeat < cutoff) {
      ws.close(1001, "Heartbeat timeout");
    }
  }
}

export {
  type WsData,
  wsOpen,
  wsMessage,
  wsClose,
  broadcastConfigChanged,
  broadcastPageChanged,
  broadcastPageDeleted,
  broadcastPageCreated,
  broadcastSyncStatus,
  getSyncStatus,
  sendSaveConflict,
  getEditorForPage,
  pruneDeadSessions,
};
