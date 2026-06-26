import { useState, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ConnectionForm from './components/ConnectionForm';
import GraphCanvas from './components/GraphCanvas';
import InsightPanel from './components/InsightPanel';
import NodeDetailPanel from './components/NodeDetailPanel';
import PathExplorer from './components/PathExplorer';
import StatusBar from './components/StatusBar';
import { connectDatabase, findPath } from './lib/api';
import type { GraphData, Insight, SchemaNode, PathResult } from './lib/types';

type AppState = 'idle' | 'loading' | 'connected';

export default function App() {
  const [appState, setAppState]         = useState<AppState>('idle');
  const [graph, setGraph]               = useState<GraphData | null>(null);
  const [insights, setInsights]         = useState<Insight[]>([]);
  const [tableCount, setTableCount]     = useState(0);
  const [edgeCount, setEdgeCount]       = useState(0);
  const [error, setError]               = useState<string | null>(null);
  const [connStr, setConnStr]           = useState('');

  // Node interaction
  const [selectedNode, setSelectedNode] = useState<SchemaNode | null>(null);
  const [hoveredNode, setHoveredNode]   = useState<SchemaNode | null>(null);
  const [focusNodeId, setFocusNodeId]   = useState<string | null>(null);
  const focusCounter                    = useRef(0);

  // Insight hover — highlight affected nodes in graph
  const [insightHighlightIds, setInsightHighlightIds] = useState<Set<string>>(new Set());

  // Path exploration
  const [pathMode, setPathMode]         = useState(false);
  const [pathSourceId, setPathSourceId] = useState<string | null>(null);
  const [pathResult, setPathResult]     = useState<PathResult | null>(null);
  const [pathLoading, setPathLoading]   = useState(false);

  // ── Connection ─────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async (connectionString: string) => {
    setError(null);
    setAppState('loading');
    try {
      const res = await connectDatabase(connectionString);
      setGraph(res.graph);
      setInsights(res.insights);
      setTableCount(res.table_count);
      setEdgeCount(res.edge_count);
      setConnStr(connectionString);
      setSelectedNode(null);
      setHoveredNode(null);
      setPathResult(null);
      setPathMode(false);
      setAppState('connected');
    } catch (e: any) {
      setError(e.message ?? 'Connection failed');
      setAppState('idle');
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setAppState('idle');
    setGraph(null);
    setInsights([]);
    setSelectedNode(null);
    setHoveredNode(null);
    setPathResult(null);
    setPathMode(false);
    setError(null);
  }, []);

  // ── Focus node (from insight click / related table click) ─────────────────
  const handleFocusNode = useCallback((nodeId: string) => {
    focusCounter.current += 1;
    setFocusNodeId(`${nodeId}::${focusCounter.current}`);
    const node = graph?.nodes.find(n => n.id === nodeId) ?? null;
    if (node) setSelectedNode(node);
  }, [graph]);

  const focusRawId = focusNodeId ? focusNodeId.split('::')[0] : null;

  // ── Path mode ─────────────────────────────────────────────────────────────
  const handleStartPath = useCallback((sourceId: string) => {
    setPathMode(true);
    setPathSourceId(sourceId);
    setPathResult(null);
    setSelectedNode(null);
  }, []);

  const handleCancelPath = useCallback(() => {
    setPathMode(false);
    setPathSourceId(null);
    setPathResult(null);
  }, []);

  // ── Node click — aware of path mode ───────────────────────────────────────
  const handleNodeClick = useCallback(async (node: SchemaNode) => {
    if (pathMode && pathSourceId && node.id !== pathSourceId) {
      setPathLoading(true);
      try {
        const result = await findPath(pathSourceId, node.id);
        setPathResult(result);
        setPathMode(false);
        // Highlight path source node
        focusCounter.current += 1;
        setFocusNodeId(`${pathSourceId}::${focusCounter.current}`);
      } catch {
        setPathResult(null);
        setPathMode(false);
      } finally {
        setPathLoading(false);
      }
      return;
    }
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    setPathResult(null);
  }, [pathMode, pathSourceId]);

  // ── Derived: active path node IDs for graph canvas ────────────────────────
  const activePath = pathResult?.path ?? null;

  // ── Insight hover combined with insight highlight ─────────────────────────
  const highlightedNodeIds = useMemo(() => {
    if (insightHighlightIds.size > 0) return insightHighlightIds;
    return new Set<string>();
  }, [insightHighlightIds]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#070711]">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse 40% 30% at 15% 80%, rgba(59,130,246,0.06) 0%, transparent 60%)',
            'radial-gradient(ellipse 50% 40% at 85% 15%, rgba(139,92,246,0.07) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      {/* Graph canvas — full viewport */}
      <AnimatePresence>
        {appState === 'connected' && graph && (
          <motion.div
            key="graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <GraphCanvas
              data={graph}
              selectedNode={selectedNode}
              hoveredNode={hoveredNode}
              focusNodeId={focusRawId}
              highlightedNodeIds={highlightedNodeIds}
              activePath={activePath}
              pathSourceId={pathSourceId}
              onNodeClick={handleNodeClick}
              onNodeHover={setHoveredNode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      <AnimatePresence>
        {appState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 40 }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" style={{ animationDuration: '1.2s' }} />
                <div className="absolute inset-1 rounded-full border-2 border-t-purple-500 border-purple-500/20 animate-spin" />
              </div>
              <p className="text-sm text-white/35 font-mono tracking-wide">Reading schema…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection form */}
      <AnimatePresence>
        {appState === 'idle' && (
          <ConnectionForm key="form" onConnect={handleConnect} error={error} loading={false} />
        )}
      </AnimatePresence>

      {/* Status bar */}
      <AnimatePresence>
        {appState === 'connected' && (
          <StatusBar
            key="status"
            connectionString={connStr}
            tableCount={tableCount}
            edgeCount={edgeCount}
            onDisconnect={handleDisconnect}
          />
        )}
      </AnimatePresence>

      {/* Node detail panel */}
      <AnimatePresence>
        {appState === 'connected' && selectedNode && graph && !pathMode && (
          <NodeDetailPanel
            key={selectedNode.id}
            node={selectedNode}
            graph={graph}
            onClose={() => setSelectedNode(null)}
            onFocusNode={handleFocusNode}
            onStartPath={handleStartPath}
          />
        )}
      </AnimatePresence>

      {/* Insight panel */}
      <AnimatePresence>
        {appState === 'connected' && insights.length > 0 && (
          <InsightPanel
            key="insights"
            insights={insights}
            onFocusNode={handleFocusNode}
            onInsightHover={setInsightHighlightIds}
          />
        )}
      </AnimatePresence>

      {/* Path explorer result */}
      <AnimatePresence>
        {appState === 'connected' && pathResult && graph && (
          <PathExplorer
            key="path"
            result={pathResult}
            graph={graph}
            onClose={handleCancelPath}
            onFocusNode={handleFocusNode}
          />
        )}
      </AnimatePresence>

      {/* Path mode instruction toast */}
      <AnimatePresence>
        {pathMode && pathSourceId && graph && (
          <motion.div
            key="path-toast"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="absolute top-[72px] left-1/2 -translate-x-1/2 glass rounded-xl px-5 py-3 flex items-center gap-3"
            style={{ zIndex: 30 }}
          >
            {pathLoading
              ? <div className="w-3 h-3 rounded-full border border-t-cyan-400 border-cyan-400/20 animate-spin" />
              : <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            }
            <span className="text-[12px] text-white/70">
              Click any table to trace a path from{' '}
              <span className="font-mono text-cyan-300">
                {graph.nodes.find(n => n.id === pathSourceId)?.name ?? pathSourceId}
              </span>
            </span>
            <button
              onClick={handleCancelPath}
              className="text-[11px] text-white/30 hover:text-white/60 transition-colors ml-2"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredNode && !selectedNode && !pathMode && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2.5 pointer-events-none"
            style={{ zIndex: 20 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: { hub: '#d946ef', bridge: '#f59e0b', leaf: '#3b82f6', isolated: '#374151', normal: '#6366f1' }[hoveredNode.role ?? 'normal'],
                }}
              />
              <span className="font-mono text-sm font-semibold text-white">
                {hoveredNode.name}
              </span>
              <span className="text-[11px] text-white/30 capitalize">
                {hoveredNode.role ?? 'normal'}
              </span>
              <span className="w-px h-3 bg-white/10" />
              <span className="text-[11px] text-white/35 font-mono">
                {hoveredNode.column_count} cols · {hoveredNode.connectivity} fks
                {(hoveredNode.row_estimate ?? 0) > 0
                  ? ` · ~${hoveredNode.row_estimate.toLocaleString()} rows`
                  : ''}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Path mode hover tooltip */}
      <AnimatePresence>
        {hoveredNode && pathMode && !pathLoading && (
          <motion.div
            key="path-tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2.5 pointer-events-none"
            style={{ zIndex: 20 }}
          >
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-white/40">Navigate to</span>
              <span className="font-mono text-cyan-300 font-semibold">{hoveredNode.name}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
