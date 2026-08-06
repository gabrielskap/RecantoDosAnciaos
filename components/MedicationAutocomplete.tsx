import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, Search } from 'lucide-react';
import { AnvisaMedication, searchAnvisaMedications } from '../services/anvisaMedicationService';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (medication: AnvisaMedication) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const inputClass = 'w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const MedicationAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Digite ao menos 2 letras',
  required = false,
  className = '',
}) => {
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const [options, setOptions] = useState<AnvisaMedication[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [failed, setFailed] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUp: false });

  useEffect(() => {
    const term = value.trim();
    const request = ++requestRef.current;
    setFailed(false);
    setActiveIndex(-1);

    if (term.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchAnvisaMedications(term);
        if (request !== requestRef.current) return;
        setOptions(result);
        setOpen(true);
      } catch (error) {
        if (request !== requestRef.current) return;
        console.error('Erro ao buscar medicamentos ANVISA:', error);
        setOptions([]);
        setFailed(true);
        setOpen(true);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const updatePosition = () => {
      const rect = inputRef.current!.getBoundingClientRect();
      const estimatedHeight = Math.min(Math.max(options.length, 1) * 68 + 8, 292);
      const spaceBelow = window.innerHeight - rect.bottom;
      setCoords({
        top: spaceBelow < estimatedHeight && rect.top > spaceBelow ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        openUp: spaceBelow < estimatedHeight && rect.top > spaceBelow,
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

  const selectOption = (option: AnvisaMedication) => {
    onChange(option.nomeProduto);
    onSelect?.(option);
    setOpen(false);
    setActiveIndex(-1);
  };

  const showDropdown = open && value.trim().length >= 2 && !loading;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        required={required}
        type="text"
        autoComplete="off"
        value={value}
        onChange={event => { onChange(event.target.value); setOpen(true); }}
        onFocus={() => { if (value.trim().length >= 2) setOpen(true); }}
        onKeyDown={event => {
          if (!showDropdown || options.length === 0) {
            if (event.key === 'Escape') setOpen(false);
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex(index => (index + 1) % options.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(index => (index <= 0 ? options.length - 1 : index - 1));
          } else if (event.key === 'Enter' && activeIndex >= 0) {
            event.preventDefault();
            selectOption(options[activeIndex]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        className={inputClass}
        placeholder={placeholder}
      />
      {loading && <LoaderCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />}

      {showDropdown && createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          className="fixed z-[110] bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 overflow-hidden"
          style={{
            top: coords.openUp ? undefined : coords.top + 4,
            bottom: coords.openUp ? window.innerHeight - coords.top + 4 : undefined,
            left: coords.left,
            width: coords.width,
          }}
        >
          {failed ? (
            <p className="px-3 py-3 text-xs text-rose-600">Não foi possível consultar o catálogo da ANVISA.</p>
          ) : options.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-500">Nenhum medicamento encontrado. Você pode manter o nome digitado.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto py-1">
              {options.map((option, index) => (
                <button
                  key={`${option.id}-${option.nomeProduto}-${index}`}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={event => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                  className={`w-full px-3 py-2.5 text-left transition-colors ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="block text-sm font-semibold text-slate-800">
                    {option.nomeProduto}{option.complementoMarca ? ` — ${option.complementoMarca}` : ''}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5 line-clamp-2">{option.principioAtivo}</span>
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default MedicationAutocomplete;
