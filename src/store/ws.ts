import { type WsClientMessage, type WsServerMessage } from '@/lib/types';
import { useLayoutEffect, useRef } from 'react';
import { useMountEffect } from '@/hooks/useMountEffect';

type WsListener = (msg: WsServerMessage) => void;

const RECONNECT_DELAY_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 30_000;

class WsClient {
	private ws?: WebSocket;
	private listeners = new Set<WsListener>();
	private reconnectTimer?: ReturnType<typeof setTimeout>;
	private heartbeatTimer?: ReturnType<typeof setInterval>;
	private currentPageId?: string;
	private userId?: string;

	public connect(userId: string): void {
		this.userId = userId;
		if (this.ws && this.ws.readyState === WebSocket.OPEN) { return; }
		this.doConnect();
	}

	private doConnect(): void {
		let proto = 'ws:';
		if (location.protocol === 'https:') { proto = 'wss:'; }
		this.ws = new WebSocket(`${proto}//${location.host}/ws`);

		this.ws.addEventListener('open', (): void => {
			if (this.currentPageId && this.userId) {
				this.send({
					type: 'hello',
					pageId: this.currentPageId,
					userId: this.userId,
				});
			}
			this.startHeartbeat();
		});

		this.ws.addEventListener('message', (event: MessageEvent): void => {
			try {
				const msg = JSON.parse(event.data as string) as WsServerMessage;
				for (const listener of this.listeners) { listener(msg); }
			} catch (error: unknown) {
				process.stderr.write(`WebSocket message parse error: ${String(error)}\n`);
			}
		});

		this.ws.addEventListener('close', (): void => {
			this.stopHeartbeat();
			this.reconnectTimer = setTimeout((): void => {
				this.doConnect();
			}, RECONNECT_DELAY_MS);
		});

		this.ws.addEventListener('error', (): void => {
			if (this.ws) { this.ws.close(); }
		});
	}

	public send(msg: WsClientMessage): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(msg));
		}
	}

	public joinPage(pageId: string): void {
		if (this.currentPageId === pageId) { return; }
		this.currentPageId = pageId;
		if (this.userId) {
			this.send({ type: 'hello', pageId, userId: this.userId });
		}
	}

	public leavePage(): void {
		if (!this.currentPageId) { return; }
		delete this.currentPageId;
		this.send({ type: 'bye' });
	}

	public startEditing(pageId: string): void {
		this.send({ type: 'editing_start', pageId });
	}

	public stopEditing(pageId: string): void {
		this.send({ type: 'editing_stop', pageId });
	}

	public addListener(fn: WsListener): void {
		this.listeners.add(fn);
	}

	public removeListener(fn: WsListener): void {
		this.listeners.delete(fn);
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatTimer = setInterval((): void => {
			this.send({ type: 'heartbeat' });
		}, HEARTBEAT_INTERVAL_MS);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			delete this.heartbeatTimer;
		}
	}

	public disconnect(): void {
		if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); delete this.reconnectTimer; }
		this.stopHeartbeat();
		if (this.ws) { this.ws.close(); }
	}
}

const wsClient = new WsClient();

const useWsListener = (handler: WsListener): void => {
	const handlerRef = useRef(handler);

	useLayoutEffect((): void => {
		handlerRef.current = handler;
	});

	useMountEffect((): (() => void) => {
		const listener: WsListener = (msg): void => {
			handlerRef.current(msg);
		};
		wsClient.addListener(listener);
		return (): void => {
			wsClient.removeListener(listener);
		};
	});
};

export { wsClient, useWsListener };
