import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { COUNTRIES } from '../data/countries';

interface CountrySelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function CountrySelect({ id, value, onChange, required }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...COUNTRIES];
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-ink/70 border border-line text-left px-3 py-3 font-mono text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40"
      >
        <span className={value ? 'text-fog' : 'text-mist/40'}>
          {value || 'Select country'}
        </span>
        <ChevronDown className={`w-4 h-4 text-mist shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden input for native required validation when form submits */}
      <input
        tabIndex={-1}
        aria-hidden
        required={required}
        value={value}
        onChange={() => {}}
        className="sr-only absolute opacity-0 pointer-events-none h-0 w-0"
      />

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg border border-line bg-panel-elevated shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-line">
            <Search className="w-4 h-4 text-mist shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country..."
              className="w-full bg-transparent text-sm text-fog placeholder:text-mist/40 focus:outline-none font-mono"
            />
          </div>
          <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs font-mono text-mist">No countries found</li>
            ) : (
              filtered.map((country) => {
                const selected = country === value;
                return (
                  <li key={country}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(country);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        selected ? 'bg-accent/10 text-accent' : 'text-fog hover:bg-ink/60 hover:text-snow'
                      }`}
                    >
                      <span>{country}</span>
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
