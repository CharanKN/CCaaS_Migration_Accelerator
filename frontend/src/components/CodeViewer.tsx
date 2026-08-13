import { useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-hcl';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-csv';
import 'prismjs/components/prism-yaml';
import './CodeViewer.css';

export type CodeLanguage = 'hcl' | 'json' | 'markup' | 'csv' | 'yaml' | 'text';

const EXTENSION_LANGUAGE: Record<string, CodeLanguage> = {
  tf: 'hcl',
  tfvars: 'hcl',
  hcl: 'hcl',
  json: 'json',
  xml: 'markup',
  vxml: 'markup',
  html: 'markup',
  csv: 'csv',
  yml: 'yaml',
  yaml: 'yaml',
};

export function languageForFilename(name: string): CodeLanguage {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_LANGUAGE[ext] ?? 'text';
}

interface CodeViewerProps {
  code: string;
  language: CodeLanguage;
  maxHeight?: number | string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightLine(line: string, language: CodeLanguage): string {
  if (!line.length) return '';
  const grammar = language === 'text' ? null : Prism.languages[language];
  return grammar ? Prism.highlight(line, grammar, language) : escapeHtml(line);
}

export function CodeViewer({ code, language, maxHeight = 480 }: CodeViewerProps) {
  const lines = useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
  const highlighted = useMemo(() => lines.map((line) => highlightLine(line, language)), [lines, language]);

  return (
    <pre className="code-viewer" style={{ maxHeight }}>
      <code className="code-viewer-lines">
        {highlighted.map((html, i) => (
          <span className="code-viewer-line" key={i}>
            <span className="code-viewer-line-number">{i + 1}</span>
            {/* eslint-disable-next-line react/no-danger */}
            <span className="code-viewer-line-content" dangerouslySetInnerHTML={{ __html: html }} />
          </span>
        ))}
      </code>
    </pre>
  );
}
