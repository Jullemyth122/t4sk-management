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

/**
 * Auto-layout: arrange lists as columns, cards below each list.
 * Returns an array of node objects with { id, type, x, y, ... }
 */
function buildNodeLayout(lists) {
    const nodes = [];
    let colX = CANVAS_PADDING;

    for (const list of lists) {
        const cards = list.cards || [];
        // List header node
        nodes.push({
            id: `list-${list.id}`,
            type: 'list',
            listId: list.id,
            name: list.name,
            color: list.color,
            cardCount: cards.length,
            x: colX,
            y: CANVAS_PADDING,
            width: LIST_NODE_W,
        });

        // Card nodes beneath
        let cardY = CANVAS_PADDING + 80 + NODE_GAP_Y;
        for (const card of cards) {
            nodes.push({
                id: `card-${card.id}`,
                type: 'card',
                listId: list.id,
                cardId: card.id,
                card,
                listColor: list.color,
                x: colX + (LIST_NODE_W - CARD_NODE_W) / 2,
                y: cardY,
                width: CARD_NODE_W,
            });
            cardY += CARD_NODE_H_EST + 16;
        }

        colX += NODE_GAP_X;
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
}) {
    const containerRef = useRef(null);
    const [zoom, setZoom] = useState(0.85);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const panOrigin = useRef({ x: 0, y: 0 });

    // Node positions (override layout with user-dragged positions)
    const [nodePositions, setNodePositions] = useState({});
    const dragRef = useRef({ nodeId: null, startX: 0, startY: 0, origX: 0, origY: 0 });
    const dragEndPos = useRef(null);

    // Modal states
    const [promptOpts, setPromptOpts] = useState(null);
    const [modalCard, setModalCard] = useState(null);
    const [modalListId, setModalListId] = useState(null);
    const [modalListName, setModalListName] = useState('');
    const [modalListColor, setModalListColor] = useState('');

    const requestPrompt = useCallback((opts) => {
        setPromptOpts({ ...opts, onCancel: () => setPromptOpts(null) });
    }, []);

    // Build layout nodes
    const layoutNodes = useMemo(() => buildNodeLayout(lists), [lists]);

    // Merge layout with user-dragged positions
    const nodes = useMemo(() => {
        return layoutNodes.map(n => {
            const pos = nodePositions[n.id];
            if (pos) return { ...n, x: pos.x, y: pos.y };
            return n;
        });
    }, [layoutNodes, nodePositions]);

    const connections = useMemo(() => buildConnections(nodes), [nodes]);

    // Reset positions when lists change significantly
    useEffect(() => {
        setNodePositions({});
    }, [lists.length]);

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
        // Node dragging
        if (dragRef.current.nodeId) {
            const dx = (e.clientX - dragRef.current.startX) / zoom;
            const dy = (e.clientY - dragRef.current.startY) / zoom;
            const finalX = dragRef.current.origX + dx;
            const finalY = dragRef.current.origY + dy;
            dragEndPos.current = { x: finalX, y: finalY };

            setNodePositions(prev => ({
                ...prev,
                [dragRef.current.nodeId]: { x: finalX, y: finalY },
            }));
        }
    }, [isPanning, zoom]);

    const handleCanvasMouseUp = useCallback(() => {
        setIsPanning(false);
        const draggedNodeId = dragRef.current.nodeId;

        if (draggedNodeId && dragEndPos.current) {
            const draggedNodeRaw = layoutNodes.find(n => n.id === draggedNodeId);
            if (draggedNodeRaw && draggedNodeRaw.type === 'card' && onMoveCard) {
                const cardX = dragEndPos.current.x;
                const cardY = dragEndPos.current.y;
                const cardW = draggedNodeRaw.width || CARD_NODE_W;
                const cardH = CARD_NODE_H_EST;
                const centerX = cardX + cardW / 2;
                const centerY = cardY + cardH / 2;

                const listNodes = layoutNodes.filter(n => n.type === 'list');
                for (const listNode of listNodes) {
                    const listX = listNode.x;
                    const listY = listNode.y;
                    const listW = listNode.width || LIST_NODE_W;
                    if (centerX >= listX && centerX <= listX + listW && centerY >= listY) {
                        if (listNode.listId !== draggedNodeRaw.listId) {
                            onMoveCard(draggedNodeRaw.cardId, draggedNodeRaw.listId, listNode.listId, 0);
                        }
                        break;
                    }
                }
            }
        }

        dragRef.current.nodeId = null;
        dragEndPos.current = null;
    }, [layoutNodes, onMoveCard]);

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
        dragRef.current = {
            nodeId,
            startX: e.clientX,
            startY: e.clientY,
            origX: node.x,
            origY: node.y,
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
