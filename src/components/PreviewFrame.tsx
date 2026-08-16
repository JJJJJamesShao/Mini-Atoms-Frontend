import { useMemo } from 'react';
import type { VersionFile } from '@/types/api';

/**
 * 把 files 数组合并成单个 HTML：
 * - 有 .html 文件时以第一个 html 为主体，其余 .css 内联为 <style>、.js 内联为 <script>
 * - 没有 html 文件时拼一个简单骨架包裹所有内容
 */
export function filesToHtml(files: VersionFile[]): string {
  const htmlFile = files.find((f) => f.path.endsWith('.html'));
  const cssFiles = files.filter((f) => f.path.endsWith('.css'));
  const jsFiles = files.filter((f) => f.path.endsWith('.js'));

  const inlineCss = cssFiles.map((f) => `<style>\n${f.content}\n</style>`).join('\n');
  const inlineJs = jsFiles.map((f) => `<script>\n${f.content}\n</script>`).join('\n');

  if (htmlFile) {
    let html = htmlFile.content;
    const injections = `${inlineCss}\n${inlineJs}`;
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${injections}\n</body>`);
    } else {
      html += injections;
    }
    return html;
  }

  const others = files
    .filter((f) => !f.path.endsWith('.css') && !f.path.endsWith('.js'))
    .map((f) => f.content)
    .join('\n');

  return `<!doctype html>
<html>
<head><meta charset="utf-8" />${inlineCss}</head>
<body>
${others}
${inlineJs}
</body>
</html>`;
}

export default function PreviewFrame({ files }: { files: VersionFile[] }) {
  const srcDoc = useMemo(() => filesToHtml(files), [files]);

  if (files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        生成完成后，这里会显示页面预览
      </div>
    );
  }

  return (
    <iframe
      title="预览"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      className="h-full w-full rounded-md border border-border bg-white"
    />
  );
}
