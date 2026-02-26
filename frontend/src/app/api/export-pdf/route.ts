import { NextResponse } from 'next/server';
import MarkdownIt from 'markdown-it';
// @ts-expect-error - @iktakahiro/markdown-it-katex lacks type definitions
import mk from '@iktakahiro/markdown-it-katex';
import React from 'react';
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.5, color: '#24292f', padding: 50 },
  h1: { fontSize: 20, fontWeight: 'bold', marginBottom: 6, marginTop: 16 },
  h2: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, marginTop: 13 },
  h3: { fontSize: 13, fontWeight: 'bold', marginBottom: 4, marginTop: 10 },
  h4: { fontSize: 11, fontWeight: 'bold', marginBottom: 3, marginTop: 8 },
  p: { marginBottom: 8 },
  code: { fontFamily: 'Courier', fontSize: 8.5, backgroundColor: '#f6f8fa', padding: 10, marginBottom: 10 },
  codeInline: { fontFamily: 'Courier', fontSize: 9 },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  listItem: { flexDirection: 'row', marginBottom: 3 },
  bullet: { width: 12 },
  listText: { flex: 1 },
  // Table
  table: { marginBottom: 12, marginTop: 4 },
  tableRow: { flexDirection: 'row' },
  tableHeaderCell: { flex: 1, backgroundColor: '#f6f8fa', paddingHorizontal: 8, paddingVertical: 5, fontWeight: 'bold', fontSize: 9, borderWidth: 0.5, borderColor: '#d0d7de' },
  tableCell: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, borderWidth: 0.5, borderColor: '#d0d7de' },
  hr: { borderBottomWidth: 0.5, borderBottomColor: '#d0d7de', marginVertical: 6 },
});

// ─── Parse markdown tokens into React-PDF elements ─────────────────────────
function parseInlineText(children: any[]): React.ReactNode {
  if (!children?.length) return '';
  return children.map((t, idx) => {
    if (t.type === 'text') return t.content;
    if (t.type === 'softbreak') return ' ';
    if (t.type === 'strong_open') return null; // handled by walker below
    if (t.type === 'em_open') return null;
    if (t.type === 'code_inline' || t.type === 'math_inline') {
      return React.createElement(Text, { key: idx, style: styles.codeInline }, t.content);
    }
    return t.content || null;
  });
}

function renderInline(children: any[]): React.ReactNode {
  if (!children?.length) return null;
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < children.length) {
    const t = children[i];
    if (t.type === 'text') { parts.push(t.content); }
    else if (t.type === 'softbreak' || t.type === 'hardbreak') { parts.push(' '); }
    else if (t.type === 'strong_open') {
      let txt = ''; i++;
      while (i < children.length && children[i].type !== 'strong_close') { txt += children[i].content; i++; }
      parts.push(React.createElement(Text, { key: i, style: styles.bold }, txt));
    } else if (t.type === 'em_open') {
      let txt = ''; i++;
      while (i < children.length && children[i].type !== 'em_close') { txt += children[i].content; i++; }
      parts.push(React.createElement(Text, { key: i, style: styles.italic }, txt));
    } else if (t.type === 'code_inline' || t.type === 'math_inline') {
      parts.push(React.createElement(Text, { key: i, style: styles.codeInline }, t.content));
    } else if (t.type === 'link_open') {
      let txt = ''; i++;
      while (i < children.length && children[i].type !== 'link_close') { txt += children[i].content; i++; }
      parts.push(txt);
    } else if (t.content) { parts.push(t.content); }
    i++;
  }
  return parts.length === 1 ? parts[0] : React.createElement(React.Fragment, {}, ...parts);
}

function tokensToElements(tokens: any[]): React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  let i = 0;
  const H_STYLES: Record<string, any> = { h1: styles.h1, h2: styles.h2, h3: styles.h3, h4: styles.h4 };

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok.type === 'heading_open') {
      const style = H_STYLES[tok.tag] ?? styles.h4;
      const content = renderInline(tokens[i + 1]?.children ?? []);
      elements.push(React.createElement(Text, { key: i, style }, content));
      i += 3; continue;
    }

    if (tok.type === 'paragraph_open') {
      const inline = tokens[i + 1];
      if (inline?.type === 'inline') {
        const content = renderInline(inline.children ?? []);
        elements.push(React.createElement(Text, { key: i, style: styles.p }, content));
        i += 3; continue;
      }
    }

    if (tok.type === 'fence' || tok.type === 'code_block') {
      elements.push(React.createElement(Text, { key: i, style: styles.code }, tok.content.replace(/\n$/, '')));
      i++; continue;
    }

    if (tok.type === 'math_block') {
      elements.push(React.createElement(Text, { key: i, style: styles.code }, tok.content.trim()));
      i++; continue;
    }

    if (tok.type === 'hr') {
      elements.push(React.createElement(View, { key: i, style: styles.hr }));
      i++; continue;
    }

    if (tok.type === 'bullet_list_open') {
      const items: React.ReactElement[] = [];
      i++;
      while (i < tokens.length && tokens[i].type !== 'bullet_list_close') {
        if (tokens[i].type === 'inline') {
          const content = renderInline(tokens[i].children ?? []);
          items.push(
            React.createElement(View, { key: i, style: styles.listItem },
              React.createElement(Text, { style: styles.bullet }, '• '),
              React.createElement(Text, { style: styles.listText }, content)
            )
          );
        }
        i++;
      }
      elements.push(React.createElement(View, { key: i, style: { marginBottom: 8 } }, ...items));
      i++; continue;
    }

    if (tok.type === 'ordered_list_open') {
      const items: React.ReactElement[] = [];
      let num = 1; i++;
      while (i < tokens.length && tokens[i].type !== 'ordered_list_close') {
        if (tokens[i].type === 'inline') {
          const content = renderInline(tokens[i].children ?? []);
          items.push(
            React.createElement(View, { key: i, style: styles.listItem },
              React.createElement(Text, { style: styles.bullet }, `${num++}. `),
              React.createElement(Text, { style: styles.listText }, content)
            )
          );
        }
        i++;
      }
      elements.push(React.createElement(View, { key: i, style: { marginBottom: 8 } }, ...items));
      i++; continue;
    }

    if (tok.type === 'table_open') {
      const headerCells: React.ReactElement[] = [];
      const bodyRows: React.ReactElement[][] = [];
      let inHead = false;
      let currentRow: React.ReactElement[] = [];
      let cellIdx = 0;
      i++;

      while (i < tokens.length && tokens[i].type !== 'table_close') {
        const t = tokens[i];
        if (t.type === 'thead_open') { inHead = true; }
        else if (t.type === 'tbody_open') { inHead = false; }
        else if (t.type === 'tr_open') { currentRow = []; }
        else if (t.type === 'tr_close') {
          if (inHead) headerCells.push(...currentRow);
          else bodyRows.push(currentRow);
        } else if (t.type === 'th_open' || t.type === 'td_open') {
          const inline = tokens[i + 1];
          const content = renderInline(inline?.children ?? []);
          const cellStyle = inHead ? styles.tableHeaderCell : styles.tableCell;
          currentRow.push(React.createElement(View, { key: cellIdx++, style: cellStyle },
            React.createElement(Text, {}, content)
          ));
          i += 2;
        }
        i++;
      }

      const tableEl = React.createElement(View, { key: i, style: styles.table },
        React.createElement(View, { style: styles.tableRow }, ...headerCells),
        ...bodyRows.map((row, ri) => React.createElement(View, { key: ri, style: styles.tableRow }, ...row))
      );
      elements.push(tableEl);
      i++; continue;
    }

    i++;
  }
  return elements;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { markdown, title = 'Chat Export' } = await req.json();

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json({ error: 'Valid markdown string is required' }, { status: 400 });
    }

    const md = new MarkdownIt({ html: false, breaks: true, linkify: true }).use(mk);
    const tokens = md.parse(markdown, {});
    const contentElements = tokensToElements(tokens);

    const doc = React.createElement(Document, { title },
      React.createElement(Page, { style: styles.page }, ...contentElements)
    );

    const pdfBuffer = await renderToBuffer(doc);
    const safeTitle = title.replace(/[^a-zA-Z0-9 \-_]/g, '').trim().substring(0, 80) || 'chat-export';

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF', details: String(error) }, { status: 500 });
  }
}
