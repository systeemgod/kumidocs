import { useState, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { SearchPalette } from '../search/SearchPalette';
import { NewPageDialog } from '../dialogs/NewPageDialog';
import { Toaster } from '../ui/sonner';
import { useUser } from '../../store/user';
import { wsClient, useWsListener } from '../../store/ws';
import { useMountEffect } from '../../hooks/useMountEffect';
import { type TreeNode, type PresenceUser } from '../../lib/types';

// Connects the WS client once on mount (rendered only when user is available)
function WsConnector({ userId }: { userId: string }) {
	useMountEffect(() => {
		wsClient.connect(userId);
	});
	return null;
}

const SIDEBAR_WIDTH_KEY = 'kumidocs:sidebar-width';
const SIDEBAR_DEFAULT = 288;
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;

export function AppShell() {
	const { user } = useUser();
	const [searchOpen, setSearchOpen] = useState(false);
	const [tree, setTree] = useState<TreeNode[]>([]);
	const [instanceName, setInstanceName] = useState('KumiDocs');
	const [autoSaveDelay, setAutoSaveDelay] = useState(5000);
	const [presenceByPage, setPresenceByPage] = useState<Map<string, PresenceUser[]>>(new Map());
	const [newPageOpen, setNewPageOpen] = useState(false);
	const [newPageParentDir, setNewPageParentDir] = useState<string | undefined>();
	const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
		const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
		if (!stored) { return SIDEBAR_DEFAULT; }
		const n = Number(stored);
		return Number.isFinite(n)
			? Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, n))
			: SIDEBAR_DEFAULT;
	});
	const [isDragging, setIsDragging] = useState(false);
	// Keep a ref so the stable mousemove closure always reads the live drag-start values
	const dragStartRef = useRef<{ x: number; width: number } | null>(null);

	// Reload full file tree for sidebar.
	// Returns void so it's safe to pass as event handler or onCreated callback.
	const loadTree = useCallback((): void => {
		fetch('/api/tree')
			.then((r) => r.json() as Promise<TreeNode[]>)
			.then((data) => {
				setTree(data);
			})
			.catch((error: unknown) => {
				console.error('Failed to load file tree:', error);
			});
	}, []);

	// Load user/instance info
	useMountEffect(() => {
		fetch('/api/me')
			.then((r) => r.json() as Promise<{ instanceName?: string; autoSaveDelay?: number }>)
			.then((data) => {
				if (data.instanceName) { setInstanceName(data.instanceName); }
				if (data.autoSaveDelay) { setAutoSaveDelay(data.autoSaveDelay); }
			})
			.catch((error: unknown) => {
				console.error('Failed to load instance info:', error);
			});
		loadTree();
	});

	// Update per-page presence map from WS presence updates
	useWsListener((msg) => {
		if (msg.type === 'presence_update') {
			setPresenceByPage((prev) => {
				const next = new Map(prev);
				// Merge viewers + editor, deduplicated, minus self
				const all: PresenceUser[] = [];
				const seen = new Set<string>();
				for (const u of msg.viewers) {
					if (!seen.has(u.id) && u.id !== user?.id) {
						all.push(u);
						seen.add(u.id);
					}
				}
				if (msg.editor && !seen.has(msg.editor.id) && msg.editor.id !== user?.id) {
					all.push(msg.editor);
				}
				if (all.length > 0) {
					next.set(msg.pageId, all);
				} else {
					next.delete(msg.pageId);
				}
				return next;
			});
		}
		if (
			msg.type === 'page_created' ||
			msg.type === 'page_changed' ||
			msg.type === 'page_deleted'
		) {
			loadTree();
		}
	});

	// Ctrl+K shortcut
	useMountEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
				e.preventDefault();
				setSearchOpen(true);
			}
		};
		window.addEventListener('keydown', handler);
		return () => {
			window.removeEventListener('keydown', handler);
		};
	});

	const handleResizeMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			dragStartRef.current = { x: e.clientX, width: sidebarWidth };
			setIsDragging(true);
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';

			const onMouseMove = (ev: MouseEvent) => {
				if (!dragStartRef.current) { return; }
				const delta = ev.clientX - dragStartRef.current.x;
				const next = Math.max(
					SIDEBAR_MIN,
					Math.min(SIDEBAR_MAX, dragStartRef.current.width + delta),
				);
				setSidebarWidth(next);
			};

			const onMouseUp = (ev: MouseEvent) => {
				if (dragStartRef.current) {
					const delta = ev.clientX - dragStartRef.current.x;
					const next = Math.max(
						SIDEBAR_MIN,
						Math.min(SIDEBAR_MAX, dragStartRef.current.width + delta),
					);
					localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next));
				}
				dragStartRef.current = null;
				setIsDragging(false);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
			};

			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		},
		[sidebarWidth],
	);

	return (
		<div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
			{user && <WsConnector userId={user.id} />}
			<TopBar
				instanceName={instanceName}
				onSearchOpen={() => {
					setSearchOpen(true);
				}}
			/>

			<div className="flex flex-1 overflow-hidden">
				<Sidebar
					tree={tree}
					reloadTree={loadTree}
					width={sidebarWidth}
					onNewPage={() => {
						setNewPageParentDir(undefined);
						setNewPageOpen(true);
					}}
					onNewSubPage={(parentDir) => {
						setNewPageParentDir(parentDir || undefined);
						setNewPageOpen(true);
					}}
					presenceByPage={presenceByPage}
				/>

				{/* Resize handle */}
				<div
					className={`w-1 shrink-0 cursor-col-resize transition-colors hover:bg-primary/30 ${isDragging ? 'bg-primary/40' : ''}`}
					onMouseDown={handleResizeMouseDown}
				/>

				<main className="flex-1 overflow-hidden flex flex-col">
					<Outlet context={{ reloadTree: loadTree, autoSaveDelay }} />
				</main>
			</div>

			<SearchPalette
				open={searchOpen}
				onClose={() => {
					setSearchOpen(false);
				}}
			/>
			<NewPageDialog
				open={newPageOpen}
				onClose={() => {
					setNewPageOpen(false);
				}}
				parentDir={newPageParentDir}
				onCreated={loadTree}
			/>
			<Toaster richColors position="top-right" />
		</div>
	);
}
