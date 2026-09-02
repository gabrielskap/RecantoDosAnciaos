import React from 'react';
import { sanitizeRichText } from '../lib/richText';

interface RichTextContentProps {
  value?: string;
  className?: string;
}

const RichTextContent: React.FC<RichTextContentProps> = ({ value = '', className = '' }) => (
  <div
    className={`whitespace-pre-wrap break-words [&_p]:my-1 [&_div]:my-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 ${className}`}
    dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
  />
);

export default RichTextContent;
