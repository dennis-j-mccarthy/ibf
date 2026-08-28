'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal rich-text editor for knowledge-base answers. Hand-rolled on
// contentEditable rather than pulling in a framework: the formatting we need is
// bold/italic/lists/links, and the output has to be the same plain HTML the
// website already renders for FAQ answers.
//
// execCommand is formally deprecated but is still the only API every browser
// implements for this, and it gives us undo/redo and selection handling free.

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const BTN =
  'px-2.5 py-1 rounded text-sm font-semibold text-[#02176f] hover:bg-[#e8eefc] transition-colors';

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);

  // Only write into the DOM when the incoming value differs from what the user
  // is looking at — assigning innerHTML on every render would reset the caret
  // to the start on each keystroke.
  useEffect(() => {
    const el = ref.current;
    if (el && !showSource && el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value, showSource]);

  const exec = useCallback(
    (command: string, arg?: string) => {
      ref.current?.focus();
      document.execCommand(command, false, arg);
      if (ref.current) onChange(ref.current.innerHTML);
    },
    [onChange]
  );

  const addLink = useCallback(() => {
    const url = window.prompt('Link URL (https://…)');
    if (!url) return;
    exec('createLink', url.trim());
  }, [exec]);

  return (
    <div className="rounded-md border border-[#dddddd] overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#eef0f5] bg-[#fafbfc] px-2 py-1.5">
        <button type="button" onClick={() => exec('bold')} className={`${BTN} font-bold`} title="Bold">B</button>
        <button type="button" onClick={() => exec('italic')} className={`${BTN} italic`} title="Italic">I</button>
        <span className="w-px h-5 bg-[#e2e5ec] mx-1" />
        <button type="button" onClick={() => exec('insertUnorderedList')} className={BTN} title="Bulleted list">• List</button>
        <button type="button" onClick={() => exec('insertOrderedList')} className={BTN} title="Numbered list">1. List</button>
        <span className="w-px h-5 bg-[#e2e5ec] mx-1" />
        <button type="button" onClick={addLink} className={BTN} title="Add link">Link</button>
        <button type="button" onClick={() => exec('unlink')} className={BTN} title="Remove link">Unlink</button>
        <button type="button" onClick={() => exec('removeFormat')} className={BTN} title="Clear formatting">Clear</button>
        <button
          type="button"
          onClick={() => setShowSource((s) => !s)}
          className={`${BTN} ml-auto text-[#7e828f]`}
          title="Edit the underlying HTML"
        >
          {showSource ? 'Rich text' : 'HTML'}
        </button>
      </div>

      {showSource ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          spellCheck={false}
          className="w-full px-3 py-2 font-mono text-xs leading-relaxed outline-none resize-y"
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          data-placeholder={placeholder ?? 'Write the answer…'}
          className="min-h-[180px] px-3 py-2 outline-none prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
        />
      )}
    </div>
  );
}
