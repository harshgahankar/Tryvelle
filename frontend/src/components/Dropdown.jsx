import { useEffect, useId, useRef, useState } from "react";

// Styled replacement for <select>: native option lists can't be themed.
// options: [[value, label], ...]. Keyboard: arrows, Home/End, Enter/Space, Esc.
export default function Dropdown({ label, value, options, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const listId = useId();
  const current = options.find(([v]) => v === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const openList = () => {
    setActive(Math.max(0, options.findIndex(([v]) => v === current[0])));
    setOpen(true);
  };
  const pick = (i) => { onChange(options[i][0]); setOpen(false); };

  const onKey = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    const last = options.length - 1;
    const moves = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last };
    if (e.key in moves) { e.preventDefault(); setActive(moves[e.key]); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(active); }
    else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`inline-flex items-center gap-2 h-10 pl-3.5 pr-2.5 rounded-full border bg-white text-[14px] transition-colors
          ${open ? "border-on-surface" : "border-border hover:border-on-surface"}`}
      >
        {label && <span className="text-secondary">{label}</span>}
        <span className="font-semibold">{current[1]}</span>
        <span className={`material-symbols-outlined text-[20px] transition-transform ${open ? "rotate-180" : ""}`}>expand_more</span>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-activedescendant={`${listId}-${active}`}
          className="absolute right-0 z-30 mt-2 min-w-full w-max py-1.5 bg-white rounded-xl border border-border shadow-lg animate-[fadeIn_120ms_ease-out]"
        >
          {options.map(([v, l], i) => {
            const selected = v === current[0];
            return (
              <li
                key={v}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(i); }}
                className={`flex items-center gap-3 px-4 py-2.5 text-[14px] cursor-pointer
                  ${i === active ? "bg-surface-container-low" : ""} ${selected ? "font-semibold" : ""}`}
              >
                <span className="flex-1 whitespace-nowrap">{l}</span>
                <span className={`material-symbols-outlined text-[18px] text-primary-container ${selected ? "" : "invisible"}`}>check</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
