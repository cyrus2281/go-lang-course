/* Lightweight syntax highlighter - Go, Bash, JSON.
   Not actually Prism.js, but produces the same `.token.<kind>` class names so
   our prism.css theme applies. Kept minimal on purpose: no regex backtracking
   pitfalls, no large vendored payloads, fully offline. */
(function () {
  'use strict';

  const escapeHTML = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---- Go grammar ---------------------------------------------------------
  const goKeywords = new Set([
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer',
    'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import',
    'interface', 'map', 'package', 'range', 'return', 'select', 'struct',
    'switch', 'type', 'var'
  ]);
  const goBuiltinFns = new Set([
    'append', 'cap', 'close', 'complex', 'copy', 'delete', 'imag', 'len',
    'make', 'new', 'panic', 'print', 'println', 'real', 'recover', 'clear',
    'min', 'max'
  ]);
  const goTypes = new Set([
    'bool', 'byte', 'rune', 'string', 'error', 'any',
    'int', 'int8', 'int16', 'int32', 'int64',
    'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr',
    'float32', 'float64', 'complex64', 'complex128'
  ]);
  const goConstants = new Set(['true', 'false', 'nil', 'iota']);

  function tokenizeGo(src) {
    const out = [];
    let i = 0;
    const n = src.length;
    const push = (kind, text) => out.push({ kind, text });

    while (i < n) {
      const c = src[i];

      // Line comment
      if (c === '/' && src[i + 1] === '/') {
        let j = src.indexOf('\n', i);
        if (j === -1) j = n;
        push('comment', src.slice(i, j));
        i = j;
        continue;
      }
      // Block comment
      if (c === '/' && src[i + 1] === '*') {
        let j = src.indexOf('*/', i + 2);
        j = j === -1 ? n : j + 2;
        push('comment', src.slice(i, j));
        i = j;
        continue;
      }
      // Raw string
      if (c === '`') {
        let j = src.indexOf('`', i + 1);
        j = j === -1 ? n : j + 1;
        push('string', src.slice(i, j));
        i = j;
        continue;
      }
      // Interpreted string
      if (c === '"') {
        let j = i + 1;
        while (j < n && src[j] !== '"') {
          if (src[j] === '\\' && j + 1 < n) j += 2;
          else if (src[j] === '\n') break;
          else j++;
        }
        if (j < n) j++; // consume closing quote
        push('string', src.slice(i, j));
        i = j;
        continue;
      }
      // Rune literal
      if (c === "'") {
        let j = i + 1;
        while (j < n && src[j] !== "'") {
          if (src[j] === '\\' && j + 1 < n) j += 2;
          else j++;
        }
        if (j < n) j++;
        push('string', src.slice(i, j));
        i = j;
        continue;
      }
      // Whitespace
      if (/\s/.test(c)) {
        let j = i + 1;
        while (j < n && /\s/.test(src[j])) j++;
        push('plain', src.slice(i, j));
        i = j;
        continue;
      }
      // Number
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        let j = i;
        if (c === '0' && (src[j + 1] === 'x' || src[j + 1] === 'X')) {
          j += 2;
          while (j < n && /[0-9a-fA-F_]/.test(src[j])) j++;
        } else if (c === '0' && (src[j + 1] === 'b' || src[j + 1] === 'B')) {
          j += 2;
          while (j < n && /[01_]/.test(src[j])) j++;
        } else if (c === '0' && (src[j + 1] === 'o' || src[j + 1] === 'O')) {
          j += 2;
          while (j < n && /[0-7_]/.test(src[j])) j++;
        } else {
          while (j < n && /[0-9_]/.test(src[j])) j++;
          if (src[j] === '.') {
            j++;
            while (j < n && /[0-9_]/.test(src[j])) j++;
          }
          if (src[j] === 'e' || src[j] === 'E') {
            j++;
            if (src[j] === '+' || src[j] === '-') j++;
            while (j < n && /[0-9_]/.test(src[j])) j++;
          }
        }
        if (src[j] === 'i') j++; // complex
        push('number', src.slice(i, j));
        i = j;
        continue;
      }
      // Identifier / keyword / type
      if (/[A-Za-z_]/.test(c)) {
        let j = i + 1;
        while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
        const word = src.slice(i, j);
        let kind;
        if (goKeywords.has(word))        kind = 'keyword';
        else if (goConstants.has(word))  kind = 'boolean';
        else if (goTypes.has(word))      kind = 'builtin';
        else if (goBuiltinFns.has(word) && src[j] === '(') kind = 'builtin';
        else if (src[j] === '(')         kind = 'function';
        else                             kind = 'plain';
        push(kind, word);
        i = j;
        continue;
      }
      // Punctuation / operator
      if (/[+\-*/%<>=!&|^~]/.test(c)) {
        // Multi-char operators
        let j = i + 1;
        while (j < n && /[+\-*/%<>=!&|^~]/.test(src[j]) && j - i < 3) j++;
        push('operator', src.slice(i, j));
        i = j;
        continue;
      }
      if (/[{}()\[\];,.:]/.test(c)) {
        push('punctuation', c);
        i++;
        continue;
      }
      // Fallback
      push('plain', c);
      i++;
    }
    return out;
  }

  // ---- Bash grammar (simple) ---------------------------------------------
  const bashKeywords = new Set([
    'if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'while',
    'do', 'done', 'in', 'select', 'until', 'function', 'return', 'break',
    'continue', 'exit', 'export', 'local', 'readonly', 'declare', 'unset',
    'shift', 'source'
  ]);
  const bashBuiltins = new Set([
    'echo', 'cd', 'pwd', 'ls', 'cat', 'grep', 'awk', 'sed', 'cp', 'mv', 'rm',
    'mkdir', 'touch', 'chmod', 'chown', 'find', 'test', 'true', 'false',
    'read', 'printf', 'tar', 'curl', 'wget', 'git', 'go', 'npm', 'yarn',
    'docker', 'kubectl', 'bash', 'sh', 'zsh', 'which', 'history', 'alias',
    'sudo', 'apt', 'apt-get', 'brew', 'yum', 'env', 'set'
  ]);
  function tokenizeBash(src) {
    const out = [];
    let i = 0, n = src.length;
    const push = (kind, text) => out.push({ kind, text });
    while (i < n) {
      const c = src[i];
      if (c === '#') {
        let j = src.indexOf('\n', i);
        if (j === -1) j = n;
        push('comment', src.slice(i, j));
        i = j; continue;
      }
      if (c === "'") {
        let j = src.indexOf("'", i + 1);
        j = j === -1 ? n : j + 1;
        push('string', src.slice(i, j));
        i = j; continue;
      }
      if (c === '"') {
        let j = i + 1;
        while (j < n && src[j] !== '"') {
          if (src[j] === '\\' && j + 1 < n) j += 2;
          else j++;
        }
        if (j < n) j++;
        push('string', src.slice(i, j));
        i = j; continue;
      }
      if (c === '$') {
        let j = i + 1;
        if (src[j] === '{') {
          j = src.indexOf('}', j);
          j = j === -1 ? n : j + 1;
        } else if (src[j] === '(') {
          // Skip $(…) as-is (simple heuristic)
          let depth = 1; j++;
          while (j < n && depth > 0) {
            if (src[j] === '(') depth++;
            else if (src[j] === ')') depth--;
            j++;
          }
        } else {
          while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
        }
        push('variable', src.slice(i, j));
        i = j; continue;
      }
      if (/\s/.test(c)) {
        let j = i + 1;
        while (j < n && /\s/.test(src[j])) j++;
        push('plain', src.slice(i, j));
        i = j; continue;
      }
      if (/[A-Za-z_\-./]/.test(c)) {
        let j = i + 1;
        while (j < n && /[A-Za-z0-9_\-./]/.test(src[j])) j++;
        const word = src.slice(i, j);
        let kind = 'plain';
        if (bashKeywords.has(word)) kind = 'keyword';
        else if (bashBuiltins.has(word)) kind = 'builtin';
        push(kind, word);
        i = j; continue;
      }
      if (/[0-9]/.test(c)) {
        let j = i + 1;
        while (j < n && /[0-9.]/.test(src[j])) j++;
        push('number', src.slice(i, j));
        i = j; continue;
      }
      if (/[=|&;<>()]/.test(c)) {
        push('operator', c);
        i++; continue;
      }
      push('plain', c);
      i++;
    }
    return out;
  }

  // ---- JSON grammar ------------------------------------------------------
  function tokenizeJSON(src) {
    const out = [];
    let i = 0, n = src.length;
    const push = (kind, text) => out.push({ kind, text });
    while (i < n) {
      const c = src[i];
      if (/\s/.test(c)) {
        let j = i + 1;
        while (j < n && /\s/.test(src[j])) j++;
        push('plain', src.slice(i, j));
        i = j; continue;
      }
      if (c === '"') {
        let j = i + 1;
        while (j < n && src[j] !== '"') {
          if (src[j] === '\\' && j + 1 < n) j += 2;
          else j++;
        }
        if (j < n) j++;
        // property key if followed by ':' after optional whitespace
        let k = j;
        while (k < n && /\s/.test(src[k])) k++;
        const kind = src[k] === ':' ? 'property' : 'string';
        push(kind, src.slice(i, j));
        i = j; continue;
      }
      if (/[0-9\-]/.test(c)) {
        let j = i + 1;
        while (j < n && /[0-9eE+\-.]/.test(src[j])) j++;
        push('number', src.slice(i, j));
        i = j; continue;
      }
      if (/[a-z]/.test(c)) {
        let j = i + 1;
        while (j < n && /[a-z]/.test(src[j])) j++;
        const word = src.slice(i, j);
        if (word === 'true' || word === 'false') push('boolean', word);
        else if (word === 'null') push('boolean', word);
        else push('plain', word);
        i = j; continue;
      }
      if (/[{}\[\],:]/.test(c)) {
        push('punctuation', c);
        i++; continue;
      }
      push('plain', c);
      i++;
    }
    return out;
  }

  // ---- Render tokens to HTML ---------------------------------------------
  function render(tokens) {
    return tokens.map(t => {
      const text = escapeHTML(t.text);
      if (t.kind === 'plain') return text;
      return `<span class="token ${t.kind}">${text}</span>`;
    }).join('');
  }

  function highlight(code, language) {
    let tokens;
    switch (language) {
      case 'go':    tokens = tokenizeGo(code); break;
      case 'bash':
      case 'shell':
      case 'sh':    tokens = tokenizeBash(code); break;
      case 'json':  tokens = tokenizeJSON(code); break;
      default:      return escapeHTML(code);
    }
    return render(tokens);
  }

  function highlightAll(root) {
    (root || document).querySelectorAll('pre code[class*="language-"]').forEach((el) => {
      if (el.dataset.highlighted === 'true') return;
      const match = el.className.match(/language-(\w+)/);
      if (!match) return;
      const lang = match[1];
      const code = el.textContent;
      el.innerHTML = highlight(code, lang);
      el.dataset.highlighted = 'true';
    });
  }

  window.Prism = {
    highlight,
    highlightAll,
    highlightAllUnder: highlightAll,
    languages: { go: {}, bash: {}, shell: {}, sh: {}, json: {} }
  };

  if (document.readyState !== 'loading') {
    highlightAll();
  } else {
    document.addEventListener('DOMContentLoaded', () => highlightAll());
  }
})();
