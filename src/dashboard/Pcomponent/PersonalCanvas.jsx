import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import CanvasNode from './CanvasNode';
import PersonalCardModal from './PersonalCardModal';
import PcPromptModal from './PcPromptModal';

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 2.5;
const NODE_GAP_X = 320;
const NODE_GAP_Y = 80;
const LIST_NODE_W = 220;
const CARD_NODE_W = 260;
const CARD_NODE_H_EST = 100;
const CANVAS_PADDING = 120;
const GRID_SIZE = 20;

/**
 * Auto-layout: arrange lists as columns, cards below each list.
 * Uses canvasX/canvasY from DB when available, otherwise auto-assigns
 * positions in a simple left-to-right column grid.
 */
function buildNodeLayout(lists) {
    const nodes = [];

    // --- Step 1: Determine auto-layout X positions for lists without saved positions ---
    // We auto-assign column positions sequentially. Lists WITH saved positions keep them;
    // lists WITHOUT get placed in the next available column slot after all positioned lists.
    let autoColIndex = 0;

    // First pass: figure out how many lists lack a saved X so we can place them
    // after the right-most saved list.
    const listsWithX = lists.filter(l => l.canvasX !== undefined && l.canvasX !== null && !isNaN(l.canvasX));
    const listsWithoutX = lists.filter(l => l.canvasX === undefined || l.canvasX === null || isNaN(l.canvasX));

    // Find the right-most saved list X to know where to start auto-placing
    let maxSavedX = -Infinity;
    for (const l of listsWithX) {
        if (l.canvasX > maxSavedX) maxSavedX = l.canvasX;
    }

    // If no lists have saved positions, start from CANVAS_PADDING
    let nextAutoX = listsWithX.length > 0
        ? maxSavedX + NODE_GAP_X
        : CANVAS_PADDING;

    // Build a map of auto-assigned X for lists without saved positions
    const autoXMap = new Map();
    for (const l of listsWithoutX) {
        autoXMap.set(l.id, nextAutoX);
        nextAutoX += NODE_GAP_X;
    }

    // --- Step 2: Build nodes ---
    for (const list of lists) {
        const cards = list.cards || [];

        // Determine list position
        const hasX = list.canvasX !== undefined && list.canvasX !== null && !isNaN(list.canvasX);
        const hasY = list.canvasY !== undefined && list.canvasY !== null && !isNaN(list.canvasY);
        const lX = hasX ? list.canvasX : autoXMap.get(list.id);
        const lY = hasY ? list.canvasY : CANVAS_PADDING;

        nodes.push({
            id: `list-${list.id}`,
            type: 'list',
            listId: list.id,
            name: list.name,
            color: list.color,
            cardCount: cards.length,
            x: lX,
            y: lY,
            width: LIST_NODE_W,
        });

        // Cards: place below the list header, stacked vertically
        let nextCardY = lY + 80 + NODE_GAP_Y;

        for (const card of cards) {
            const cHasX = card.canvasX !== undefined && card.canvasX !== null && !isNaN(card.canvasX);
            const cHasY = card.canvasY !== undefined && card.canvasY !== null && !isNaN(card.canvasY);

            const cX = cHasX ? card.canvasX : (lX + (LIST_NODE_W - CARD_NODE_W) / 2);
            const cY = cHasY ? card.canvasY : nextCardY;

            nodes.push({
                id: `card-${card.id}`,
                type: 'card',
                listId: list.id,
                cardId: card.id,
                card,
                listColor: list.color,
                x: cX,
                y: cY,
                width: CARD_NODE_W,
            });

            // Advance auto Y for the next unsaved card
            nextCardY = cY + CARD_NODE_H_EST + 16;
        }
    }

    return nodes;
}

/**
 * Build SVG connection lines from list nodes to their card nodes.
 */
function buildConnections(nodes) {
    const conns = [];
    const listNodes = nodes.filter(n => n.type === 'list');

    for (const listNode of listNodes) {
        const childCards = nodes.filter(n => n.type === 'card' && n.listId === listNode.listId);
        for (const card of childCards) {
            conns.push({
                id: `conn-${listNode.id}-${card.id}`,
                x1: listNode.x + (listNode.width || LIST_NODE_W) / 2,
                y1: listNode.y + 70,
                x2: card.x + (card.width || CARD_NODE_W) / 2,
                y2: card.y,
                color: listNode.color || '#6366f1',
            });
        }
    }
    return conns;
}

export default function PersonalCanvas({
    lists = [],
    allLists = [],
    onUpdateCard,
    onDeleteCard,
    onMoveCard,
    onAddTask,
    onAddList,
    onRenameList,
    onDeleteList,
    onUpdateListColor,
    onUpdateNodePosition,
}) {
    const containerRef = useRef(null);
    const [zoom, setZoom] = useState(0.85);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const panOrigin = useRef({ x: 0, y: 0 });

    // Drag overrides: map of nodeId -> { x, y } for all nodes being moved (parent + children)
    const [dragOverrides, setDragOverrides] = useState({});
    const dragRef = useRef({ nodeId: null, startX: 0, startY: 0, origX: 0, origY: 0, childOffsets: {} });
    const isDraggingRef = useRef(false);

    // Modal states
    const [promptOpts, setPromptOpts] = useState(null);
    const [modalCard, setModalCard] = useState(null);
    const [modalListId, setModalListId] = useState(null);
    const [modalListName, setModalListName] = useState('');
    const [modalListColor, setModalListColor] = useState('');

    const requestPrompt = useCallback((opts) => {
        setPromptOpts({ ...opts, onCancel: () => setPromptOpts(null) });
    }, []);

    // Build layout nodes from DB data
    const layoutNodes = useMemo(() => buildNodeLayout(lists), [lists]);

    // Final nodes: apply drag overrides for all nodes being moved
    const nodes = useMemo(() => {
        const keys = Object.keys(dragOverrides);
        if (keys.length === 0) return layoutNodes;
        return layoutNodes.map(n => {
            const ov = dragOverrides[n.id];
            if (ov) return { ...n, x: ov.x, y: ov.y };
            return n;
        });
    }, [layoutNodes, dragOverrides]);

    const connections = useMemo(() => buildConnections(nodes), [nodes]);

    // Clear drag overrides when DB data updates (lists/cards change)
    useEffect(() => {
        if (!isDraggingRef.current) {
            setDragOverrides({});
        }
    }, [lists]);

    // ── Pan handlers ──
    const handleCanvasMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY };
        panOrigin.current = { ...pan };
    }, [pan]);

    const handleCanvasMouseMove = useCallback((e) => {
        if (isPanning) {
            const dx = e.clientX - panStart.current.x;
            const dy = e.clientY - panStart.current.y;
            setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
            return;
        }
        // Node dragging with grid snap
        if (dragRef.current.nodeId) {
            const dx = (e.clientX - dragRef.current.startX) / zoom;
            const dy = (e.clientY - dragRef.current.startY) / zoom;
            const snappedX = Math.round((dragRef.current.origX + dx) / GRID_SIZE) * GRID_SIZE;
            const snappedY = Math.round((dragRef.current.origY + dy) / GRID_SIZE) * GRID_SIZE;

            const overrides = { [dragRef.current.nodeId]: { x: snappedX, y: snappedY } };

            // Move child nodes (cards under a dragged list) with the same delta
            for (const [childId, offset] of Object.entries(dragRef.current.childOffsets)) {
                overrides[childId] = { x: snappedX + offset.dx, y: snappedY + offset.dy };
            }

            setDragOverrides(overrides);
        }
    }, [isPanning, zoom]);

    const handleCanvasMouseUp = useCallback(() => {
        setIsPanning(false);
        const draggedNodeId = dragRef.current.nodeId;

        if (draggedNodeId && Object.keys(dragOverrides).length > 0) {
            // Persist ALL moved node positions to database
            if (onUpdateNodePosition) {
                for (const [nodeId, pos] of Object.entries(dragOverrides)) {
                    const node = layoutNodes.find(n => n.id === nodeId);
                    if (node) {
                        if (node.type === 'list') {
                            onUpdateNodePosition('list', node.listId, null, pos.x, pos.y);
                        } else if (node.type === 'card') {
                            onUpdateNodePosition('card', node.cardId, node.listId, pos.x, pos.y);
                        }
                    }
                }
            }

            // Check for card → list transfer (only for card drags)
            const draggedNode = layoutNodes.find(n => n.id === draggedNodeId);
            if (draggedNode && draggedNode.type === 'card' && onMoveCard) {
                const finalPos = dragOverrides[draggedNodeId];
                if (finalPos) {
                    const cardW = draggedNode.width || CARD_NODE_W;
                    const centerX = finalPos.x + cardW / 2;
                    const centerY = finalPos.y + CARD_NODE_H_EST / 2;
                    const listNodes = layoutNodes.filter(n => n.type === 'list');
                    for (const listNode of listNodes) {
                        const listW = listNode.width || LIST_NODE_W;
                        if (centerX >= listNode.x && centerX <= listNode.x + listW && centerY >= listNode.y) {
                            if (listNode.listId !== draggedNode.listId) {
                                onMoveCard(draggedNode.cardId, draggedNode.listId, listNode.listId, 0);
                            }
                            break;
                        }
                    }
                }
            }
        }

        isDraggingRef.current = false;
        dragRef.current = { nodeId: null, startX: 0, startY: 0, origX: 0, origY: 0, childOffsets: {} };
        // Don't clear dragOverrides here — keep until DB data arrives via lists prop change
    }, [layoutNodes, dragOverrides, onMoveCard, onUpdateNodePosition]);

    // ── Zoom handler ──
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
    }, []);

    // Attach wheel listener (non-passive)
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // ── Node drag start ──
    const handleNodeDragStart = useCallback((nodeId, e) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        isDraggingRef.current = true;

        // If dragging a list node, also track its child card nodes
        const childOffsets = {};
        if (node.type === 'list') {
            const children = nodes.filter(n => n.type === 'card' && n.listId === node.listId);
            for (const child of children) {
                childOffsets[child.id] = { dx: child.x - node.x, dy: child.y - node.y };
            }
        }

        dragRef.current = {
            nodeId,
            startX: e.clientX,
            startY: e.clientY,
            origX: node.x,
            origY: node.y,
            childOffsets,
        };
    }, [nodes]);

    // ── Node click → open modal ──
    const handleNodeClick = useCallback((node) => {
        if (node.type !== 'card') return;
        const list = lists.find(l => l.id === node.listId);
        setModalCard(node.card);
        setModalListId(node.listId);
        setModalListName(list?.name || '');
        setModalListColor(list?.color || '#6366f1');
    }, [lists]);

    // ── Zoom controls ──
    const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, z + 0.15));
    const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, z - 0.15));
    const zoomReset = () => { setZoom(0.85); setPan({ x: 0, y: 0 }); };

    // ── Minimap ──
    const minimapScale = 0.06;
    const minimapW = 180;
    const minimapH = 120;

    const canvasBounds = useMemo(() => {
        if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + (n.width || 260));
            maxY = Math.max(maxY, n.y + CARD_NODE_H_EST);
        }
        return { minX, minY, maxX, maxY };
    }, [nodes]);

    const miniScaleX = minimapW / (canvasBounds.maxX - canvasBounds.minX + 200);
    const miniScaleY = minimapH / (canvasBounds.maxY - canvasBounds.minY + 200);
    const miniScale = Math.min(miniScaleX, miniScaleY, 0.12);

    return (
        <div className="pc-canvas-wrapper">
            <div
                ref={containerRef}
                className={`pc-canvas-container ${isPanning ? 'pc-panning' : ''}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
            >
                {/* Transformed layer */}
                <div
                    className="pc-canvas-transform"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                    }}
                >
                    {/* SVG Connections */}
                    <svg className="pc-connections" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '10000px',
                        height: '10000px',
                        pointerEvents: 'none',
                    }}>
                        {connections.map(conn => {
                            const midY = (conn.y1 + conn.y2) / 2;
                            return (
                                <path
                                    key={conn.id}
                                    d={`M ${conn.x1} ${conn.y1} C ${conn.x1} ${midY}, ${conn.x2} ${midY}, ${conn.x2} ${conn.y2}`}
                                    stroke={conn.color}
                                    strokeWidth={1.5}
                                    strokeOpacity={0.35}
                                    fill="none"
                                />
                            );
                        })}
                    </svg>

                    {/* Nodes */}
                    {nodes.map(node => (
                        <CanvasNode
                            key={node.id}
                            node={node}
                            zoom={zoom}
                            onDragStart={handleNodeDragStart}
                            onNodeClick={handleNodeClick}
                            onAddTask={onAddTask}
                            onRenameList={onRenameList}
                            onDeleteList={onDeleteList}
                            onUpdateListColor={onUpdateListColor}
                            requestPrompt={requestPrompt}
                        />
                    ))}
                </div>
            </div>

            {/* Zoom Controls */}
            <div className="pc-controls">
                <button className="pc-ctrl-btn" onClick={zoomIn} title="Zoom In">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" strokeLinecap="round" />
                        <path d="M5 7h4M7 5v4" strokeLinecap="round" />
                    </svg>
                </button>
                <span className="pc-ctrl-zoom">{Math.round(zoom * 100)}%</span>
                <button className="pc-ctrl-btn" onClick={zoomOut} title="Zoom Out">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" strokeLinecap="round" />
                        <path d="M5 7h4" strokeLinecap="round" />
                    </svg>
                </button>
                <button className="pc-ctrl-btn" onClick={zoomReset} title="Reset View">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 2l12 12M14 2L2 14" strokeLinecap="round" opacity="0.3" />
                        <rect x="4" y="4" width="8" height="8" rx="1" />
                    </svg>
                </button>
            </div>

            {/* Global Add List Button */}
            {onAddList && (
                <button
                    className="pc-add-list-btn"
                    onClick={() => {
                        requestPrompt({
                            title: 'New List Node',
                            fields: [{ id: 'name', label: 'List Name' }],
                            submitText: 'Create List',
                            onConfirm: (vals) => {
                                if (vals.name && vals.name.trim()) onAddList(vals.name.trim());
                            }
                        });
                    }}
                    title="Add New List"
                    style={{
                        position: 'absolute',
                        left: '20px',
                        bottom: '20px',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: 'var(--pd-primary, #6366f1)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                    </svg>
                    New List Node
                </button>
            )}

            {/* Minimap */}
            <div className="pc-minimap" style={{ width: minimapW, height: minimapH }}>
                <svg width={minimapW} height={minimapH}>
                    {nodes.map(n => {
                        const mx = (n.x - canvasBounds.minX + 100) * miniScale;
                        const my = (n.y - canvasBounds.minY + 100) * miniScale;
                        const mw = (n.width || 260) * miniScale;
                        const mh = (n.type === 'list' ? 50 : CARD_NODE_H_EST) * miniScale;
                        return (
                            <rect
                                key={n.id}
                                x={mx}
                                y={my}
                                width={Math.max(mw, 3)}
                                height={Math.max(mh, 2)}
                                rx={1}
                                fill={n.type === 'list' ? (n.color || '#6366f1') : 'rgba(255,255,255,0.3)'}
                                fillOpacity={n.type === 'list' ? 0.8 : 0.5}
                            />
                        );
                    })}
                    {/* Viewport indicator */}
                    {containerRef.current && (() => {
                        const cw = containerRef.current.clientWidth;
                        const ch = containerRef.current.clientHeight;
                        const vx = (-pan.x / zoom - canvasBounds.minX + 100) * miniScale;
                        const vy = (-pan.y / zoom - canvasBounds.minY + 100) * miniScale;
                        const vw = (cw / zoom) * miniScale;
                        const vh = (ch / zoom) * miniScale;
                        return (
                            <rect
                                x={vx} y={vy} width={vw} height={vh}
                                fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1} rx={1}
                            />
                        );
                    })()}
                </svg>
            </div>

            {/* Card Modal */}
            {modalCard && (
                <PersonalCardModal
                    card={modalCard}
                    listId={modalListId}
                    listName={modalListName}
                    listColor={modalListColor}
                    allLists={allLists}
                    onClose={() => setModalCard(null)}
                    onUpdateCard={onUpdateCard}
                    onDeleteCard={(...args) => { onDeleteCard && onDeleteCard(...args); setModalCard(null); }}
                    onMoveCard={onMoveCard}
                />
            )}

            {/* Empty state */}
            {lists.length === 0 && (
                <div className="pc-empty">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                        <rect x="4" y="4" width="16" height="12" rx="3" />
                        <rect x="28" y="4" width="16" height="12" rx="3" />
                        <rect x="16" y="28" width="16" height="12" rx="3" />
                        <path d="M12 16v8l12 4M36 16v4l-12 8" strokeLinecap="round" strokeDasharray="3 3" />
                    </svg>
                    <p>No tasks to display. Create some lists and tasks to see them here.</p>
                </div>
            )}

            {/* Custom Prompt Modal */}
            <PcPromptModal opts={promptOpts} />
        </div>
    );
}
