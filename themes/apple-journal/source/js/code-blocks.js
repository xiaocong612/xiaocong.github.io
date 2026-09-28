(function () {
  const languageNames = {
    bash: 'Bash',
    c: 'C',
    cpp: 'C++',
    css: 'CSS',
    html: 'HTML',
    javascript: 'JavaScript',
    js: 'JavaScript',
    json: 'JSON',
    markdown: 'Markdown',
    md: 'Markdown',
    python: 'Python',
    py: 'Python',
    shell: 'Shell',
    sql: 'SQL',
    typescript: 'TypeScript',
    ts: 'TypeScript',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML'
  };

  const prettyLanguage = language => languageNames[language] || (language ? language.toUpperCase() : '纯文本');

  const copyText = async text => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand && document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('clipboard unavailable');
  };

  const highlightCode = (source, language) => {
    const highlighter = window.hljs;
    if (!highlighter || typeof highlighter.highlight !== 'function') return null;
    if (typeof highlighter.getLanguage === 'function' && !highlighter.getLanguage(language)) return null;
    try {
      return highlighter.highlight(source, { language, ignoreIllegals: true }).value;
    } catch (_) {
      return null;
    }
  };

  const autoHighlightCode = source => {
    const highlighter = window.hljs;
    if (!highlighter || typeof highlighter.highlightAuto !== 'function') return null;
    try {
      const result = highlighter.highlightAuto(source);
      return result && result.language ? result : null;
    } catch (_) {
      return null;
    }
  };

  const enhance = pre => {
    const sourceCode = pre.querySelector(':scope > code');
    if (!sourceCode || pre.parentElement && pre.parentElement.classList.contains('code-frame')) return;

    const source = sourceCode.textContent || '';
    const languageClass = Array.from(sourceCode.classList).find(name => name.indexOf('language-') === 0);
    let language = languageClass ? languageClass.slice('language-'.length).toLowerCase() : '';
    let highlighted = language ? highlightCode(source, language) : null;
    if (!language) {
      const detected = autoHighlightCode(source);
      language = detected ? detected.language.toLowerCase() : 'plaintext';
      highlighted = detected ? detected.value : null;
    }

    const frame = document.createElement('div');
    frame.className = 'code-frame';
    frame.dataset.language = language;

    const toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';
    const languageLabel = document.createElement('span');
    languageLabel.className = 'code-language';
    languageLabel.textContent = prettyLanguage(language);
    const toolbarActions = document.createElement('div');
    toolbarActions.className = 'code-toolbar-actions';

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'code-action';
    copyButton.dataset.copyCode = '';
    copyButton.textContent = '复制';
    copyButton.addEventListener('click', async () => {
      const original = copyButton.textContent;
      try {
        await copyText(source);
        copyButton.textContent = '已复制';
        window.setTimeout(() => { copyButton.textContent = original; }, 1600);
      } catch (_) {
        copyButton.textContent = '复制失败，请手动选择';
      }
    });

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'code-action';
    toggleButton.dataset.toggleCode = '';
    toggleButton.setAttribute('aria-expanded', 'true');
    toggleButton.textContent = '折叠';

    const content = document.createElement('div');
    content.className = 'code-content';
    const codeShell = document.createElement('div');
    codeShell.className = 'code-scroll';
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'code-line-numbers';
    const lineCount = Math.max(1, source.split('\n').length);
    for (let index = 1; index <= lineCount; index += 1) {
      const lineNumber = document.createElement('span');
      lineNumber.className = 'code-line-number';
      lineNumber.textContent = String(index);
      lineNumbers.appendChild(lineNumber);
    }

    const code = document.createElement('code');
    code.className = sourceCode.className;
    if (highlighted) code.innerHTML = highlighted;
    else code.textContent = source;
    const nextPre = document.createElement('pre');
    nextPre.appendChild(code);
    codeShell.append(lineNumbers, nextPre);
    content.appendChild(codeShell);
    toggleButton.addEventListener('click', () => {
      content.hidden = !content.hidden;
      const expanded = !content.hidden;
      toggleButton.setAttribute('aria-expanded', String(expanded));
      toggleButton.textContent = expanded ? '折叠' : '展开';
    });

    toolbarActions.append(copyButton, toggleButton);
    toolbar.append(languageLabel, toolbarActions);
    frame.append(toolbar, content);
    pre.replaceWith(frame);
  };

  document.querySelectorAll('.prose pre').forEach(enhance);
}());
