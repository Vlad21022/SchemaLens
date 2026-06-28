import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Layers, Link2Off, Radar, HardDrive,
  Info, Network, ChevronLeft, ChevronRight, Sparkles,
  Copy, Check,
} from 'lucide-react';
import type { Insight } from '../lib/types';

const TYPE_CONFIG = {
  architecture: { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)',  border: '#3b82f6', label: 'Architecture' },
  warning:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: '#f59e0b', label: 'Warning'      },
  design:       { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)',  border: '#8b5cf6', label: 'Design'       },
  suggestion:   { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: '#10b981', label: 'Suggestion'   },
  info:         { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: '#6b7280', label: 'Info'         },
  performance:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: '#ef4444', label: 'Performance'  },
};

const ICONS: Record<string, React.FC<any>> = {
  warning:  AlertTriangle,
  layers:   Layers,
  link_off: Link2Off,
  radar:    Radar,
  storage:  HardDrive,
  info:     Info,
  hub:      Network,
};

interface Props {
  insights: Insight[];
  onFocusNode: (nodeId: string) => void;
  onInsightHover: (nodeIds: Set<string>) => void;
}

function renderBody(text: string) {
  return text.split(/(`[^`]+`)/g).map((p, i) =>
    p.startsWith('`') && p.endsWith('`')
      ? <code key={i} className="font-mono text-purple-300 text-[11px] bg-purple-950/50 px-1 rounded">{p.slice(1, -1)}</code>
      : <span key={i}>{p}</span>
  );
}

function getInsightCopyText(insight: Insight) {
  return `${insight.title}\n${insight.body.replace(/`([^`]+)`/g, '$1')}`;
}

export default function InsightPanel({ insights, onFocusNode, onInsightHover }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  // Reveal insights sequentially to simulate "thinking"
  const [visibleCount, setVisibleCount] = useState(0);
  const [copiedInsightId, setCopiedInsightId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    setVisibleCount(0);

    insights.forEach((_, i) => {
      const id = setTimeout(() => setVisibleCount(i + 1), 300 + i * 280);
      timerRef.current.push(id);
    });

    return () => timerRef.current.forEach(clearTimeout);
  }, [insights]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const visibleInsights = insights.slice(0, visibleCount);

  const handleCopyInsight = async (event: React.MouseEvent<HTMLButtonElement>, insight: Insight) => {
    event.stopPropagation();
    await navigator.clipboard.writeText(getInsightCopyText(insight));
    setCopiedInsightId(insight.id);

    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => {
      setCopiedInsightId(currentId => currentId === insight.id ? null : currentId);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ x: 340 }}
      animate={{ x: collapsed ? 296 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      className="absolute top-0 right-0 h-full w-[320px] flex"
      style={{ zIndex: 20 }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="self-center h-10 w-6 glass rounded-l-lg flex items-center justify-center text-white/35 hover:text-white/70 transition-colors flex-shrink-0"
        aria-label="toggle panel"
      >
        {collapsed ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
      </button>

      <div className="glass h-full w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-5 pb-3 border-b border-white/5 flex-shrink-0">
          <Sparkles size={13} className="text-purple-400" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Schema Intelligence
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {visibleCount < insights.length && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            )}
            <span className="text-[10px] font-mono text-white/20 bg-white/5 rounded px-1.5 py-0.5">
              {visibleCount}/{insights.length}
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {visibleInsights.map((insight, i) => {
              const cfg = TYPE_CONFIG[insight.type];
              const Icon = ICONS[insight.icon] ?? Info;
              const isClickable = insight.affected_nodes.length > 0;

              return (
                <motion.div
                  key={insight.id}
                  layout
                  initial={{ opacity: 0, x: 20, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => isClickable && onFocusNode(insight.affected_nodes[0])}
                  onMouseEnter={() => onInsightHover(new Set(insight.affected_nodes))}
                  onMouseLeave={() => onInsightHover(new Set())}
                  className={`rounded-lg p-3 group transition-all duration-200 ${isClickable ? 'cursor-pointer' : ''}`}
                  style={{
                    background: cfg.bg,
                    borderLeft: `2px solid ${cfg.border}`,
                    border: `1px solid rgba(255,255,255,0.05)`,
                    borderLeftColor: cfg.border,
                    borderLeftWidth: '2px',
                  }}
                  whileHover={isClickable ? { scale: 1.01, x: -2 } : {}}
                  whileTap={isClickable ? { scale: 0.99 } : {}}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon size={12} style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded"
                          style={{ color: cfg.color, background: `${cfg.border}20` }}
                        >
                          {cfg.label}
                        </span>
                        <button
                          type="button"
                          onClick={event => handleCopyInsight(event, insight)}
                          className="ml-auto -mr-1 -mt-1 w-6 h-6 rounded-md flex items-center justify-center text-white/35 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-white/80 hover:bg-white/10 transition-all"
                          aria-label={`Copy ${insight.title} insight`}
                          title="Copy insight"
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {copiedInsightId === insight.id ? (
                              <motion.span
                                key="copied"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.12 }}
                              >
                                <Check size={12} className="text-emerald-300" />
                              </motion.span>
                            ) : (
                              <motion.span
                                key="copy"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.12 }}
                              >
                                <Copy size={12} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                      </div>
                      <p className="text-[12px] font-semibold text-white/90 leading-tight mb-1">
                        {insight.title}
                      </p>
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        {renderBody(insight.body)}
                      </p>
                      {isClickable && (
                        <p
                          className="text-[10px] mt-1.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          style={{ color: cfg.color }}
                        >
                          Focus in graph →
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* "Thinking" indicator when still revealing */}
          {visibleCount < insights.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-3 py-2"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 rounded-full bg-purple-500/50"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-white/20">Analyzing schema…</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
