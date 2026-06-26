import { motion } from 'framer-motion';
import { Database, Table2, GitFork, RotateCcw } from 'lucide-react';

interface Props {
  connectionString: string;
  tableCount: number;
  edgeCount: number;
  onDisconnect: () => void;
}

function parseDbName(cs: string): string {
  try {
    const url = new URL(cs);
    return url.pathname.slice(1) || url.hostname;
  } catch {
    const m = cs.match(/dbname\s*=\s*(\S+)/i) ?? cs.match(/\/([^/?]+)(?:\?|$)/);
    return m ? m[1] : 'database';
  }
}

export default function StatusBar({ connectionString, tableCount, edgeCount, onDisconnect }: Props) {
  const dbName = parseDbName(connectionString);

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
      className="absolute top-4 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2 flex items-center gap-4"
      style={{ zIndex: 20 }}
    >
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        <Database size={12} className="text-white/40" />
        <span className="font-mono text-xs text-white/70">{dbName}</span>
      </div>

      <div className="w-px h-3 bg-white/10" />

      <div className="flex items-center gap-1 text-[11px] text-white/40">
        <Table2 size={11} />
        <span className="font-mono">{tableCount}</span>
        <span className="text-white/20">tables</span>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-white/40">
        <GitFork size={11} />
        <span className="font-mono">{edgeCount}</span>
        <span className="text-white/20">relations</span>
      </div>

      <div className="w-px h-3 bg-white/10" />

      <button
        onClick={onDisconnect}
        className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
      >
        <RotateCcw size={11} />
        <span>disconnect</span>
      </button>
    </motion.div>
  );
}
