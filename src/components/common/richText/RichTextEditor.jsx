import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  X,
} from 'lucide-react';

// Links typed without a scheme ("fixonest.com/blog") still need one to work.
const normalizeUrl = (value) => {
  const url = value.trim();
  if (!url) return '';
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url) ? url : `https://${url}`;
};

// What the toolbar needs to know about the selection. Read through
// useEditorState, so the toolbar re-renders only when one of these changes
// rather than on every keystroke.
const selectToolbarState = ({ editor }) => ({
  isParagraph: editor.isActive('paragraph'),
  isH2: editor.isActive('heading', { level: 2 }),
  isH3: editor.isActive('heading', { level: 3 }),
  isBold: editor.isActive('bold'),
  isItalic: editor.isActive('italic'),
  isUnderline: editor.isActive('underline'),
  isStrike: editor.isActive('strike'),
  isBulletList: editor.isActive('bulletList'),
  isOrderedList: editor.isActive('orderedList'),
  isBlockquote: editor.isActive('blockquote'),
  isLink: editor.isActive('link'),
  alignLeft: editor.isActive({ textAlign: 'left' }),
  alignCenter: editor.isActive({ textAlign: 'center' }),
  alignRight: editor.isActive({ textAlign: 'right' }),
  canUndo: editor.can().undo(),
  canRedo: editor.can().redo(),
  words: editor.storage.characterCount.words(),
  characters: editor.storage.characterCount.characters(),
});

// The panel's rich-text editor (Tiptap), in the same field style as
// .input-field: a formatting toolbar that stays in view while a long article
// scrolls, the writing area, and a word/character count.
//
// `value` is only the starting HTML - the editor owns the content afterwards
// and reports every change as HTML through `onChange`. Mount it once the
// content to edit has loaded. Headings start at H2: the page title is the H1.
// The content's look comes from the `.rich-text` rules in styles/index.css.
export default function RichTextEditor({
  value = '',
  onChange,
  onBlur,
  placeholder = 'Start writing…',
  invalid = false,
  disabled = false,
  labelledBy,
  footerNote,
}) {
  const [linkDraft, setLinkDraft] = useState(null); // null (closed) | the URL being typed
  const linkInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'rich-text min-h-72 px-4 py-4 sm:px-5 outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
      },
    },
    onUpdate: ({ editor: instance }) => onChange?.(instance.getHTML()),
    onBlur: () => onBlur?.(),
  });

  const state = useEditorState({ editor, selector: selectToolbarState });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // Focus the link bar when it opens (not on every character typed into it).
  const isLinkBarOpen = linkDraft !== null;
  useEffect(() => {
    if (isLinkBarOpen) linkInputRef.current?.focus();
  }, [isLinkBarOpen]);

  if (!editor || !state) return null;

  const run = (command) => () => command(editor.chain().focus()).run();

  const openLink = () => setLinkDraft(editor.getAttributes('link').href ?? '');
  const closeLink = () => {
    setLinkDraft(null);
    editor.commands.focus();
  };
  const applyLink = () => {
    const href = normalizeUrl(linkDraft ?? '');
    if (!href) {
      removeLink();
      return;
    }
    const chain = editor.chain().focus().extendMarkRange('link');
    // With nothing selected there is no text to turn into a link, so the
    // address itself is inserted as the link's text.
    if (editor.state.selection.empty && !state.isLink) {
      chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
    } else {
      chain.setLink({ href }).run();
    }
    setLinkDraft(null);
  };
  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkDraft(null);
  };

  const groups = [
    [
      { label: 'Undo', icon: Undo2, onClick: run((chain) => chain.undo()), disabled: !state.canUndo },
      { label: 'Redo', icon: Redo2, onClick: run((chain) => chain.redo()), disabled: !state.canRedo },
    ],
    [
      { label: 'Normal text', icon: Pilcrow, onClick: run((chain) => chain.setParagraph()), active: state.isParagraph },
      { label: 'Heading', icon: Heading2, onClick: run((chain) => chain.toggleHeading({ level: 2 })), active: state.isH2 },
      { label: 'Subheading', icon: Heading3, onClick: run((chain) => chain.toggleHeading({ level: 3 })), active: state.isH3 },
    ],
    [
      { label: 'Bold', icon: Bold, onClick: run((chain) => chain.toggleBold()), active: state.isBold },
      { label: 'Italic', icon: Italic, onClick: run((chain) => chain.toggleItalic()), active: state.isItalic },
      { label: 'Underline', icon: Underline, onClick: run((chain) => chain.toggleUnderline()), active: state.isUnderline },
      { label: 'Strikethrough', icon: Strikethrough, onClick: run((chain) => chain.toggleStrike()), active: state.isStrike },
    ],
    [
      { label: 'Bulleted list', icon: List, onClick: run((chain) => chain.toggleBulletList()), active: state.isBulletList },
      { label: 'Numbered list', icon: ListOrdered, onClick: run((chain) => chain.toggleOrderedList()), active: state.isOrderedList },
      { label: 'Quote', icon: Quote, onClick: run((chain) => chain.toggleBlockquote()), active: state.isBlockquote },
      { label: 'Divider', icon: Minus, onClick: run((chain) => chain.setHorizontalRule()) },
    ],
    [
      { label: 'Align left', icon: AlignLeft, onClick: run((chain) => chain.setTextAlign('left')), active: state.alignLeft },
      { label: 'Align center', icon: AlignCenter, onClick: run((chain) => chain.setTextAlign('center')), active: state.alignCenter },
      { label: 'Align right', icon: AlignRight, onClick: run((chain) => chain.setTextAlign('right')), active: state.alignRight },
    ],
    [
      { label: state.isLink ? 'Edit link' : 'Add link', icon: Link2, onClick: openLink, active: state.isLink || isLinkBarOpen },
      {
        label: 'Clear formatting',
        icon: RemoveFormatting,
        onClick: run((chain) => chain.unsetAllMarks().clearNodes()),
      },
    ],
  ];

  return (
    <div
      className={`rounded-xl border bg-white transition-all focus-within:ring-2 ${
        invalid
          ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-500/40'
          : 'border-gray-300 focus-within:border-teal-500 focus-within:ring-teal-500/50'
      } ${disabled ? 'opacity-70' : ''}`}
    >
      {/* Sticks just below the Topbar (h-16 / sm:h-20) while the article scrolls. */}
      <div className="sticky top-16 sm:top-20 z-10 rounded-t-xl border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm">
        <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-y-1 px-2 py-1.5">
          {groups.map((group, index) => (
            <div key={group[0].label} className="flex items-center">
              {index > 0 && <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />}
              {group.map((button) => (
                <ToolbarButton key={button.label} {...button} disabled={disabled || button.disabled} />
              ))}
            </div>
          ))}
        </div>

        {isLinkBarOpen && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-3 py-2">
            <Link2 size={15} className="shrink-0 text-slate-400" />
            <input
              ref={linkInputRef}
              type="url"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyLink();
                }
                if (event.key === 'Escape') {
                  // Don't let Escape reach anything listening above the editor.
                  event.stopPropagation();
                  closeLink();
                }
              }}
              placeholder="Paste or type a link"
              aria-label="Link address"
              className="min-w-0 flex-1 basis-40 bg-transparent py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={applyLink}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
              >
                <Check size={13} />
                Apply
              </button>
              {state.isLink && (
                <button
                  type="button"
                  onClick={removeLink}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Link2Off size={13} />
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={closeLink}
                aria-label="Close link editor"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-400">
        <span>{footerNote}</span>
        <span className="tabular-nums">
          {state.words} {state.words === 1 ? 'word' : 'words'} · {state.characters} characters
        </span>
      </div>
    </div>
  );
}

function ToolbarButton({ label, icon: Icon, onClick, active = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Keep the text selection: a mousedown on the button would otherwise blur the editor first.
      onMouseDown={(event) => event.preventDefault()}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800'
      }`}
    >
      <Icon size={16} />
    </button>
  );
}
