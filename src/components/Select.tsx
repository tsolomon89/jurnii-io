import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string };

interface SelectProps {
  id: string;
  name: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  id,
  name,
  value,
  options,
  placeholder = 'Select…',
  required = false,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);
  const label = selected?.label || placeholder;

  const place = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const estimated = Math.min(360, options.length * 48 + 16);
    const below = window.innerHeight - r.bottom - 8;
    const top = below < estimated && r.top > estimated ? r.top - 8 - estimated : r.bottom + 8;
    setMenuPos({ top, left: r.left, width: r.width });
  };

  const setOpenAndPlace = (next: boolean | ((o: boolean) => boolean)) => {
    const willOpen = typeof next === 'function' ? next(open) : next;
    if (willOpen) place();
    setOpen(willOpen);
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    setActive(idx);
  }, [open, options, value]);

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
    btnRef.current?.focus();
  };

  const move = (dir: 1 | -1) => {
    setActive((i) => {
      const start = i < 0 ? (dir === 1 ? -1 : options.length) : i;
      return Math.min(options.length - 1, Math.max(0, start + dir));
    });
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpenAndPlace(true);
      else move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) setOpenAndPlace(true);
      else if (active >= 0 && options[active]) commit(options[active].value);
    } else if (e.key === 'Home' && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End' && open) {
      e.preventDefault();
      setActive(options.length - 1);
    }
  };

  const menu = open
    ? createPortal(
        <ul
          ref={menuRef}
          id={listId}
          className="ui-select-menu"
          role="listbox"
          aria-labelledby={id}
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                className={`ui-select-option${isSelected ? ' is-selected' : ''}${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(o.value)}
              >
                <span>{o.label}</span>
                {isSelected ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ul>,
        document.body
      )
    : null;

  return (
    <div className={`ui-select${open ? ' is-open' : ''}`} ref={wrapRef}>
      <select
        id={`${id}-native`}
        name={name}
        required={required}
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        className="ui-select-native"
        onChange={() => {}}
        onInvalid={(e) => {
          e.preventDefault();
          btnRef.current?.focus();
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={`ui-select-trigger${!value ? ' is-placeholder' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpenAndPlace((o) => !o)}
        onKeyDown={onTriggerKey}
      >
        <span className="ui-select-label">{label}</span>
        <ChevronDown className="ui-select-chevron" size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
};
