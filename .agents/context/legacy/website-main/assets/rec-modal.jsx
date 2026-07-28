// Recommendation Modal — Jurnii UX platform component
const { useState, useRef, useEffect } = React;

const RM_TEAM = {
  you: { name: 'Sam Rivera', initials: 'SR', color: 'var(--jurnii-200)' },
  fl: { name: 'Fraser Lane', initials: 'FL', color: '#7DB1FF' },
  tc: { name: 'Tristan Chen', initials: 'TC', color: 'var(--average)' },
  tf: { name: 'Tom Flynn', initials: 'TF', color: 'var(--performance)' },
  hp: { name: 'Harriet Park', initials: 'HP', color: 'var(--poor)' },
  mv: { name: 'Maria Vidal', initials: 'MV', color: 'var(--perception)' }
};

const RM_MENTION_OPTIONS = [
{ id: 'jurnii', name: 'Jurnii', initials: 'JN', color: 'var(--jurnii-200)' },
{ id: 'alex_m', name: 'Alex Morgan', initials: 'AM', color: '#7DB1FF' },
{ id: 'priya_s', name: 'Priya Sharma', initials: 'PS', color: 'var(--average)' }];


const RM_EMOJIS = ['👍', '❤️', '🎉', '👀', '✅', '🔥', '😄', '🙌', '🤔', '🚀', '💡', '👏'];

function renderMentions(text) {
  if (typeof text !== 'string') return text;
  const names = [...RM_MENTION_OPTIONS.map((m) => m.name), ...Object.values(RM_TEAM).map((u) => u.name)];
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp('@(' + escaped + ')', 'g');
  const parts = [];let last = 0,m,k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<span className="rm-mention" key={k++}>@{m[1]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

function RMAvatar({ uid, color: col, initials: ini, sm }) {
  const u = RM_TEAM[uid] || {};
  const bg = col || u.color || 'var(--jurnii-200)';
  const letters = ini || u.initials || '?';
  return (
    <span className={`rm-avatar${sm ? ' sm' : ''}`} style={{ background: bg }} title={u.name || ini}>
      {letters}
    </span>);

}

const sv = (d, s = 18) =>
<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;

const RMI = {
  send: () => sv(<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>, 18),
  at: () => sv(<><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" /></>, 18),
  smile: () => sv(<><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>, 18),
  paperclip: () => sv(<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />, 18),
  chevDn: () => sv(<polyline points="6 9 12 15 18 9" />, 16),
  chevUp: () => sv(<polyline points="18 15 12 9 6 15" />, 14),
  chevDn2: () => sv(<polyline points="6 9 12 15 18 9" />, 14),
  x: () => sv(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, 18),
  jira: () => sv(<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12h6M12 9v6" /></>, 15)
};

function RMComposer({ placeholder, onSubmit, compact }) {
  const [text, setText] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mentionPos, setMentionPos] = useState(null);
  const [emojiPos, setEmojiPos] = useState(null);
  const ta = useRef(null);
  const wrapRef = useRef(null);
  const atBtnRef = useRef(null);
  const emojiBtnRef = useRef(null);

  useEffect(() => {
    const el = ta.current;if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 110) + 'px';
  }, [text]);

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMentionOpen(false);setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const calcPos = (btnRef) => {
    if (!btnRef.current) return {};
    const r = btnRef.current.getBoundingClientRect();
    return { position: 'fixed', left: r.left, bottom: window.innerHeight - r.top + 6, zIndex: 9999 };
  };

  const openMention = () => {
    setMentionPos(calcPos(atBtnRef));
    setMentionOpen((o) => !o);setEmojiOpen(false);
  };
  const openEmoji = () => {
    setEmojiPos(calcPos(emojiBtnRef));
    setEmojiOpen((o) => !o);setMentionOpen(false);
  };

  const insertMention = (person) => {
    const el = ta.current;
    const caret = el ? el.selectionStart : text.length;
    const before = text.slice(0, caret);
    const lastAt = before.lastIndexOf('@');
    const hasOpenAt = lastAt !== -1 && !/\s/.test(before.slice(lastAt + 1));
    const start = hasOpenAt ? lastAt : caret;
    const newText = text.slice(0, start) + '@' + person.name + ' ' + text.slice(caret);
    setText(newText);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      if (el) {el.focus();const p = start + person.name.length + 2;el.setSelectionRange(p, p);}
    });
  };

  const insertEmoji = (em) => {
    const el = ta.current;
    const caret = el ? el.selectionStart : text.length;
    const newText = text.slice(0, caret) + em + text.slice(caret);
    setText(newText);setEmojiOpen(false);
    requestAnimationFrame(() => {if (el) {el.focus();const p = caret + em.length;el.setSelectionRange(p, p);}});
  };

  const canSend = text.trim().length > 0;
  const submit = () => {if (!canSend) return;onSubmit(text.trim());setText('');};

  return (
    <div className={`rm-composer${compact ? ' compact' : ''}`} ref={wrapRef}>
      <textarea ref={ta} className="rm-input" rows={compact ? 1 : 2}
      placeholder={placeholder} value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault();submit();}}} />
      <div className="rm-composer-bar">
        <span className="rm-tool-wrap">
          <button ref={atBtnRef} className={`rm-tool${mentionOpen ? ' is-on' : ''}`} title="Tag someone"
          onClick={openMention}>
            <RMI.at />
          </button>
          {mentionOpen &&
          <div className="rm-pop mention-pop" style={mentionPos}>
              {RM_MENTION_OPTIONS.map((p) =>
            <button key={p.id} className="rm-pop-item" onClick={() => insertMention(p)}>
                  <RMAvatar color={p.color} initials={p.initials} sm />
                  <span>{p.name}</span>
                </button>
            )}
            </div>
          }
        </span>
        <span className="rm-tool-wrap">
          <button ref={emojiBtnRef} className={`rm-tool${emojiOpen ? ' is-on' : ''}`} title="Add emoji"
          onClick={openEmoji}>
            <RMI.smile />
          </button>
          {emojiOpen &&
          <div className="rm-pop emoji-pop" style={emojiPos}>
              <div className="rm-emoji-grid">
                {RM_EMOJIS.map((em) => <button key={em} className="rm-emoji-btn" onClick={() => insertEmoji(em)}>{em}</button>)}
              </div>
            </div>
          }
        </span>
        <button className="rm-tool" title="Attach file"><RMI.paperclip /></button>
        <button className={`rm-send-btn${canSend ? ' active' : ''}`} onClick={submit} disabled={!canSend}><RMI.send /></button>
      </div>
    </div>);

}

function RMComment({ comment }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replies, setReplies] = useState(comment.replies || []);
  const u = RM_TEAM[comment.authorId] || {};
  return (
    <div className="rm-comment">
      <div className="rm-comment-head">
        <RMAvatar uid={comment.authorId} sm />
        <span className="rm-comment-author">{u.name}</span>
        <span className="rm-comment-time">{comment.time}</span>
      </div>
      <p className="rm-comment-body">{renderMentions(comment.text)}</p>
      {replies.map((r, i) =>
      <div className="rm-reply-item" key={i}>
          <RMAvatar uid={r.authorId} sm />
          <div className="rm-reply-inner">
            <span className="rm-comment-author">{RM_TEAM[r.authorId]?.name || 'Sam Rivera'}</span>
            <span className="rm-comment-time">{r.time}</span>
            <p className="rm-comment-body">{renderMentions(r.text)}</p>
          </div>
        </div>
      )}
      {replyOpen ?
      <RMComposer compact placeholder="Reply to comment…" onSubmit={(t) => {
        setReplies((prev) => [...prev, { authorId: 'you', time: 'just now', text: t }]);
        setReplyOpen(false);
      }} /> :
      <button className="rm-reply-trigger" onClick={() => setReplyOpen(true)}>Reply to comment…</button>
      }
    </div>);

}

function RecommendationModal() {
  const [status, setStatus] = useState('Unresolved');
  const [comments, setComments] = useState([
  { id: 1, authorId: 'fl', time: 'Nov 15', text: 'This should be a quick one to solve.' }]
  );
  const [upvoters, setUpvoters] = useState(['fl', 'tc', 'tf', 'hp']);
  const [downvoters, setDownvoters] = useState(['mv']);
  const ME = 'you';
  const hasUp = upvoters.includes(ME);
  const hasDn = downvoters.includes(ME);

  const vote = (type) => {
    if (type === 'up') {
      setUpvoters((p) => p.includes(ME) ? p.filter((u) => u !== ME) : [...p, ME]);
      if (hasDn) setDownvoters((p) => p.filter((u) => u !== ME));
    } else {
      setDownvoters((p) => p.includes(ME) ? p.filter((u) => u !== ME) : [...p, ME]);
      if (hasUp) setUpvoters((p) => p.filter((u) => u !== ME));
    }
  };

  return (
    <div className="rm-root">
      <div className="rm-modal">
        <div className="rm-modal-hd">
          <h2 className="rm-modal-title">Recommendation Details</h2>
          <button className="rm-close-btn"><RMI.x /></button>
        </div>
        <div className="rm-modal-body">

          <div className="rm-left">
            <section className="rm-section">
              <h3 className="rm-section-h">Pain Point</h3>
              <p className="rm-body"><strong>No email recovery process is available</strong> for users who forget their email, leading to potential access issues and user frustration. Competing platforms appear equally deficient in this area, so implementing a robust recovery process early could provide strategic advantage.</p>
            </section>
            <section className="rm-section">
              <h3 className="rm-section-h">Recommendation</h3>
              <p className="rm-body"><strong>Implement an 'Email Recovery' process with a clear link or button,</strong> directing users to guidance on recovery options if they've forgotten their email. Benchmark against the absence of such processes noted in several competitor evaluations to provide a service that surpasses the current industry standard.</p>
            </section>
            <section className="rm-section rm-section-last">
              <div className="rm-comments-hd">
                <h3 className="rm-section-h">Comments</h3>
                <span className="rm-comments-meta">{comments.length === 0 ? 'No comments yet' : `${comments.length} comment${comments.length !== 1 ? 's' : ''}`}</span>
              </div>
              <p className="rm-comments-sub">Start a conversation about this recommendation</p>
              <div className="rm-comments-list">
                {comments.map((c) => <RMComment key={c.id} comment={c} />)}
              </div>
              <RMComposer placeholder="Write a comment…" onSubmit={(t) =>
              setComments((prev) => [...prev, { id: Date.now(), authorId: 'you', time: 'just now', text: t }])
              } />
            </section>
          </div>

          <aside className="rm-sidebar">
            <div className="rm-sb-block">
              <div className="rm-sb-label">Mark as</div>
              <div className="rm-select-wrap">
                <select className="rm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option>Unresolved</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                  <option>Won't Fix</option>
                </select>
                <span className="rm-select-ico"><RMI.chevDn /></span>
              </div>
            </div>
            <div className="rm-meta-rows">
              {[['ID', '#2345'], ['Category', 'Journey'], ['Severity', <span className="rm-badge high">High</span>], ['Date Detected', 'Nov 12 2025']].map(([k, v]) =>
              <div className="rm-meta-row" key={k}>
                  <span className="rm-meta-k">{k}</span>
                  <span className="rm-meta-v">{v}</span>
                </div>
              )}
            </div>
            {[
            { label: 'Upvotes', voters: upvoters, active: hasUp, type: 'up' },
            { label: 'Downvotes', voters: downvoters, active: hasDn, type: 'dn' }].
            map(({ label, voters, active, type }) =>
            <div className="rm-sb-block" key={type}>
                <div className="rm-sb-label">{label}</div>
                <div className="rm-vote-row">
                  <span className="rm-vote-n">{voters.length}</span>
                  <div className="rm-vote-avs">{voters.map((u) => <RMAvatar key={u} uid={u} sm />)}</div>
                  <button className={`rm-vote-btn${active ? ' active' : ''}${type === 'dn' ? ' dn' : ''}`} onClick={() => vote(type)}>
                    {type === 'up' ? <RMI.chevUp /> : <RMI.chevDn2 />}
                  </button>
                </div>
              </div>
            )}
            <button className="rm-gen-btn">Send to Jira <RMI.jira /></button>
          </aside>

        </div>
      </div>
    </div>);

}

window.RecommendationModal = RecommendationModal;