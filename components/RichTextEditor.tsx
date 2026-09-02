import React, { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Redo2, Underline, Undo2 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  id?: string;
}

const COMMANDS = [
  { command: 'bold', label: 'Negrito', icon: Bold },
  { command: 'italic', label: 'Itálico', icon: Italic },
  { command: 'underline', label: 'Sublinhado', icon: Underline },
  { command: 'insertUnorderedList', label: 'Lista com marcadores', icon: List },
  { command: 'insertOrderedList', label: 'Lista numerada', icon: ListOrdered },
] as const;

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite o texto...',
  minHeightClassName = 'min-h-36',
  id,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const runCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    onChange(editorRef.current?.innerHTML || '');
  };

  const toolbarButton = (command: string, label: string, Icon: React.ElementType) => (
    <button
      key={command}
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={event => event.preventDefault()}
      onClick={() => runCommand(command)}
      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-blue-700 hover:shadow-sm"
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="w-full flex-1 overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5" role="toolbar" aria-label="Formatação do texto">
        {COMMANDS.map(item => toolbarButton(item.command, item.label, item.icon))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {toolbarButton('undo', 'Desfazer', Undo2)}
        {toolbarButton('redo', 'Refazer', Redo2)}
      </div>
      <div
        ref={editorRef}
        id={id}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={event => onChange(event.currentTarget.innerHTML)}
        className={`${minHeightClassName} max-h-80 overflow-y-auto p-3 text-sm leading-relaxed text-slate-700 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500`}
      />
    </div>
  );
};

export default RichTextEditor;
