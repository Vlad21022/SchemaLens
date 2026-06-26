import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onConnect: (connectionString: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

const EXAMPLES = [
  'postgresql://postgres:password@localhost:5432/mydb',
  'postgresql://user:secret@db.example.com:5432/production',
];

export default function ConnectionForm({ onConnect, error, loading }: Props) {
  const [value, setValue] = useState('');
  const [example] = useState(() => EXAMPLES[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onConnect(trimmed);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 50 }}>
      {/* Radial glow background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass rounded-2xl w-full max-w-lg mx-4 p-8 relative"
      >
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            <Database size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">SchemaLens</h1>
            <p className="text-[11px] text-white/35">Database schema explorer</p>
          </div>
        </div>

        <p className="text-lg font-semibold text-white mb-1">
          Connect your database
        </p>
        <p className="text-sm text-white/40 mb-6">
          Paste a PostgreSQL connection string to explore your schema instantly.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-3">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={example}
              disabled={loading}
              className="w-full font-mono text-[13px] bg-white/5 border border-white/10 rounded-xl
                         px-4 py-3.5 text-white/90 placeholder-white/20
                         focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30
                         disabled:opacity-50 transition-all pr-12"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={!value.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2
                         w-9 h-9 rounded-lg flex items-center justify-center
                         disabled:opacity-30 transition-all"
              style={{
                background: value.trim() && !loading
                  ? 'linear-gradient(135deg, #7c3aed, #3b82f6)'
                  : 'rgba(255,255,255,0.08)',
              }}
            >
              {loading
                ? <Loader2 size={15} className="text-white animate-spin" />
                : <ArrowRight size={15} className="text-white" />
              }
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 text-red-400/80 text-[12px] bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2.5 mb-3"
            >
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span className="font-mono">{error}</span>
            </motion.div>
          )}

          <p className="text-[11px] text-white/25">
            Connection is local-only. Credentials never leave your machine.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
