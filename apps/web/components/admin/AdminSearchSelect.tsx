'use client';

import { useEffect, useRef, useState } from 'react';

export interface AdminSearchOption {
  id: string;
  primary: string;   // shown as the main label (e.g. "JFK" or service name)
  secondary?: string; // shown next to the primary (e.g. airport city, service slug)
}

interface AdminSearchSelectProps {
  options: AdminSearchOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  noResultsLabel?: string;
}

export function AdminSearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Type to search…',
  disabled = false,
  required = false,
  noResultsLabel = 'No results',
}: AdminSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.id === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) =>
        `${o.primary} ${o.secondary ?? ''}`.toLowerCase().includes(q),
      )
    : options;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none text-left flex items-center justify-between disabled:opacity-50"
      >
        <span className={selected ? 'text-brand-white' : 'text-gray-500'}>
          {selected
            ? `${selected.primary}${selected.secondary ? ' — ' + selected.secondary : ''}`
            : placeholder}
        </span>
        <span className="text-gray-500 text-xs">{open ? '▴' : '▾'}</span>
      </button>

      {/* Hidden native input keeps `required` validation working when nested in a form */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => undefined}
          className="sr-only absolute inset-0 opacity-0 pointer-events-none"
        />
      )}

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-brand-black border border-white/10 rounded shadow-lg max-h-72 overflow-hidden flex flex-col">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="px-3 py-2 bg-transparent border-b border-white/10 text-brand-white text-sm focus:outline-none"
          />
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-500">{noResultsLabel}</p>
            ) : (
              filtered.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setQuery('');
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                    opt.id === value
                      ? 'bg-brand-gold/20 text-brand-gold'
                      : 'text-brand-white hover:bg-white/5'
                  }`}
                >
                  <span className="font-medium">{opt.primary}</span>
                  {opt.secondary && (
                    <span className="text-gray-500 ml-2">— {opt.secondary}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
