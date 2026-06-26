const historyEl = document.getElementById('history');
const currentEl = document.getElementById('current');
const keys = document.querySelector('.keys');
const themeToggle = document.getElementById('theme-toggle');

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);
  themeToggle.textContent = isLight ? '☀️' : '🌙';
}
 
function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem('calculator-theme');
  } catch (err) {
  }
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));
}
 
themeToggle.addEventListener('click', () => {
  const isLight = document.body.classList.contains('light-theme');
  const next = isLight ? 'dark' : 'light';
  applyTheme(next);
  try {
    localStorage.setItem('calculator-theme', next);
  } catch (err) {
  }
});
 
initTheme();

// ---------- State ----------
const state = {
  history: '',
  current: '0',
  justEvaluated: false
};

// ---------- Render ----------

function render() {
  currentEl.textContent = state.current;

  if (state.history) {
    historyEl.textContent = state.history;
    historyEl.classList.add('history--visible');
  } else {
    historyEl.textContent = '';
    historyEl.classList.remove('history--visible');
  }
}

// ---------- Helpers ----------

function toEvalString(expression) {
  return expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
}

function formatResult(num) {
  if (!isFinite(num)) return 'Error';
  const rounded = Math.round(num * 1e10) / 1e10;
  return rounded.toString();
}

function calculate(expression) {
  try {
    if (!/^(?:[0-9eE+\-*/.\s×÷()%]|sqrt)+$/.test(expression)) {
      throw new Error('Invalid expression');
    }
    const safeExpr = toEvalString(expression);
    const result = Function('"use strict"; return (' + safeExpr + ')')();
    return formatResult(result);
  } catch (err) {
    return 'Error';
  }
}

// ---------- Key handlers ----------

function handleNumber(num) {
  if (state.justEvaluated) {
    state.current = num === '.' ? '0.' : num;
    state.history = '';
    state.justEvaluated = false;
    render();
    return;
  }

  if (num === '.' && state.current.includes('.')) return;

  if (state.current.endsWith('%')) {
    state.history += state.current + ' × ';
    state.current = num === '.' ? '0.' : num;
    render();
    return;
  }

  state.current = state.current === '0' ? (num === '.' ? '0.' : num) : state.current + num;
  render();
}

function handleOperator(op) {
  if (op === '%') {
    if (!state.current || state.current === '') return;
    state.current += '%';
    render();
    return;
  }

  if (op === '√') {
    if (state.justEvaluated) {
      state.history = '';
      state.current = '0';
      state.justEvaluated = false;
    }
    if (state.current && state.current !== '0') {
      state.history += state.current + ' × ';
      state.current = '';
    }
    state.history += 'sqrt(';
    render();
    return;
  }

  if (op === '(') {
    if (state.justEvaluated) {
      state.history = '';
      state.current = '0';
      state.justEvaluated = false;
    }
    if (state.current && state.current !== '0') {
      state.history += state.current + ' × ';
      state.current = '';
    }
    state.history += '( ';
    render();
    return;
  }

  if (op === ')') {
    if (!state.history.includes('(')) return;
    if (state.current) {
      state.history += state.current + ' ';
      state.current = '';
    }
    state.history += ') ';
    render();
    return;
  }

  if (state.justEvaluated) {
    state.history = state.current + ' ' + op + ' ';
    state.current = '';
    state.justEvaluated = false;
    render();
    return;
  }

  if (state.current === '' && state.history === '') return;

  state.history = state.history + (state.current || '') + ' ' + op + ' ';
  state.current = '';
  render();
}

function handleEquals() {
  if (state.justEvaluated) return;

  let fullExpression = state.history + state.current;

  const openCount = (fullExpression.match(/\(/g) || []).length;
  const closeCount = (fullExpression.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    fullExpression += ' ' + ')'.repeat(openCount - closeCount);
  }

  const result = calculate(fullExpression);
  state.history = fullExpression;
  state.current = result;
  state.justEvaluated = true;
  render();
}

function handleClear() {
  state.history = '';
  state.current = '0';
  state.justEvaluated = false;
  render();
}

function handleDelete() {
  if (state.justEvaluated) {
    state.current = state.current.length > 1 ? state.current.slice(0, -1) : '0';
    state.history = '';
    state.justEvaluated = false;
    render();
    return;
  }
  state.current = state.current.length > 1 ? state.current.slice(0, -1) : '0';
  render();
}

// ---------- Event delegation ----------

keys.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;

  button.blur();

  const { number, operator, action } = button.dataset;

  if (number !== undefined) handleNumber(number);
  else if (operator !== undefined) handleOperator(operator);
  else if (action === 'equals') handleEquals();
  else if (action === 'clear') handleClear();
  else if (action === 'delete') handleDelete();
});

// ---------- Keyboard support (bonus) ----------

document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
  else if (e.key === '.') handleNumber('.');
  else if (e.key === '+') handleOperator('+');
  else if (e.key === '-') handleOperator('-');
  else if (e.key === '*') handleOperator('×');
  else if (e.key === '/') handleOperator('÷');
  else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault(); // stop a focused button from re-activating / any form submit
    handleEquals();
  }
  else if (e.key === 'Backspace') {
    e.preventDefault(); // with no text input focused, Backspace otherwise navigates back
    handleDelete();
  }
  else if (e.key === 'Escape') handleClear();
});

render();