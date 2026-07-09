import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  desc?: string;
  badge?: {
    label: string;
    bg: string;
    text: string;
    dot?: string;
  };
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  className = '',
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const estimatedHeight = Math.min(options.length * 44 + 8, 240);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
      setCoords({
        top: openUp ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        openUp,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, options.length]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Hidden input for HTML5 form validation */}
      <input
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        required={required}
        value={value}
        onChange={() => {}}
      />

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {selected ? (
            <>
              {selected.badge && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${selected.badge.bg} ${selected.badge.text}`}>
                  {selected.badge.dot && <span className={`w-1.5 h-1.5 rounded-full ${selected.badge.dot}`} />}
                  {selected.badge.label}
                </span>
              )}
              <span className="truncate text-slate-800">{selected.label}</span>
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown (portaled to body so it can't be clipped by modal/overflow containers) */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[100] bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 overflow-hidden"
          style={{
            top: coords.openUp ? undefined : coords.top + 4,
            bottom: coords.openUp ? window.innerHeight - coords.top + 4 : undefined,
            left: coords.left,
            width: coords.width,
          }}
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      {opt.badge && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${opt.badge.bg} ${opt.badge.text}`}>
                          {opt.badge.dot && <span className={`w-1.5 h-1.5 rounded-full ${opt.badge.dot}`} />}
                          {opt.badge.label}
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                    </span>
                    {opt.desc && <span className="block text-xs text-slate-400 mt-0.5">{opt.desc}</span>}
                  </span>
                  {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
