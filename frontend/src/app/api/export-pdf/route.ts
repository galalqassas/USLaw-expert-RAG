import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import MarkdownIt from 'markdown-it';
// @ts-expect-error - @iktakahiro/markdown-it-katex lacks type definitions
import mk from '@iktakahiro/markdown-it-katex';

export async function POST(req: Request) {
  try {
    const { markdown } = await req.json();

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json({ error: 'Valid markdown string is required' }, { status: 400 });
    }

    // Convert markdown to HTML with KaTeX support
    const md = new MarkdownIt({
      html: true,
      breaks: true,
      linkify: true,
    }).use(mk);

    const htmlContent = md.render(markdown);

    // Build the robust HTML document specifically styled for PDF printing
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Exported PDF</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <style>
        body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
        }
        
        .markdown-body {
            font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
            font-size: 14px; /* slightly smaller for print */
            line-height: 1.6;
            word-wrap: break-word;
        }

        /* Essential print layout rules */
        @media print {
            .markdown-body { padding: 0; }
            /* Prevent breaking rows/blocks across pages */
            table, tbody { page-break-inside: auto !important; page-break-after: auto !important; }
            tr, td, th, thead, tfoot { page-break-inside: avoid !important; }
            pre, code { page-break-inside: avoid !important; white-space: pre-wrap !important; }
            h1, h2, h3 { page-break-after: avoid !important; }
            img { max-width: 100% !important; page-break-inside: avoid !important; }
        }
        
        /* Table fixes */
        .markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
        .markdown-body table th, .markdown-body table td {
            border: 1px solid #d0d7de !important;
            padding: 6px 13px !important;
        }
        .markdown-body pre { background-color: #f6f8fa !important; border-radius: 6px; padding: 16px; }
    </style>
</head>
<body class="markdown-body">
    ${htmlContent}
</body>
</html>`;

    // Launch Puppeteer headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set HTML content and wait for network/fonts to load
    await page.setContent(fullHtml, { waitUntil: ['load', 'networkidle0'] });
    await page.emulateMediaType('print');

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // required for the code block backgrounds
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();

    // Return the PDF to the client
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="chat-export.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: String(error) },
      { status: 500 }
    );
  }
}
