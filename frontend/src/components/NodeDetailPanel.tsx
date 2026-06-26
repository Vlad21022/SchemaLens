import { motion } from 'framer-motion';
import { X, Key, Database, Link2, Hash, GitFork, Compass } from 'lucide-react';
import type { SchemaNode, GraphData, NodeRole } from '../lib/types';

interface Props {
  node: SchemaNode;
  graph: GraphData;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
  onStartPath: (sourceId: string) => void;
}

// ── Type helpers ─────────────────────────────────────────────────────────────
const TYPE_ABBR: Record<string, string> = {
  'character varying': 'varchar', 'timestamp without time zone': 'timestamp',
  'timestamp with time zone': 'timestamptz', 'double precision': 'float8',
  'integer': 'int4', 'bigint': 'int8', 'boolean': 'bool',
  'character': 'char',
};
function shortType(t: string): string {
  return TYPE_ABBR[t.toLowerCase()] ?? t;
}
const TYPE_COLOR: Record<string, string> = {
  varchar: '#3b82f6', text: '#3b82f6', char: '#3b82f6',
  int4: '#10b981', int8: '#10b981', numeric: '#10b981', float8: '#10b981',
  bool: '#f59e0b', uuid: '#8b5cf6',
  timestamp: '#6b7280', timestamptz: '#6b7280',
  jsonb: '#ef4444', json: '#ef4444',
};

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_BADGE: Record<NodeRole, { label: string; color: string; bg: string }> = {
  hub:      { label: 'Hub',      color: '#d946ef', bg: 'rgba(217,70,239,0.12)'  },
  bridge:   { label: 'Bridge',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  leaf:     { label: 'Leaf',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  isolated: { label: 'Isolated', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  normal:   { label: 'Normal',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
};

export default function NodeDetailPanel({ node, graph, onClose, onFocusNode, onStartPath }: Props) {
  const connectedIds = new Set<string>();
  graph.edges.forEach(e => {
    const src = typeof e.source === 'object' ? (e.source as any).id : e.source;
    const tgt = typeof e.target === 'object' ? (e.target as any).id : e.target;
    if (src === node.id) connectedIds.add(tgt);
    if (tgt === node.id) connectedIds.add(src);
  });
  const connectedNodes = graph.nodes.filter(n => connectedIds.has(n.id));

  const totalEdges = graph.edges.length;
  const connPct = totalEdges > 0 ? Math.round((node.connectivity / totalEdges) * 100) : 0;
  const badge = ROLE_BADGE[node.role ?? 'normal'];

  return (
    <motion.div
      key={node.id}
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -16, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="absolute left-4 top-1/2 -translate-y-1/2 w-[288px] glass rounded-xl overflow-hidden flex flex-col"
      style={{ zIndex: 20, maxHeight: 'calc(100vh - 72px)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] text-white/25 font-mono uppercase tracking-wider mb-0.5">
              {node.schema}
            </p>
            <h2 className="text-[15px] font-semibold text-white font-mono truncate leading-tight">
              {node.name}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0 mt-1">
            <X size={14} />
          </button>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{ color: badge.color, background: badge.bg }}
          >
            {badge.label}
          </span>
          {connPct > 0 && (
            <span className="text-[10px] text-white/25 font-mono">
              {connPct}% of all relations
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px]">
          {(node.row_estimate ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-white/35">
              <Database size={10} />
              <span className="font-mono">~{node.row_estimate.toLocaleString()}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-white/35">
            <Hash size={10} />
            <span className="font-mono">{node.column_count} cols</span>
          </span>
          <span className="flex items-center gap-1 text-white/35">
            <Link2 size={10} />
            <span className="font-mono">{node.in_degree ?? 0}↓ {node.out_degree ?? 0}↑</span>
          </span>
        </div>
      </div>

      {/* Deterministic summary — exploration reward */}
      {node.summary && (
        <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-start gap-2">
            <GitFork size={11} className="text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/50 leading-relaxed">{node.summary}</p>
          </div>
        </div>
      )}

      {/* Columns */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 pt-3 pb-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-white/20 mb-1.5">
            Columns
          </p>
        </div>
        <div className="px-3 pb-3 space-y-0.5">
          {node.columns.map(col => {
            const st = shortType(col.data_type);
            const tc = TYPE_COLOR[st] ?? '#6b7280';
            return (
              <div key={col.column_name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/4 group">
                {col.is_primary_key
                  ? <Key size={9} className="text-yellow-400 flex-shrink-0" />
                  : <div className="w-2.5 flex-shrink-0" />
                }
                <span className="flex-1 font-mono text-[11px] text-white/70 truncate">{col.column_name}</span>
                <span
                  className="font-mono text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded"
                  style={{ color: tc, background: `${tc}18` }}
                >
                  {st}
                </span>
                {col.is_nullable === 'YES' && (
                  <span className="text-[9px] text-white/15 flex-shrink-0">?</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Related tables */}
        {connectedNodes.length > 0 && (
          <div className="border-t border-white/5 px-4 pt-3 pb-3">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/20 mb-2">
              Related Tables
            </p>
            <div className="flex flex-wrap gap-1.5">
              {connectedNodes.map(cn => (
                <button
                  key={cn.id}
                  onClick={() => onFocusNode(cn.id)}
                  className="font-mono text-[11px] px-2 py-1 rounded-md transition-all duration-150 hover:scale-105"
                  style={{ color: '#a78bfa', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  {cn.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Path exploration CTA */}
      <div className="border-t border-white/5 p-3 flex-shrink-0">
        <button
          onClick={() => onStartPath(node.id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 hover:scale-[1.01]"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
        >
          <Compass size={12} />
          Find path from {node.name}
        </button>
      </div>
    </motion.div>
  );
}
