/**
 * Vercel Serverless Function Handler
 *
 * Wraps the SearchEngine for deployment on Vercel's serverless platform.
 * Instead of creating a long-running HTTP server, this exports a handler
 * that Vercel invokes per-request.
 */

import { SearchEngine } from '../src/index';
import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

// Singleton engine instance (persists across warm invocations in Vercel)
let engine: SearchEngine | null = null;

function getEngine(): SearchEngine {
  if (!engine) {
    console.log('[Vercel] Initializing SearchEngine...');
    engine = new SearchEngine();
    console.log('[Vercel] SearchEngine initialized.');
  }
  return engine;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const startTime = Date.now();
  const engine = getEngine();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = parsedUrl.pathname;
  const params = new URLSearchParams(parsedUrl.search);

  try {
    switch (path) {
      case '/search': {
        const query = params.get('q');
        if (!query || query.trim().length === 0) {
          sendJSON(res, 400, { error: 'Query parameter "q" is required' });
          return;
        }
        const page = parseInt(params.get('page') || '1', 10);
        const pageSize = Math.min(parseInt(params.get('size') || '10', 10), 50);
        const result = await engine.search(query, page, pageSize);
        sendJSON(res, 200, result);
        break;
      }

      case '/autocomplete': {
        const prefix = params.get('q') || '';
        const suggestions = prefix.length >= 2 ? engine.getAutocomplete(prefix) : [];
        sendJSON(res, 200, { suggestions });
        break;
      }

      case '/suggest': {
        const query = params.get('q') || '';
        const suggestions = query ? engine.getSuggestions(query) : [];
        sendJSON(res, 200, { suggestions });
        break;
      }

      case '/health': {
        const uptime = Date.now() - startTime;
        sendJSON(res, 200, {
          status: 'healthy',
          uptime,
          memoryUsageMB: process.memoryUsage().heapUsed / (1024 * 1024),
          indexSizeBytes: engine.getIndexSizeBytes()
        });
        break;
      }

      case '/stats': {
        const stats = {
          index: engine.getIndexStats(),
          uptime: Date.now() - startTime
        };
        sendJSON(res, 200, stats);
        break;
      }

      default: {
        // Serve the search UI with Cache-Control for landing page
        const html = getSearchPageHTML();
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600'
        });
        res.end(html);
      }
    }
  } catch (error: any) {
    console.error('[Vercel] Handler error:', error.message, error.stack);
    sendJSON(res, 500, { error: 'Internal server error' });
  }
}

function sendJSON(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function getSearchPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Search Engine — AI-Powered Semantic Search</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a12; color: #e4e4e7; line-height: 1.6; overflow-x: hidden; min-height: 100vh; }
    .bg-glow { position: fixed; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(ellipse at 25% 15%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 75% 85%, rgba(139,92,246,0.05) 0%, transparent 50%); pointer-events: none; z-index: 0; }
    .grid-bg { position: fixed; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; z-index: 0; }
    .container { max-width: 820px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }

    /* Navbar */
    nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .logo { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; }
    .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: white; }
    .logo-text { background: linear-gradient(135deg, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: #a1a1aa; text-decoration: none; font-size: 13px; transition: color .2s; position: relative; }
    .nav-links a:hover { color: #fff; }
    .nav-links a::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px; background: #3b82f6; transition: width .2s; border-radius: 1px; }
    .nav-links a:hover::after { width: 100%; }

    /* Hero */
    .hero { text-align: center; padding: 60px 0 40px; transition: all 0.4s ease; }
    .hero.compact { padding: 24px 0 20px; }
    .hero h1 { font-size: 48px; font-weight: 800; background: linear-gradient(135deg, #60a5fa, #a78bfa, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 12px; transition: font-size 0.3s; }
    .hero.compact h1 { font-size: 28px; }
    .hero p { color: #71717a; font-size: 16px; max-width: 560px; margin: 0 auto; transition: all 0.3s; }
    .hero.compact p { font-size: 0; opacity: 0; margin: 0; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); border-radius: 20px; font-size: 11px; color: #60a5fa; margin-bottom: 20px; letter-spacing: 0.5px; }

    /* Search */
    .search-section { max-width: 680px; margin: 0 auto; position: relative; }
    .search-wrapper { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 18px; color: #52525b; font-size: 18px; pointer-events: none; z-index: 2; transition: color 0.3s; }
    .search-wrapper.focused .search-icon { color: #60a5fa; }
    .search-input { width: 100%; padding: 16px 20px 16px 52px; font-size: 16px; font-family: 'Inter', sans-serif; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; outline: none; color: #e4e4e7; transition: all 0.3s; }
    .search-input::placeholder { color: #52525b; }
    .search-input:focus, .search-wrapper.focused .search-input { border-color: rgba(59,130,246,0.4); background: rgba(255,255,255,0.06); box-shadow: 0 0 0 4px rgba(59,130,246,0.1), 0 8px 32px rgba(0,0,0,0.2); }
    .search-clear { position: absolute; right: 16px; background: none; border: none; color: #52525b; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 50%; display: none; transition: all 0.2s; line-height: 1; }
    .search-clear:hover { background: rgba(255,255,255,0.1); color: #e4e4e7; }
    .search-clear.visible { display: flex; }

    /* Autocomplete */
    .autocomplete { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #181825; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,0.4); display: none; z-index: 20; overflow: hidden; backdrop-filter: blur(20px); }
    .autocomplete.visible { display: block; }
    .ac-item { padding: 12px 20px; cursor: pointer; font-size: 14px; color: #a1a1aa; transition: all 0.15s; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .ac-item:last-child { border-bottom: none; }
    .ac-item:hover, .ac-item.selected { background: rgba(59,130,246,0.08); color: #e4e4e7; }
    .ac-icon { font-size: 14px; opacity: 0.5; }

    /* Stats bar */
    .stats-bar { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 14px 20px; margin-top: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 10px; opacity: 0; transition: all 0.4s; transform: translateY(-10px); }
    .stats-bar.visible { opacity: 1; transform: translateY(0); }
    .stat-text { font-size: 13px; color: #71717a; }
    .stat-text strong { color: #a1a1aa; font-weight: 500; }
    .stat-dot { width: 4px; height: 4px; background: #52525b; border-radius: 50%; }

    /* Results */
    .results { margin-top: 8px; }
    .result { padding: 20px 0; border-bottom: 1px solid rgba(255,255,255,0.04); animation: slideUp 0.35s ease both; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .result-url { font-size: 12px; color: #34d399; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .result-url .domain-badge { padding: 1px 8px; background: rgba(52,211,153,0.1); border-radius: 4px; font-size: 10px; }
    .result-title { font-size: 18px; font-weight: 500; margin-bottom: 4px; }
    .result-title a { color: #60a5fa; text-decoration: none; transition: color 0.2s; }
    .result-title a:hover { color: #93c5fd; text-decoration: underline; }
    .result-snippet { font-size: 14px; color: #a1a1aa; line-height: 1.6; }
    .result-snippet em { color: #fbbf24; font-style: normal; }
    .result-meta { font-size: 12px; color: #52525b; margin-top: 6px; display: flex; gap: 16px; }
    .result-meta span { display: flex; align-items: center; gap: 4px; }
    .result-rank { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 11px; color: #52525b; font-weight: 500; }

    /* Pagination */
    .pagination { display: flex; justify-content: center; align-items: center; gap: 6px; margin: 40px 0; }
    .page-btn { width: 36px; height: 36px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); color: #a1a1aa; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
    .page-btn:hover:not(:disabled):not(.active) { background: rgba(255,255,255,0.06); color: #e4e4e7; border-color: rgba(255,255,255,0.1); }
    .page-btn.active { background: linear-gradient(135deg, #3b82f6, #6366f1); border-color: transparent; color: white; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
    .page-btn:disabled { opacity: 0.2; cursor: not-allowed; }
    .page-btn.nav { font-size: 16px; }

    /* Loading & States */
    .loading { text-align: center; padding: 60px 20px; }
    .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.06); border-top-color: #60a5fa; border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .state-message { text-align: center; padding: 60px 20px; }
    .state-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.5; }
    .state-title { font-size: 16px; font-weight: 600; color: #e4e4e7; margin-bottom: 6px; }
    .state-desc { font-size: 14px; color: #71717a; }
    .error-state .state-title { color: #f87171; }

    /* Footer */
    .footer { text-align: center; padding: 40px 0 24px; border-top: 1px solid rgba(255,255,255,0.04); margin-top: 40px; }
    .footer-tech { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .tech-tag { padding: 4px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; font-size: 11px; color: #52525b; }
    .footer-copy { font-size: 12px; color: #52525b; }

    /* Responsive */
    @media (max-width: 768px) {
      .hero h1 { font-size: 32px; }
      .hero.compact h1 { font-size: 22px; }
      .nav-links { display: none; }
      .search-input { padding: 14px 16px 14px 46px; font-size: 15px; }
      .result-title { font-size: 16px; }
    }
  </style>
</head>
<body>
  <div class="bg-glow"></div>
  <div class="grid-bg"></div>
  <div class="container">
    <nav>
      <div class="logo">
        <div class="logo-icon">&#8981;</div>
        <span class="logo-text">Search Engine</span>
      </div>
      <div class="nav-links">
        <a href="#" onclick="event.preventDefault(); resetSearch()">Home</a>
        <a href="/health">Health</a>
        <a href="https://github.com/Dhruv19duv/search-engine" target="_blank">GitHub</a>
      </div>
    </nav>

    <div class="hero" id="hero">
      <div class="badge">&#9889; AI-Powered &bull; BM25 &bull; LTR &bull; DPR</div>
      <h1>Search Engine</h1>
      <p>Full-text semantic search with ML ranking, spell correction, and neural retrieval</p>
    </div>

    <div class="search-section">
      <div class="search-wrapper" id="searchWrapper">
        <span class="search-icon">&#128269;</span>
        <input type="text" class="search-input" id="searchInput" placeholder="Search anything..." autofocus autocomplete="off">
        <button class="search-clear" id="searchClear" onclick="clearSearch()">&#10005;</button>
        <div class="autocomplete" id="autocomplete"></div>
      </div>
    </div>

    <div class="stats-bar" id="statsBar">
      <span class="stat-text" id="statsText"></span>
    </div>

    <div class="results" id="results"></div>
    <div class="pagination" id="pagination"></div>

    <div class="footer">
      <div class="footer-tech">
        <span class="tech-tag">TypeScript</span>
        <span class="tech-tag">Node.js</span>
        <span class="tech-tag">BM25</span>
        <span class="tech-tag">LTR</span>
        <span class="tech-tag">DPR</span>
        <span class="tech-tag">Inverted Index</span>
        <span class="tech-tag">Vercel</span>
      </div>
      <div class="footer-copy">Search Engine &mdash; Built with TypeScript, deployed on Vercel</div>
    </div>
  </div>

  <script>
    let currentQuery = '';
    let currentPage = 1;
    let acTimer = null;
    let totalPages = 1;

    const si = document.getElementById('searchInput');
    const sw = document.getElementById('searchWrapper');
    const ac = document.getElementById('autocomplete');
    const rs = document.getElementById('results');
    const st = document.getElementById('statsText');
    const sb = document.getElementById('statsBar');
    const pg = document.getElementById('pagination');
    const hr = document.getElementById('hero');
    const cl = document.getElementById('searchClear');

    // Focus/blur effects
    si.addEventListener('focus', () => sw.classList.add('focused'));
    si.addEventListener('blur', () => setTimeout(() => { sw.classList.remove('focused'); ac.classList.remove('visible'); }, 200));

    // Input handling
    si.addEventListener('input', function() {
      clearTimeout(acTimer);
      cl.classList.toggle('visible', this.value.length > 0);
      const v = this.value.trim();
      if (v.length >= 2) acTimer = setTimeout(() => fetchAC(v), 180);
      else { ac.classList.remove('visible'); }
    });

    si.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); search(); }
      if (e.key === 'Escape') { ac.classList.remove('visible'); si.blur(); }
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.search-wrapper')) ac.classList.remove('visible');
    });

    function clearSearch() {
      si.value = '';
      cl.classList.remove('visible');
      si.focus();
      ac.classList.remove('visible');
    }

    function resetSearch() {
      si.value = '';
      currentQuery = '';
      currentPage = 1;
      rs.innerHTML = '';
      sb.classList.remove('visible');
      pg.innerHTML = '';
      hr.classList.remove('compact');
      si.focus();
    }

    async function fetchAC(prefix) {
      try {
        const r = await fetch('/autocomplete?q=' + encodeURIComponent(prefix));
        const d = await r.json();
        showAC(d.suggestions);
      } catch (e) { /* ignore */ }
    }

    function showAC(suggestions) {
      ac.innerHTML = '';
      if (!suggestions || suggestions.length === 0) { ac.classList.remove('visible'); return; }
      suggestions.forEach((s, i) => {
        const div = document.createElement('div');
        div.className = 'ac-item' + (i === 0 ? ' selected' : '');
        div.innerHTML = '<span class="ac-icon">&#128270;</span>' + esc(s);
        div.onclick = () => { si.value = s; ac.classList.remove('visible'); search(); };
        div.onmouseenter = () => { ac.querySelectorAll('.ac-item').forEach(el => el.classList.remove('selected')); div.classList.add('selected'); };
        ac.appendChild(div);
      });
      ac.classList.add('visible');
    }

    async function search(page) {
      page = page || 1;
      const q = si.value.trim();
      if (!q) return;
      currentQuery = q;
      currentPage = page;
      ac.classList.remove('visible');
      hr.classList.add('compact');
      sb.classList.remove('visible');

      rs.innerHTML = '<div class="loading"><div class="spinner"></div><div style="color:#71717a;font-size:13px">Searching...</div></div>';

      try {
        const r = await fetch('/search?q=' + encodeURIComponent(q) + '&page=' + page + '&size=10');
        const d = await r.json();
        if (d.error) {
          rs.innerHTML = '<div class="state-message error-state"><div class="state-icon">&#9888;</div><div class="state-title">Error</div><div class="state-desc">' + esc(d.error) + '</div></div>';
          return;
        }
        renderResults(d, q);
      } catch (e) {
        rs.innerHTML = '<div class="state-message error-state"><div class="state-icon">&#9888;</div><div class="state-title">Network Error</div><div class="state-desc">Could not reach the search server. Please try again.</div></div>';
      }
    }

    function renderResults(data, query) {
      if (!data.results || data.results.length === 0) {
        rs.innerHTML = '<div class="state-message"><div class="state-icon">&#128270;</div><div class="state-title">No results found</div><div class="state-desc">No results for <strong>' + esc(query) + '</strong>. Try different keywords.</div></div>';
        sb.classList.add('visible');
        st.innerHTML = '<strong>0</strong> results in <strong>' + (data.searchTimeMs || 0).toFixed(0) + '</strong>ms';
        if (data.correctedQuery) st.innerHTML += ' &middot; Did you mean: <strong style="color:#60a5fa;cursor:pointer" onclick="setQuery(\\'' + esc(data.correctedQuery) + '\\')">' + esc(data.correctedQuery) + '</strong>';
        pg.innerHTML = '';
        return;
      }

      let html = '';
      let delay = 0;
      data.results.forEach((r, i) => {
        const date = r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        html += '<div class="result" style="animation-delay:' + (i * 0.04) + 's">';
        html += '<div class="result-url"><span class="domain-badge">' + esc(r.domain || 'web') + '</span> ' + esc((r.url || '').substring(0, 80)) + '</div>';
        html += '<div class="result-title"><a href="' + esc(r.url || '#') + '" target="_blank" rel="noopener">' + esc(r.title || 'Untitled') + '</a></div>';
        html += '<div class="result-snippet">' + (r.snippet || '') + '</div>';
        html += '<div class="result-meta">';
        html += '<span><span class="result-rank">#' + (r.rank || (pageToOffset(currentPage) + i + 1)) + '</span></span>';
        html += '<span>Score: ' + (r.score || 0).toFixed(3) + '</span>';
        if (date) html += '<span>' + date + '</span>';
        html += '</div></div>';
      });
      rs.innerHTML = html;

      const total = data.totalResults || data.results.length;
      const tp = Math.min(Math.ceil(total / 10), 20);
      totalPages = tp;

      sb.classList.add('visible');
      let statsHtml = '<strong>' + data.results.length + '</strong> results';
      if (data.searchTimeMs) statsHtml += ' in <strong>' + data.searchTimeMs.toFixed(0) + '</strong>ms';
      if (data.correctedQuery) statsHtml += ' &middot; Showing results for: <strong style="color:#fbbf24">' + esc(data.correctedQuery) + '</strong>';
      st.innerHTML = statsHtml;

      renderPagination(tp);
    }

    function pageToOffset(page) { return (page - 1) * 10; }

    function renderPagination(tp) {
      if (tp <= 1) { pg.innerHTML = ''; return; }
      let html = '';
      html += '<button class="page-btn nav" onclick="search(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>&#8249;</button>';
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(tp, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);
      for (let i = start; i <= end; i++) {
        html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" onclick="search(' + i + ')">' + i + '</button>';
      }
      html += '<button class="page-btn nav" onclick="search(' + (currentPage + 1) + ')" ' + (currentPage >= tp ? 'disabled' : '') + '>&#8250;</button>';
      pg.innerHTML = html;
    }

    function setQuery(q) { si.value = q; search(); }

    function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

    // Check URL params for initial search
    (function() {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQ = urlParams.get('q');
      if (urlQ) { si.value = urlQ; setTimeout(() => search(), 100); }
    })();
  </script>
</body>
</html>`;
}
