import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
// ============================================================
// Jurnii · Canvas Comments — interactive Liveblocks-style threads
// Chat bubble (pin) + chat window (compose & reply) component.
// ============================================================

/* ---------- Team / people ---------- */
const CC_TEAM = {
  you:     { id: 'you',     name: 'Sam Rivera',     first: 'Sam',     role: 'You · Product',        color: '#94FF96' },
  tristan: { id: 'tristan', name: 'Tristan Dexter', first: 'Tristan', role: 'Design Lead',          color: '#94FF96' },
  hadiya:  { id: 'hadiya',  name: 'Hadiya Khan',    first: 'Hadiya',  role: 'UX Researcher',        color: '#7DB1FF' },
  owen:    { id: 'owen',    name: 'Owen Pell',      first: 'Owen',    role: 'Frontend Engineer',    color: '#FCD34D' },
  mara:    { id: 'mara',    name: 'Mara Lind',      first: 'Mara',    role: 'Data Scientist',       color: '#FB7185' },
};
const CC_TEAM_LIST = Object.values(CC_TEAM);
const ME = 'you';

const CC_EMOJI = ['👍','❤️','🎉','👀','✅','🔥','😄','🙌','🤔','🚀','💡','👏'];
const REACT_EMOJI = ['👍','❤️','🎉','👀','✅','🔥'];

let _cidSeq = 100;
const cid = () => 'c' + (++_cidSeq);

/* Tweak defaults */
const CC_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#94FF96",
  "canvas": "dots",
  "presence": true
}/*EDITMODE-END*/;

/* Jurnii brand mark — green arrow + two sparkles (light-surface fill) */
const JurniiMark = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 88 88" fill="none" aria-hidden="true">
    <path d="M42.2788 52.8445L68.7087 41.0979C70.6628 40.2294 72.6595 42.2261 71.791 44.1802L60.0444 70.6101C59.0201 72.9149 55.5753 72.1839 55.5753 69.6617V59.6488C55.5753 58.3591 54.5298 57.3136 53.2401 57.3136H43.2272C40.705 57.3136 39.974 53.8688 42.2788 52.8445Z" fill="#57FF60" />
    <path d="M45.4314 17.2873C45.8936 15.5709 48.3288 15.5709 48.791 17.2873L50.541 23.7871C50.7022 24.3858 51.1698 24.8534 51.7685 25.0146L58.2683 26.7647C59.9847 27.2268 59.9847 29.6621 58.2683 30.1242L51.7685 31.8743C51.1698 32.0355 50.7022 32.5031 50.541 33.1018L48.791 39.6016C48.3288 41.318 45.8936 41.318 45.4314 39.6016L43.6814 33.1018C43.5202 32.5031 43.0525 32.0355 42.4539 31.8743L35.9541 30.1242C34.2376 29.6621 34.2376 27.2268 35.9541 26.7647L42.4539 25.0146C43.0525 24.8534 43.5202 24.3858 43.6814 23.7871L45.4314 17.2873Z" fill="#2A2A27" />
    <path d="M24.0735 40.2987C24.4201 39.0114 26.2465 39.0114 26.5932 40.2987L27.9057 45.1736C28.0266 45.6226 28.3773 45.9733 28.8263 46.0942L33.7012 47.4068C34.9885 47.7534 34.9885 49.5798 33.7012 49.9264L28.8263 51.239C28.3773 51.3598 28.0266 51.7106 27.9057 52.1596L26.5932 57.0344C26.2465 58.3217 24.4201 58.3217 24.0735 57.0344L22.761 52.1596C22.6401 51.7106 22.2893 51.3598 21.8403 51.239L16.9655 49.9264C15.6782 49.5798 15.6782 47.7534 16.9655 47.4068L21.8403 46.0942C22.2893 45.9733 22.6401 45.6226 22.761 45.1736L24.0735 40.2987Z" fill="#2A2A27" />
  </svg>
);

/* ---------- Icons ---------- */
const I = {
  chat: (p) => <svg width={p?.s||20} height={p?.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  at: (p) => <svg width={p?.s||20} height={p?.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>,
  smile: (p) => <svg width={p?.s||20} height={p?.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  paperclip: (p) => <svg width={p?.s||20} height={p?.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  send: (p) => <svg width={p?.s||19} height={p?.s||19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  check: (p) => <svg width={p?.s||19} height={p?.s||19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  more: (p) => <svg width={p?.s||19} height={p?.s||19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>,
  x: (p) => <svg width={p?.s||18} height={p?.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  link: (p) => <svg width={p?.s||16} height={p?.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  edit: (p) => <svg width={p?.s||16} height={p?.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: (p) => <svg width={p?.s||16} height={p?.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  file: (p) => <svg width={p?.s||16} height={p?.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
};

function initials(name) { return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(); }
function Avatar({ uid, sm }) {
  const u = CC_TEAM[uid] || { name: '?', color: '#94FF96' };
  return <span className={'cc-avatar' + (sm ? ' sm' : '')} style={{ background: u.color }} title={u.name}>{initials(u.name)}</span>;
}

/* ---------- Render body text with @mentions highlighted ---------- */
const MENTION_NAMES = CC_TEAM_LIST.flatMap(u => [u.name, u.first]).sort((a,b) => b.length - a.length);
function renderBody(text) {
  const names = MENTION_NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp('@(' + names + ')\\b', 'g');
  const out = []; let last = 0, m, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<span className="cc-mention" key={k++}>@{m[1]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* =========================================================
   Composer — textarea + @mention + emoji + (optional) attach
   ========================================================= */
function Composer({ placeholder, allowAttach, autoFocus, onSubmit, compact }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null); // {start, q} | null
  const [mIdx, setMIdx] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const ta = useRef(null);

  const grow = () => { const el = ta.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 132) + 'px'; };
  useEffect(grow, [text]);
  useEffect(() => { if (autoFocus && ta.current) ta.current.focus(); }, [autoFocus]);

  const matches = mentionQuery == null ? [] :
    CC_TEAM_LIST.filter(u => u.id !== ME && (u.name.toLowerCase().includes(mentionQuery.q.toLowerCase()) || u.first.toLowerCase().startsWith(mentionQuery.q.toLowerCase())));

  function detectMention(val, caret) {
    const upto = val.slice(0, caret);
    const at = upto.lastIndexOf('@');
    if (at === -1) return null;
    const between = upto.slice(at + 1);
    if (/\s/.test(between) && between.split(/\s+/).length > 2) return null; // too far past
    if (between.length > 24) return null;
    if (at > 0 && !/\s/.test(val[at - 1])) return null;
    return { start: at, q: between };
  }
  function onChange(e) {
    const val = e.target.value; setText(val);
    const caret = e.target.selectionStart;
    setMentionQuery(detectMention(val, caret)); setMIdx(0);
  }
  function pickMention(u) {
    if (!mentionQuery) return;
    const before = text.slice(0, mentionQuery.start);
    const after = text.slice(mentionQuery.start + 1 + mentionQuery.q.length);
    const next = before + '@' + u.name + ' ' + after;
    setText(next); setMentionQuery(null);
    requestAnimationFrame(() => { const el = ta.current; if (el) { el.focus(); const pos = (before + '@' + u.name + ' ').length; el.setSelectionRange(pos, pos); } });
  }
  function insertEmoji(em) {
    const el = ta.current; const caret = el ? el.selectionStart : text.length;
    const next = text.slice(0, caret) + em + text.slice(caret);
    setText(next); setEmojiOpen(false);
    requestAnimationFrame(() => { if (el) { el.focus(); const pos = caret + em.length; el.setSelectionRange(pos, pos); } });
  }
  function addFakeAttachment() {
    const samples = [
      { name: 'heatmap-checkout.png', size: '248 KB' },
      { name: 'session-replay.mp4', size: '1.4 MB' },
      { name: 'audit-notes.pdf', size: '92 KB' },
    ];
    setAttachments(a => [...a, samples[a.length % samples.length]]);
  }
  const canSend = text.trim().length > 0 || attachments.length > 0;
  function submit() {
    if (!canSend) return;
    onSubmit({ text: text.trim(), attachments });
    setText(''); setAttachments([]); setMentionQuery(null); setEmojiOpen(false);
    requestAnimationFrame(grow);
  }
  function onKeyDown(e) {
    if (mentionQuery && matches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMIdx(i => (i + 1) % matches.length); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMIdx(i => (i - 1 + matches.length) % matches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(matches[mIdx]); return; }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  return (
    <div className={'cc-composer' + (compact ? ' reply' : '')}>
      <textarea ref={ta} className="cc-input" rows={1} placeholder={placeholder}
        value={text} onChange={onChange} onKeyDown={onKeyDown} aria-label={placeholder} />

      {attachments.length > 0 && (
        <div className="cc-attach-row">
          {attachments.map((a, i) => (
            <span className="cc-attach" key={i}>
              <I.file s={15} />
              <span className="nm">{a.name}</span><span className="sz">{a.size}</span>
              <button className="cc-attach-x" onClick={() => setAttachments(list => list.filter((_, j) => j !== i))} aria-label="Remove attachment"><I.x s={13} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="cc-composer-toolbar">
        <button className={'cc-tool' + (mentionQuery ? ' is-on' : '')} title="Mention someone"
          onClick={() => { const el = ta.current; const caret = el ? el.selectionStart : text.length; const ins = text.slice(0, caret) + '@' + text.slice(caret); setText(ins); requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(caret+1, caret+1); setMentionQuery({ start: caret, q: '' }); } }); }}>
          <I.at s={19} />
        </button>
        <button className={'cc-tool' + (emojiOpen ? ' is-on' : '')} title="Emoji" onClick={() => setEmojiOpen(o => !o)}><I.smile s={19} /></button>
        {allowAttach && <button className="cc-tool" title="Attach file" onClick={addFakeAttachment}><I.paperclip s={19} /></button>}
        <button className="cc-send" disabled={!canSend} onClick={submit} title="Send (Enter)"><I.send s={19} /></button>
      </div>

      {mentionQuery && matches.length > 0 && (
        <div className="cc-pop" style={{ left: 14, bottom: 58 }} role="listbox">
          {matches.map((u, i) => (
            <button key={u.id} className={'cc-mention-item' + (i === mIdx ? ' active' : '')}
              onMouseEnter={() => setMIdx(i)} onClick={() => pickMention(u)}>
              <Avatar uid={u.id} sm />
              <span><span className="cc-mention-name">{u.name}</span><span className="cc-mention-role">{u.role}</span></span>
            </button>
          ))}
        </div>
      )}

      {emojiOpen && (
        <div className="cc-pop emoji" style={{ left: 14, bottom: 58 }}>
          <div className="cc-emoji-grid">
            {CC_EMOJI.map(em => <button key={em} onClick={() => insertEmoji(em)}>{em}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Reaction bar
   ========================================================= */
function Reactions({ reactions, onToggle }) {
  const [pickOpen, setPickOpen] = useState(false);
  const keys = Object.keys(reactions).filter(k => reactions[k].length);
  if (!keys.length && !pickOpen) {
    return <div className="cc-reactions"><AddReaction open={pickOpen} setOpen={setPickOpen} onPick={(em) => { onToggle(em); setPickOpen(false); }} /></div>;
  }
  return (
    <div className="cc-reactions">
      {keys.map(em => {
        const mine = reactions[em].includes(ME);
        return (
          <button key={em} className={'cc-reaction' + (mine ? ' is-mine' : '')} onClick={() => onToggle(em)}
            title={reactions[em].map(u => CC_TEAM[u]?.name || u).join(', ')}>
            <span className="em">{em}</span>{reactions[em].length}
          </button>
        );
      })}
      <AddReaction open={pickOpen} setOpen={setPickOpen} onPick={(em) => { onToggle(em); setPickOpen(false); }} />
    </div>
  );
}
function AddReaction({ open, setOpen, onPick }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button className="cc-reaction-add" title="Add reaction" onClick={() => setOpen(o => !o)}><I.smile s={16} /></button>
      {open && (
        <div className="cc-pop emoji" style={{ left: 0, bottom: 36 }}>
          <div className="cc-emoji-grid" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
            {REACT_EMOJI.map(em => <button key={em} onClick={() => onPick(em)}>{em}</button>)}
          </div>
        </div>
      )}
    </span>
  );
}

/* =========================================================
   Single comment
   ========================================================= */
function Comment({ c, isFirst, onResolve, resolved, onReact, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const u = CC_TEAM[c.authorId] || CC_TEAM.you;
  return (
    <div className="cc-comment">
      <div className="cc-comment-head">
        <Avatar uid={c.authorId} />
        <div className="cc-comment-meta">
          <span className="cc-author">{u.name}</span>
          <span className="cc-time">{c.time}</span>
          {c.edited && <span className="cc-edited">· edited</span>}
        </div>
        <div className="cc-head-actions">
          {isFirst && (
            <button className={'cc-icon-btn' + (resolved ? ' is-on' : '')} title={resolved ? 'Re-open thread' : 'Resolve thread'} onClick={onResolve}><I.check /></button>
          )}
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <button className="cc-icon-btn" title="React" onClick={() => setEmojiOpen(o => !o)}><I.smile /></button>
            {emojiOpen && (
              <div className="cc-pop emoji" style={{ right: 0, top: 36 }}>
                <div className="cc-emoji-grid">{REACT_EMOJI.map(em => <button key={em} onClick={() => { onReact(em); setEmojiOpen(false); }}>{em}</button>)}</div>
              </div>
            )}
          </span>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <button className="cc-icon-btn" title="More" onClick={() => setMenuOpen(o => !o)}><I.more /></button>
            {menuOpen && (
              <div className="cc-pop menu" style={{ top: 36, right: 0 }} onMouseLeave={() => setMenuOpen(false)}>
                <button className="cc-menu-item" onClick={() => setMenuOpen(false)}><I.link /> Copy link to comment</button>
                <button className="cc-menu-item" onClick={() => setMenuOpen(false)}><I.edit /> Edit comment</button>
                <div className="cc-menu-sep" />
                <button className="cc-menu-item danger" onClick={() => { setMenuOpen(false); onDelete(); }}><I.trash /> Delete</button>
              </div>
            )}
          </span>
        </div>
      </div>

      <div className="cc-comment-body">{renderBody(c.text)}</div>

      {c.attachments && c.attachments.length > 0 && (
        <div className="cc-attach-row">
          {c.attachments.map((a, i) => (<span className="cc-attach" key={i}><I.file s={15} /><span className="nm">{a.name}</span><span className="sz">{a.size}</span></span>))}
        </div>
      )}

      <Reactions reactions={c.reactions || {}} onToggle={onReact} />
    </div>
  );
}

/* =========================================================
   Thread window (existing thread) & Compose window (new)
   ========================================================= */
function ThreadWindow({ thread, dispatch, winRef }) {
  const addReply = ({ text, attachments }) => dispatch({ type: 'reply', id: thread.id, text, attachments });
  return (
    <div className="cc-window" ref={winRef}>
      {thread.resolved && (
        <div className="cc-resolved-banner">
          <I.check s={16} /> Resolved
          <button onClick={() => dispatch({ type: 'resolve', id: thread.id })}>Re-open</button>
        </div>
      )}
      <div className="cc-thread-scroll">
        {thread.comments.map((c, i) => (
          <Comment key={c.id} c={c} isFirst={i === 0} resolved={thread.resolved}
            onResolve={() => dispatch({ type: 'resolve', id: thread.id })}
            onReact={(em) => dispatch({ type: 'react', id: thread.id, cid: c.id, em })}
            onDelete={() => dispatch({ type: 'deleteComment', id: thread.id, cid: c.id })} />
        ))}
      </div>
      <Composer placeholder="Reply to thread…" allowAttach compact onSubmit={addReply} />
    </div>
  );
}

function ComposeWindow({ draft, dispatch, winRef }) {
  return (
    <div className="cc-window" ref={winRef}>
      <div className="cc-compose-head">
        <span className="cc-compose-eyebrow">New comment</span>
        <button className="cc-icon-btn" title="Cancel" onClick={() => dispatch({ type: 'cancelDraft' })}><I.x /></button>
      </div>
      <Composer placeholder="Write a comment…" allowAttach autoFocus
        onSubmit={({ text, attachments }) => dispatch({ type: 'createFromDraft', text, attachments })} />
    </div>
  );
}

/* ---------- positioned wrapper that flips to stay on screen ---------- */
function FloatingWindow({ x, y, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x + 14, top: y - 6, vis: false });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const cw = el.parentElement.clientWidth, ch = el.parentElement.clientHeight;
    let left = x + 14, top = y - 6;
    if (left + w > cw - 14) left = x - w - 14;        // flip left
    if (left < 14) left = 14;
    if (top + h > ch - 14) top = Math.max(14, ch - h - 14); // clamp up
    if (top < 14) top = 14;
    setPos({ left, top, vis: true });
  }, [x, y, children]);
  return (
    <div ref={ref} style={{ position: 'absolute', zIndex: 20, left: pos.left, top: pos.top, visibility: pos.vis ? 'visible' : 'hidden' }}>
      {children}
    </div>
  );
}

/* =========================================================
   Presence cursors (multiplayer flourish)
   ========================================================= */
function PresenceCursors({ enabled }) {
  const peers = [CC_TEAM.tristan, CC_TEAM.mara];
  const refs = useRef([]);
  // Each cursor: list of stops it visits {x, y, pause-after-arriving in ms}.
  const routes = [
    [ {x:0.60,y:0.29,pause:300}, {x:0.55,y:0.44,pause:650}, {x:0.40,y:0.55,pause:500},
      {x:0.63,y:0.61,pause:800}, {x:0.51,y:0.39,pause:0} ],
    [ {x:0.31,y:0.66,pause:300}, {x:0.38,y:0.50,pause:550}, {x:0.24,y:0.42,pause:750},
      {x:0.35,y:0.60,pause:500}, {x:0.43,y:0.69,pause:0} ],
  ];
  const MOVE = 720; // ms per hop — slow enough to clearly see
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ease = (p) => (p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2);
    const posAt = (stops, t) => {
      let time = 0, cur = stops[0];
      for (let i = 1; i < stops.length; i++) {
        const next = stops[i];
        if (t < time + MOVE) {
          const e = ease((t - time) / MOVE);
          return { x: cur.x + (next.x-cur.x)*e, y: cur.y + (next.y-cur.y)*e };
        }
        time += MOVE;
        const pause = next.pause || 0;
        if (t < time + pause) return { x: next.x, y: next.y };
        time += pause;
        cur = next;
      }
      return { x: cur.x, y: cur.y };
    };
    const total = Math.max(...routes.map(r =>
      (r.length - 1) * MOVE + r.reduce((s, st) => s + (st.pause || 0), 0)));
    let raf, t0 = null, started = false;
    const run = () => {
      const tick = (ts) => {
        if (t0 == null) t0 = ts;
        const t = ts - t0;
        routes.forEach((stops, i) => {
          const el = refs.current[i]; if (!el) return;
          const { x, y } = posAt(stops, t);
          el.style.left = (x * 100) + '%';
          el.style.top = (y * 100) + '%';
        });
        if (t < total) raf = requestAnimationFrame(tick);   // one-shot, then stop
      };
      raf = requestAnimationFrame(tick);
    };
    // Only start once the cursors are actually on screen.
    const anchor = refs.current[0];
    if (!anchor || !('IntersectionObserver' in window)) { run(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting && !started) { started = true; run(); io.disconnect(); } });
    }, { threshold: 0.4 });
    io.observe(anchor);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [enabled]);
  if (!enabled) return null;
  return peers.map((u, i) => (
    <div key={u.id} ref={el => (refs.current[i] = el)} className="cc-cursor"
      style={{ left: `${routes[i][0].x * 100}%`, top: `${routes[i][0].y * 100}%` }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={u.color} stroke="#1F3133" strokeWidth="1"><path d="M5 3l5.5 15 2.2-6.3L19 9.5 5 3z"/></svg>
      <span className="cc-cursor-label" style={{ background: u.color, color: '#143A1B' }}>{u.first}</span>
    </div>
  ));
}

/* =========================================================
   Faux artboard being reviewed
   ========================================================= */
function Artboard({ rect }) {
  return (
    <div className="cc-board" style={rect}>
      <div className="cc-board-label">Checkout Flow · UX Audit</div>
      <div className="cc-fauxhead">
        <div className="cc-fauxtitle" />
        <div className="cc-fauxpill" />
      </div>
      <div className="cc-fauxbody">
        <div className="cc-fauxgauge">
          <div className="cc-fauxgauge-ring" />
          <div className="cc-fauxlines">
            <div className="cc-fauxline s2" /><div className="cc-fauxline s1" /><div className="cc-fauxline s3" />
          </div>
        </div>
        <div className="cc-fauxbars">
          {[['#FB923C',.38],['#FACC15',.63],['#4ADE80',.66],['#FB7185',.65]].map(([clr,w],i) => (
            <div className="cc-fauxbar" key={i}>
              <div className="cc-fauxbar-cap" />
              <div className="cc-fauxbar-track"><div className="cc-fauxbar-fill" style={{ width: (w*100)+'%', background: clr }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Seed data
   ========================================================= */
function seedThreads() {
  return [
    {
      id: 't1', x: 0, y: 0, nx: 0.595, ny: 0.40, resolved: false, unread: true,
      comments: [
        { id: cid(), authorId: 'tristan', time: '35m ago', text: 'This is great @Hadiya — the gauge reads way clearer at this size. Nice work.',
          reactions: { '🎉': ['hadiya','owen'], '👍': ['you'] } },
        { id: cid(), authorId: 'hadiya', time: '28m ago', text: 'Thanks! Pulled the score colour straight from the design tokens so it stays on-brand.',
          reactions: {} },
      ],
    },
    {
      id: 't2', x: 0, y: 0, nx: 0.40, ny: 0.74, resolved: false, unread: false,
      comments: [
        { id: cid(), authorId: 'mara', time: '12m ago', text: 'Can we double-check the Performance bar here? @Owen the number looks low vs. last week’s pull.',
          reactions: { '👀': ['owen'] },
          attachments: [{ name: 'perf-trend.png', size: '156 KB' }] },
      ],
    },
  ];
}

/* =========================================================
   App
   ========================================================= */
function CanvasComments() {
  const [t, setTweak] = useTweaks(CC_TWEAK_DEFAULTS);
  const canvasRef = useRef(null);
  const [threads, setThreads] = useState(seedThreads);
  const [draft, setDraft] = useState(null);        // {x,y}
  const [openId, setOpenId] = useState(null);
  const [commenting, setCommenting] = useState(false);
  const [hintHidden, setHintHidden] = useState(false);

  // apply accent tweak as CSS var on root
  const accent = t.accent || '#94FF96';

  const dispatch = useCallback((action) => {
    switch (action.type) {
      case 'createFromDraft': {
        if (!draft) return;
        const id = 't' + Date.now();
        const nt = { id, nx: draft.nx, ny: draft.ny, resolved: false, unread: false, isNew: true,
          comments: [{ id: cid(), authorId: ME, time: 'just now', text: action.text || '(attachment)', reactions: {}, attachments: action.attachments }] };
        setThreads(prev => [...prev, nt]); setDraft(null); setOpenId(id);
        break;
      }
      case 'cancelDraft': setDraft(null); break;
      case 'reply':
        setThreads(prev => prev.map(th => th.id === action.id ? { ...th, resolved: false,
          comments: [...th.comments, { id: cid(), authorId: ME, time: 'just now', text: action.text || '(attachment)', reactions: {}, attachments: action.attachments }] } : th));
        break;
      case 'resolve':
        setThreads(prev => prev.map(th => th.id === action.id ? { ...th, resolved: !th.resolved, unread: false } : th));
        break;
      case 'react':
        setThreads(prev => prev.map(th => {
          if (th.id !== action.id) return th;
          return { ...th, comments: th.comments.map(c => {
            if (c.id !== action.cid) return c;
            const r = { ...(c.reactions || {}) }; const arr = r[action.em] ? [...r[action.em]] : [];
            const i = arr.indexOf(ME); if (i >= 0) arr.splice(i,1); else arr.push(ME);
            if (arr.length) r[action.em] = arr; else delete r[action.em];
            return { ...c, reactions: r };
          }) };
        }));
        break;
      case 'deleteComment':
        setThreads(prev => prev.flatMap(th => {
          if (th.id !== action.id) return [th];
          const comments = th.comments.filter(c => c.id !== action.cid);
          if (!comments.length) { if (openId === th.id) setOpenId(null); return []; }
          return [{ ...th, comments }];
        }));
        break;
    }
  }, [draft, openId]);

  function canvasXY(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top, w: r.width, h: r.height };
  }

  function onCanvasClick(e) {
    if (!commenting) return;
    // ignore clicks landing on an open window / pin
    if (e.target.closest('.cc-window') || e.target.closest('.cc-pin') || e.target.closest('.cc-pop')) return;
    const { px, py, w, h } = canvasXY(e);
    setDraft({ nx: px / w, ny: py / h });
    setOpenId(null); setCommenting(false); setHintHidden(true);
  }

  // resolve absolute pixel pos from normalized coords
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  function abs(nx, ny) { return { x: nx * size.w, y: ny * size.h }; }

  // Esc closes
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setDraft(null); setOpenId(null); setCommenting(false); } if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey && document.activeElement.tagName !== 'TEXTAREA') { setCommenting(c => !c); setHintHidden(true); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openThread = threads.find(th => th.id === openId);

  // board rect (centered)
  const boardRect = { left: '50%', top: '50%', width: 'min(540px, 80%)', height: 'min(360px, 62%)', transform: 'translate(-50%,-50%)' };

  return (
    <div className={'cc-canvas' + (commenting ? ' is-commenting' : '')} data-bg={t.canvas} ref={canvasRef}
      onClick={onCanvasClick} style={{ '--cc-accent': accent }}>

      {/* the surface being reviewed */}
      <Artboard rect={boardRect} />

      <PresenceCursors enabled={t.presence} />

      {/* Pins */}
      {threads.map(th => {
        const p = abs(th.nx, th.ny);
        return (
          <button key={th.id}
            className={'cc-pin' + (th.isNew ? ' is-new' : '') + (openId === th.id ? ' is-active' : '') + (th.unread && !th.resolved ? ' is-unread' : '') + (th.resolved ? ' is-resolved' : '')}
            style={{ left: p.x, top: p.y }}
            onClick={(e) => { e.stopPropagation(); setHintHidden(true); setThreads(prev => prev.map(x => x.id === th.id ? { ...x, unread: false } : x)); setOpenId(id => id === th.id ? null : th.id); setDraft(null); setCommenting(false); }}>
            <span className="cc-pin-bubble">
              {th.resolved ? <I.check s={18} /> : <I.chat s={18} />}
              {!th.resolved && th.comments.length > 1 && <span className="cc-pin-count">{th.comments.length}</span>}
            </span>
          </button>
        );
      })}

      {/* Draft pin + compose window */}
      {draft && (() => { const p = abs(draft.nx, draft.ny); return (
        <React.Fragment>
          <span className="cc-pin cc-pin-draft" style={{ left: p.x, top: p.y }}><span className="cc-pin-bubble"><I.chat s={18} /></span></span>
          <FloatingWindow x={p.x} y={p.y}><ComposeWindow draft={draft} dispatch={dispatch} /></FloatingWindow>
        </React.Fragment>
      ); })()}

      {/* Open thread window */}
      {openThread && (() => { const p = abs(openThread.nx, openThread.ny); return (
        <FloatingWindow x={p.x} y={p.y}><ThreadWindow thread={openThread} dispatch={dispatch} /></FloatingWindow>
      ); })()}

      {/* Toolbar */}
      <div className="cc-toolbar">
        <div className="cc-tb-brand">
          <JurniiMark size={26} />
          <div>
            <div className="cc-tb-title">Canvas Comments</div>
            <div className="cc-tb-sub">Live · {threads.filter(x=>!x.resolved).length} open threads</div>
          </div>
        </div>
        <div className="cc-tb-spacer" />
        <div className="cc-tb-presence" title="Online now">
          {[CC_TEAM.you, CC_TEAM.tristan, CC_TEAM.mara, CC_TEAM.hadiya].map(u => <Avatar key={u.id} uid={u.id} sm />)}
        </div>
        <button className={'cc-tb-comment' + (commenting ? ' is-on' : '')} onClick={(e) => { e.stopPropagation(); setCommenting(c => !c); setDraft(null); setOpenId(null); setHintHidden(true); }}>
          <I.chat s={18} /> {commenting ? 'Click to place' : 'Comment'} <span className="kbd">C</span>
        </button>
      </div>

      {/* Hint */}
      <div className={'cc-hint' + (hintHidden ? ' hide' : '')}>
        <span className="dot" /> Press <b style={{margin:'0 2px'}}>C</b> or hit Comment, then click the canvas to drop a thread
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Comment widget" />
        <TweakColor label="Send / accent" value={t.accent}
          options={['#94FF96', '#57FF60', '#7DB1FF', '#FACC15']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Canvas" />
        <TweakRadio label="Background" value={t.canvas} options={['dots', 'plain', 'dark']}
          onChange={(v) => setTweak('canvas', v)} />
        <TweakToggle label="Presence cursors" value={t.presence} onChange={(v) => setTweak('presence', v)} />
      </TweaksPanel>
    </div>
  );
}

export { CanvasComments };
