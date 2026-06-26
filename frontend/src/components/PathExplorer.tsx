import { motion } from 'framer-motion';
import { X, ArrowRight, Compass } from 'lucide-react';
import type { PathResult, GraphData } from '../lib/types';

interface Props {
  result: PathResult;
  graph: GraphData;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
}

function renderDescription(text: string) {
  return text.split(/(`[^`]+`)/g).map((p, i) =>
    p.startsWith('`') && p.endsWith('`')
      ? <code key={i} className="font-mono text-cyan-300 text-[12px] bg-cyan-950/40 px-1 rounded">{p.slice(1, -1)}</code>
      : <span key={i}>{p}</span>
  );
}

export default function PathExplorer({ result, graph, onClose, onFocusNode }: Props) {
  const names = result.path.map(id => {
    const node = graph.nodes.find(n => n.id === id);
    return { id, name: node?.name ?? id.split('.').pop() ?? id };
  });

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 glass rounded-2xl px-5 py-4 flex flex-col gap-3"
      style={{ zIndex: 30, minWidth: '420px', maxWidth: '680px' }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <Compass size={13} className="text-cyan-400" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Path Explorer
        </span>
        <span className="ml-auto text-[10px] text-white/25 font-mono">
          {result.hop_count} {result.hop_count === 1 ? 'hop' : 'hops'}
        </span>
        <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors ml-2">
          <X size={13} />
        </button>
      </div>

      {/* Path visualization */}
      <div className="flex items-center gap-1 flex-wrap">
        {names.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1">
            <button
              onClick={() => onFocusNode(step.id)}
              className="font-mono text-[12px] px-2.5 py-1 rounded-lg transition-all duration-150 hover:scale-105"
              style={
                i === 0
                  ? { color: '#e879f9', background: 'rgba(217,70,239,0.15)', border: '1px solid rgba(217,70,239,0.3)' }
                  : i === names.length - 1
                  ? { color: '#67e8f9', background: 'rgba(99,255,200,0.12)', border: '1px solid rgba(99,255,200,0.25)' }
                  : { color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }
              }
            >
              {step.name}
            </button>
            {i < names.length - 1 && (
              <ArrowRight size={11} className="text-white/20 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Description */}
      <p className="text-[11px] text-white/40 leading-relaxed">
        {renderDescription(result.description)}
      </p>
    </motion.div>
  );
}
