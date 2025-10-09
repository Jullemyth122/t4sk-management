import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../../scss/custom-select.scss'
/**
 * CustomSelect props:
 * - options: [{ value, label, subtitle?, icon? }]
 * - value: selected value
 * - onChange: fn(value)
 * - placeholder: string
 * - searchable: bool (if true a search input is shown in dropdown)
 * - renderOption?: (option, { selected, highlighted }) => node
 * - ariaLabel
 */
export default function CustomSelect({
    options = [],
    value = null,
    onChange = () => {},
    placeholder = 'Select...',
    searchable = false,
    renderOption,
    ariaLabel = 'Custom select',
    className = '',
    width = "100%",
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const listRef = useRef(null);

  // derive filtered options
  const filtered = (query && searchable) ?
    options.filter(o => (o.label || '').toLowerCase().includes(query.toLowerCase()) || (o.subtitle || '').toLowerCase().includes(query.toLowerCase()))
    : options;

  // find selected option object
  const selectedOpt = options.find(o => o.value === value) || null;

  // close on click outside
  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    // clamp highlight
    if (highlight >= filtered.length) setHighlight(Math.max(0, filtered.length - 1));
  }, [filtered.length, highlight]);

  // keyboard handling
  const onKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); setHighlight(0); return; }
      setHighlight(h => Math.min(filtered.length - 1, h + 1));
      scrollToHighlighted();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); setHighlight( filtered.length - 1 ); return; }
      setHighlight(h => Math.max(0, h - 1));
      scrollToHighlighted();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      const opt = filtered[highlight];
      if (opt) { onChange(opt.value); setOpen(false); }
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [open, filtered, highlight, onChange]);

  const scrollToHighlighted = () => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${highlight}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  };

  useEffect(() => {
    if (open) {
      // reset query when opening (optional)
      if (!searchable) setQuery('');
      // ensure highlight in bounds
      setHighlight(0);
      // small timeout to allow DOM
      setTimeout(scrollToHighlighted, 50);
    }
  }, [open]); // eslint-disable-line

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const defaultRenderOption = (o, { selected }) => (
    <div className={`cs-row ${selected ? 'selected' : ''}`}>
      {o.icon ? <div className="cs-icon">{o.icon}</div> : null}
      <div className="cs-text">
        <div className="cs-label">{o.label}</div>
        {o.subtitle ? <div className="cs-sub">{o.subtitle}</div> : null}
      </div>
    </div>
  );

  return (
    <div
      className={`custom-select ${className} ${open ? 'open' : ''}`}
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="cs-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <div className="cs-trigger-left">
          {selectedOpt ? (
            <>
              {selectedOpt.icon ? <div className="cs-icon">{selectedOpt.icon}</div> : null}
              <div className="cs-text">
                <div className="cs-label">{selectedOpt.label}</div>
                {selectedOpt.subtitle ? <div className="cs-sub">{selectedOpt.subtitle}</div> : null}
              </div>
            </>
          ) : (
            <div className="cs-placeholder">{placeholder}</div>
          )}
        </div>
        <div className="cs-chevron" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </button>

      {open && (
        <div className="cs-menu" role="listbox" tabIndex={-1} style={{ width: width }} >
          {searchable && (
            <div className="cs-search-row">
              <input
                autoFocus
                className="cs-search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
                placeholder="Search..."
                aria-label="Search options"
              />
            </div>
          )}

          <div className="cs-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="cs-empty">No matching options</div>
            ) : (
              filtered.map((opt, i) => {
                const selected = opt.value === value;
                const highlighted = i === highlight;
                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={selected}
                    className={`cs-item ${selected ? 'selected' : ''} ${highlighted ? 'highlight' : ''}`}
                    data-index={i}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => { e.preventDefault(); }} // prevent blur
                    onClick={() => handleSelect(opt)}
                  >
                    { renderOption ? renderOption(opt, { selected, highlighted }) : defaultRenderOption(opt, { selected, highlighted }) }
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
