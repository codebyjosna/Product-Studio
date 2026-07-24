import React from 'react';
import { History, PanelLeftClose, PanelLeft, Plus, Trash2, Sparkles } from 'lucide-react';
import type { StudioHistoryItem } from '../lib/studioHistory';

interface HistorySidebarProps {
  open: boolean;
  onToggle: () => void;
  items: StudioHistoryItem[];
  activeId: string | null;
  onSelect: (item: StudioHistoryItem) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function HistorySidebar({
  open,
  onToggle,
  items,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: HistorySidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close history"
          className="fixed inset-0 z-30 bg-ink/60 backdrop-blur-sm md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed md:relative z-40 md:z-10 top-0 left-0 h-dvh md:h-auto md:self-stretch
          flex flex-col shrink-0 border-r border-white/8
          bg-[#0a0a0f]/85 backdrop-blur-2xl
          transition-[width,transform] duration-300 ease-out
          ${open ? 'w-[272px] translate-x-0' : 'w-0 md:w-14 -translate-x-full md:translate-x-0 overflow-hidden'}
        `}
        aria-label="Project history"
      >
        <div className={`flex flex-col h-full min-w-[272px] md:min-w-0 ${open ? 'md:min-w-[272px]' : 'md:min-w-[3.5rem]'}`}>
          <div className="flex items-center justify-between gap-2 px-3 h-14 border-b border-white/8">
            {open ? (
              <>
                <div className="flex items-center gap-2 min-w-0 text-snow">
                  <History className="w-4 h-4 text-white/50 shrink-0" />
                  <span className="text-sm font-semibold tracking-wide truncate">History</span>
                </div>
                <button
                  type="button"
                  onClick={onToggle}
                  className="p-2 rounded-lg text-white/50 hover:text-snow hover:bg-white/5 transition-colors"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onToggle}
                className="mx-auto p-2 rounded-lg text-white/50 hover:text-snow hover:bg-white/5 transition-colors hidden md:inline-flex"
                aria-label="Open history"
                title="History"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {open && (
            <div className="p-3">
              <button
                type="button"
                onClick={onNew}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl
                  text-sm font-semibold text-snow bg-white/8 hover:bg-white/12 border border-white/10
                  transition-colors"
              >
                <Plus className="w-4 h-4" />
                New project
              </button>
            </div>
          )}

          {open && (
            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 hide-scrollbar">
              {items.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Sparkles className="w-5 h-5 text-white/25 mx-auto mb-2" />
                  <p className="text-xs text-white/40 leading-relaxed">
                    Your generations will show up here.
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const active = item.id === activeId;
                  return (
                    <div
                      key={item.id}
                      className={`group relative flex items-start gap-2 rounded-xl px-2.5 py-2.5 transition-colors ${
                        active
                          ? 'bg-white/10 text-snow'
                          : 'text-white/65 hover:bg-white/5 hover:text-snow'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-[13px] font-medium leading-snug truncate">{item.title}</div>
                        <div className="mt-0.5 text-[11px] text-white/35">
                          {formatWhen(item.updatedAt)}
                          {item.versionCount ? ` · ${item.versionCount}v` : ''}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/35 hover:text-danger hover:bg-white/5 transition-all shrink-0"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
