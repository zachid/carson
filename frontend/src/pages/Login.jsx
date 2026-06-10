import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

// ─── Theme definitions ────────────────────────────────────────────────────────
const THEMES = {
  gray: {
    bg:          '#F2F2EF',
    text:        '#7C3AED',
    textBody:    '#202020',
    eyebrow:     '#7C3AED',
    tagline:     '#7C3AED',
    btnBg:       '#7C3AED',
    btnText:     '#FFFFFF',
    btnHoverBg:  '#6D28D9',
    showGLogo:   false,
    btnLabel:    'Sign with Google',
    dot:         '#7C3AED',
    dotInactive: 'rgba(124,58,237,0.2)',
    animTheme:   'light',          // maps to animation CSS class
  },
  black: {
    bg:          '#000000',
    text:        '#FFFFFF',
    textBody:    'rgba(255,255,255,0.75)',
    eyebrow:     '#FFFFFF',
    tagline:     '#FFFFFF',
    btnBg:       '#FFFFFF',
    btnText:     '#111111',
    btnHoverBg:  '#E8E8E8',
    showGLogo:   true,
    btnLabel:    'Continue with Google',
    dot:         '#FFFFFF',
    dotInactive: 'rgba(255,255,255,0.2)',
    animTheme:   'dark',
  },
  purple: {
    bg:          '#7C3AED',
    text:        '#FFFFFF',
    textBody:    'rgba(255,255,255,0.80)',
    eyebrow:     'rgba(255,255,255,0.50)',
    tagline:     '#FFFFFF',
    btnBg:       '#FFFFFF',
    btnText:     '#111111',
    btnHoverBg:  '#F0EBFF',
    showGLogo:   true,
    btnLabel:    'Continue with Google',
    dot:         '#FFFFFF',
    dotInactive: 'rgba(255,255,255,0.28)',
    animTheme:   'purple',
  },
};

const THEME_KEYS  = ['gray', 'black', 'purple'];
const THEME_NAMES = { gray: 'Light', black: 'Dark', purple: 'Purple' };

// ─── Google G logo ────────────────────────────────────────────────────────────
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ─── Animation iframe (real carson_scenes_themes animation) ───────────────────
// The srcdoc is the full original animation wrapped in an HTML shell.
// Theme changes are communicated via postMessage({ type:'setTheme', theme:'dark'|'purple'|'light' }).
const buildAnimDoc = (initialTheme) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:transparent}

.wrap{width:100%;height:100%;position:relative;overflow:hidden;transition:background 0.4s ease;display:flex;flex-direction:column}
.t-dark{background:#0c0c0c}
.t-purple{background:#7C3AED}
.t-light{background:#F2F2EF}

.stage{width:100%;flex:1;position:relative;overflow:hidden}
.scene{position:absolute;inset:0;opacity:0;transition:opacity 0.7s ease;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:scale(1.25);transform-origin:center center}
.scene.active{opacity:1}

.caption{text-align:center;padding:0 0 18px;display:flex;flex-direction:column;gap:5px}
.cap-step{font-family:monospace;font-size:9px;letter-spacing:0.18em}
.cap-title{font-family:monospace;font-size:13px;font-weight:500;letter-spacing:0.06em}
.cap-sub{font-family:monospace;font-size:10px;letter-spacing:0.04em;max-width:340px;line-height:1.65}

.t-dark  .cap-step{color:#333}  .t-dark  .cap-title{color:#ccc}  .t-dark  .cap-sub{color:#444}
.t-purple .cap-step{color:rgba(255,255,255,0.45)} .t-purple .cap-title{color:#fff} .t-purple .cap-sub{color:rgba(255,255,255,0.55)}
.t-light  .cap-step{color:#aaa}  .t-light  .cap-title{color:#1a1a1a} .t-light  .cap-sub{color:#888}

.dot-row{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:6px}
.di{width:5px;height:5px;border-radius:50%;transition:background 0.4s}
.t-dark   .di{background:#1e1e1e} .t-dark   .di.on{background:#22c55e}
.t-purple .di{background:rgba(255,255,255,0.2)} .t-purple .di.on{background:#fff}
.t-light  .di{background:#ccc}   .t-light  .di.on{background:#333}

.browser,.new-browser{width:320px;height:220px;border-radius:7px;overflow:hidden;display:flex;flex-direction:column;transition:background 0.4s,border-color 0.4s}
.t-dark .browser{background:#111;border:0.5px solid #222}
.t-purple .browser{background:rgba(0,0,0,0.25);border:0.5px solid rgba(255,255,255,0.15)}
.t-light .browser{background:#fff;border:0.5px solid #d0d0d0}

.b-bar{height:26px;display:flex;align-items:center;padding:0 10px;gap:5px;flex-shrink:0;transition:background 0.4s,border-color 0.4s}
.t-dark   .b-bar{background:#181818;border-bottom:0.5px solid #1e1e1e}
.t-purple .b-bar{background:rgba(0,0,0,0.3);border-bottom:0.5px solid rgba(255,255,255,0.1)}
.t-light  .b-bar{background:#f0f0f0;border-bottom:0.5px solid #d8d8d8}

.bd{width:7px;height:7px;border-radius:50%}
.b-url{flex:1;height:12px;border-radius:3px;margin:0 8px;transition:background 0.4s}
.t-dark .b-url{background:#222} .t-purple .b-url{background:rgba(255,255,255,0.12)} .t-light .b-url{background:#e0e0e0}

.b-body{flex:1;display:flex;flex-direction:column}
.b-nav{height:18px;display:flex;align-items:center;padding:0 10px;gap:8px;transition:background 0.4s,border-color 0.4s}
.t-dark   .b-nav{background:#151515;border-bottom:0.5px solid #1a1a1a}
.t-purple .b-nav{background:rgba(0,0,0,0.2);border-bottom:0.5px solid rgba(255,255,255,0.08)}
.t-light  .b-nav{background:#f7f7f7;border-bottom:0.5px solid #e0e0e0}

.b-hero{flex:2.5;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;padding:10px;transition:background 0.4s}
.t-dark .b-hero{background:#0e0e0e} .t-purple .b-hero{background:rgba(0,0,0,0.18)} .t-light .b-hero{background:#fafafa}

.b-cols{display:flex;flex:1.5;padding:3px;gap:3px;transition:background 0.4s}
.t-dark .b-cols{background:#0a0a0a} .t-purple .b-cols{background:rgba(0,0,0,0.22)} .t-light .b-cols{background:#f0f0f0}

.b-col{flex:1;border-radius:1px;display:flex;flex-direction:column;padding:4px;gap:3px;transition:background 0.4s}
.t-dark .b-col{background:#111} .t-purple .b-col{background:rgba(255,255,255,0.07)} .t-light .b-col{background:#fff}

.b-footer{height:14px;transition:background 0.4s,border-color 0.4s}
.t-dark   .b-footer{background:#0d0d0d;border-top:0.5px solid #161616}
.t-purple .b-footer{background:rgba(0,0,0,0.2);border-top:0.5px solid rgba(255,255,255,0.06)}
.t-light  .b-footer{background:#f0f0f0;border-top:0.5px solid #e0e0e0}

.sk{border-radius:100px;transition:background 0.4s}
.t-dark .sk{background:#1e1e1e} .t-purple .sk{background:rgba(255,255,255,0.14)} .t-light .sk{background:#e0e0e0}
.sk2{border-radius:100px;transition:background 0.4s}
.t-dark .sk2{background:#181818} .t-purple .sk2{background:rgba(255,255,255,0.09)} .t-light .sk2{background:#d8d8d8}

.input-card{width:300px;border-radius:7px;padding:20px;display:flex;flex-direction:column;gap:10px;transition:background 0.4s,border-color 0.4s}
.t-dark .input-card{background:#111;border:0.5px solid #222}
.t-purple .input-card{background:rgba(0,0,0,0.25);border:0.5px solid rgba(255,255,255,0.15)}
.t-light .input-card{background:#fff;border:0.5px solid #d0d0d0}

.url-field{border-radius:4px;height:36px;display:flex;align-items:center;padding:0 12px;gap:8px;transition:background 0.4s,border-color 0.4s}
.t-dark   .url-field{background:#1a1a1a;border:0.5px solid #2a2a2a}
.t-purple .url-field{background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.2)}
.t-light  .url-field{background:#f5f5f5;border:0.5px solid #d8d8d8}

.url-globe{width:12px;height:12px;border-radius:50%;border:1px solid;flex-shrink:0;transition:border-color 0.4s}
.t-dark .url-globe{border-color:#333} .t-purple .url-globe{border-color:rgba(255,255,255,0.3)} .t-light .url-globe{border-color:#bbb}

.url-text{flex:1;height:6px;border-radius:100px;transition:background 0.4s}
.t-dark .url-text{background:#252525} .t-purple .url-text{background:rgba(255,255,255,0.15)} .t-light .url-text{background:#ddd}

.url-cursor{width:1.5px;height:14px;background:#22c55e;animation:cb 1s step-end infinite;flex-shrink:0}
@keyframes cb{0%,100%{opacity:1}50%{opacity:0}}
.t-purple .url-cursor{background:#fff}
.t-light  .url-cursor{background:#333}

.run-btn{border-radius:4px;height:36px;display:flex;align-items:center;justify-content:center;transition:background 0.4s}
.t-dark .run-btn{background:#22c55e} .t-purple .run-btn{background:rgba(255,255,255,0.9)} .t-light .run-btn{background:#1a1a1a}
.btn-bar{height:6px;width:70px;border-radius:100px;transition:background 0.4s}
.t-dark .btn-bar{background:#16a34a} .t-purple .btn-bar{background:#7C3AED} .t-light .btn-bar{background:#555}

.audit-wrap{width:360px;height:240px;position:relative}
.a-block{position:absolute;border-radius:3px;overflow:hidden;transition:top 1.2s cubic-bezier(0.4,0,0.2,1),left 1.2s cubic-bezier(0.4,0,0.2,1),width 1.2s cubic-bezier(0.4,0,0.2,1),height 1.2s cubic-bezier(0.4,0,0.2,1),opacity 0.6s ease,border-color 0.8s ease,background 0.8s ease}
.t-dark   .a-block{background:#111;border:0.5px solid #1e1e1e}
.t-purple .a-block{background:rgba(0,0,0,0.25);border:0.5px solid rgba(255,255,255,0.12)}
.t-light  .a-block{background:#fff;border:0.5px solid #ddd}
.t-dark   .a-block.hl{border-color:#22c55e!important;background:#0d1a0d!important}
.t-purple .a-block.hl{border-color:rgba(255,255,255,0.8)!important;background:rgba(255,255,255,0.12)!important}
.t-light  .a-block.hl{border-color:#333!important;background:#f0f0f0!important}

.scan-line{position:absolute;left:0;right:0;height:1px;opacity:0;top:0;transition:background 0.4s}
.scan-line.go{opacity:0.5;animation:scan 1.6s ease-in-out forwards}
.t-dark .scan-line{background:#22c55e} .t-purple .scan-line{background:#fff} .t-light .scan-line{background:#333}
@keyframes scan{0%{top:0;opacity:0.7}100%{top:100%;opacity:0}}

.ai-bar{height:5px;border-radius:100px;transition:background 0.4s}
.t-dark .ai-bar{background:#1a3020} .t-purple .ai-bar{background:rgba(255,255,255,0.25)} .t-light .ai-bar{background:#d0d0d0}
.ai-dim{height:4px;border-radius:100px;transition:background 0.4s}
.t-dark .ai-dim{background:#252525} .t-purple .ai-dim{background:rgba(255,255,255,0.12)} .t-light .ai-dim{background:#e0e0e0}
.lbl-audit{font-family:monospace;font-size:8px;letter-spacing:0.08em;transition:color 0.4s}
.t-dark .lbl-active{color:#22c55e} .t-purple .lbl-active{color:#fff} .t-light .lbl-active{color:#333}
.t-dark .lbl-dim{color:#444} .t-purple .lbl-dim{color:rgba(255,255,255,0.4)} .t-light .lbl-dim{color:#aaa}

.ai-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.logo-box{width:36px;height:20px;border-radius:2px;transition:background 0.4s,border-color 0.4s}
.t-dark .logo-box{background:#1e1e1e;border:0.5px solid #333}
.t-purple .logo-box{background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.2)}
.t-light .logo-box{background:#e8e8e8;border:0.5px solid #ccc}
.layout-sq{transition:background 0.4s}
.t-dark .layout-sq{background:#1e1e1e} .t-purple .layout-sq{background:rgba(255,255,255,0.12)} .t-light .layout-sq{background:#e0e0e0}
.layout-sm{transition:background 0.4s}
.t-dark .layout-sm{background:#1a1a1a} .t-purple .layout-sm{background:rgba(255,255,255,0.08)} .t-light .layout-sm{background:#eaeaea}

.t-dark .new-browser{background:#0d0d0d;border:0.5px solid #1a2e1a}
.t-purple .new-browser{background:rgba(0,0,0,0.25);border:0.5px solid rgba(255,255,255,0.2)}
.t-light .new-browser{background:#fff;border:0.5px solid #c8e6c9}

.ns-bar{height:26px;display:flex;align-items:center;padding:0 10px;gap:5px;flex-shrink:0;transition:background 0.4s,border-color 0.4s}
.t-dark   .ns-bar{background:#111a11;border-bottom:0.5px solid #1a2e1a}
.t-purple .ns-bar{background:rgba(0,0,0,0.28);border-bottom:0.5px solid rgba(255,255,255,0.12)}
.t-light  .ns-bar{background:#e8f5e9;border-bottom:0.5px solid #c8e6c9}

.ns-body{flex:1;display:flex;flex-direction:column}
.ns-nav{height:18px;display:flex;align-items:center;padding:0 10px;gap:8px;transition:background 0.4s,border-color 0.4s}
.t-dark   .ns-nav{background:#0f180f;border-bottom:0.5px solid #162616}
.t-purple .ns-nav{background:rgba(0,0,0,0.2);border-bottom:0.5px solid rgba(255,255,255,0.08)}
.t-light  .ns-nav{background:#f1f8f1;border-bottom:0.5px solid #d0e8d0}

.ns-hero{flex:2.5;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;padding:10px;transition:background 0.4s}
.t-dark .ns-hero{background:#0b150b} .t-purple .ns-hero{background:rgba(0,0,0,0.18)} .t-light .ns-hero{background:#f8fdf8}
.ns-cols{display:flex;flex:1.5;padding:3px;gap:3px;transition:background 0.4s}
.t-dark .ns-cols{background:#090d09} .t-purple .ns-cols{background:rgba(0,0,0,0.22)} .t-light .ns-cols{background:#edf5ed}
.ns-col{flex:1;border-radius:1px;display:flex;flex-direction:column;padding:4px;gap:3px;transition:background 0.4s}
.t-dark .ns-col{background:#0d160d} .t-purple .ns-col{background:rgba(255,255,255,0.07)} .t-light .ns-col{background:#fff}
.ns-footer{height:14px;transition:background 0.4s,border-color 0.4s}
.t-dark   .ns-footer{background:#0b120b;border-top:0.5px solid #162616}
.t-purple .ns-footer{background:rgba(0,0,0,0.2);border-top:0.5px solid rgba(255,255,255,0.06)}
.t-light  .ns-footer{background:#e8f5e9;border-top:0.5px solid #c8e6c9}

.gk{border-radius:100px;transition:background 0.4s}
.t-dark .gk{background:#1a3020} .t-purple .gk{background:rgba(255,255,255,0.22)} .t-light .gk{background:#c8e6c9}
.gk2{border-radius:100px;transition:background 0.4s}
.t-dark .gk2{background:#162616} .t-purple .gk2{background:rgba(255,255,255,0.12)} .t-light .gk2{background:#ddeedd}

.flow-wrap{width:480px;display:flex;flex-direction:column;gap:16px}
.flow-nodes{display:flex;align-items:center;width:100%}
.fn{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1}
.fn-circle{width:10px;height:10px;border-radius:50%;position:relative;z-index:1;transition:background 0.4s,border-color 0.4s}
.t-dark   .fn-circle{border:1px solid #22c55e;background:#0d1a0d}
.t-purple .fn-circle{border:1px solid rgba(255,255,255,0.4);background:rgba(255,255,255,0.05)}
.t-light  .fn-circle{border:1px solid #aaa;background:#f0f0f0}
.t-dark   .fn-circle.lit{background:#22c55e}
.t-purple .fn-circle.lit{background:#fff;border-color:#fff}
.t-light  .fn-circle.lit{background:#1a1a1a;border-color:#1a1a1a}
.fn-line{flex:1;height:1px;transition:background 0.6s}
.t-dark   .fn-line{background:#1a2e1a}  .t-dark   .fn-line.lit{background:#22c55e}
.t-purple .fn-line{background:rgba(255,255,255,0.15)} .t-purple .fn-line.lit{background:rgba(255,255,255,0.8)}
.t-light  .fn-line{background:#ddd}     .t-light  .fn-line.lit{background:#333}
.fn-label{font-family:monospace;font-size:8px;letter-spacing:0.12em;transition:color 0.4s}
.t-dark   .fn-label{color:#2a2a2a}  .t-dark   .fn-label.lit{color:#22c55e}
.t-purple .fn-label{color:rgba(255,255,255,0.3)} .t-purple .fn-label.lit{color:#fff}
.t-light  .fn-label{color:#bbb}     .t-light  .fn-label.lit{color:#1a1a1a}

.flow-cards{display:flex;gap:6px}
.fc{flex:1;border-radius:4px;padding:7px 7px 6px;display:flex;flex-direction:column;gap:4px;opacity:0;transition:opacity 0.5s,border-color 0.5s,background 0.4s}
.fc.show{opacity:1}
.t-dark   .fc{background:#111;border:0.5px solid #1e1e1e}
.t-purple .fc{background:rgba(0,0,0,0.25);border:0.5px solid rgba(255,255,255,0.12)}
.t-light  .fc{background:#fff;border:0.5px solid #ddd}
.t-dark   .fc.active-card{border-color:#22c55e}
.t-purple .fc.active-card{border-color:rgba(255,255,255,0.7)}
.t-light  .fc.active-card{border-color:#333}
.fc-label{font-family:monospace;font-size:7px;letter-spacing:0.12em;margin-bottom:1px;transition:color 0.4s}
.t-dark .fc-label{color:#333} .t-purple .fc-label{color:rgba(255,255,255,0.4)} .t-light .fc-label{color:#bbb}
.fc-bar{height:4px;border-radius:100px;transition:background 0.4s}
.t-dark   .fc-bar{background:#1e1e1e}  .t-purple .fc-bar{background:rgba(255,255,255,0.12)} .t-light .fc-bar{background:#e0e0e0}
.t-dark   .fc-bar.g{background:#1a3020} .t-purple .fc-bar.g{background:rgba(255,255,255,0.25)} .t-light .fc-bar.g{background:#c8e6c9}
.fc-doc{border-radius:2px;display:flex;flex-direction:column;padding:3px;gap:2px;transition:background 0.4s,border-color 0.4s}
.t-dark .fc-doc{background:#111;border:0.5px solid #2a2a2a} .t-purple .fc-doc{background:rgba(255,255,255,0.08);border:0.5px solid rgba(255,255,255,0.15)} .t-light .fc-doc{background:#f5f5f5;border:0.5px solid #ccc}
</style>
</head>
<body>
<div class="wrap t-${initialTheme}" id="main-wrap">
  <div class="stage">
    <div class="scene active" id="s1">
      <div class="caption">
        <div class="cap-step">01 · INPUT</div>
        <div class="cap-title">Drop a URL. That's it.</div>
        <div class="cap-sub">Paste any website address. Carson takes it from here — no setup, no config.</div>
      </div>
      <div class="input-card">
        <div class="url-field">
          <div class="url-globe"></div>
          <div class="url-text" id="url-fill" style="width:0%;transition:width 1.4s ease"></div>
          <div class="url-cursor"></div>
        </div>
        <div class="run-btn"><div class="btn-bar"></div></div>
      </div>
    </div>
    <div class="scene" id="s2">
      <div class="caption">
        <div class="cap-step">02 · AUDIT</div>
        <div class="cap-title">Reading the brand DNA.</div>
        <div class="cap-sub">Logos · colors · typography · layout patterns · tone — all extracted automatically.</div>
      </div>
      <div class="audit-wrap" id="audit-wrap">
        <div class="scan-line" id="scan-line"></div>
        <div class="a-block" id="ab-nav"  style="top:0;left:0;width:360px;height:20px"></div>
        <div class="a-block" id="ab-hero" style="top:26px;left:0;width:360px;height:80px">
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:10px 14px;gap:5px;opacity:0" id="hero-content">
            <div style="display:flex;align-items:center;gap:5px">
              <div class="ai-dot" style="background:#22c55e"></div>
              <div class="ai-bar" style="width:150px"></div>
              <div class="lbl-audit lbl-active">HERO</div>
            </div>
            <div style="display:flex;gap:4px;align-items:center">
              <div style="width:9px;height:9px;border-radius:50%;background:#c0392b;flex-shrink:0"></div>
              <div style="width:9px;height:9px;border-radius:50%;background:#2471a3;flex-shrink:0"></div>
              <div style="width:9px;height:9px;border-radius:50%;background:#1e8449;flex-shrink:0"></div>
              <div style="width:9px;height:9px;border-radius:50%;background:#d4ac0d;flex-shrink:0"></div>
              <div class="lbl-audit lbl-dim" style="margin-right:auto">PALETTE</div>
            </div>
            <div style="display:flex;align-items:center;gap:5px">
              <div class="ai-dot" style="background:#555"></div>
              <div class="ai-dim" style="width:110px"></div>
              <div class="lbl-audit lbl-dim">TYPEFACE</div>
            </div>
          </div>
        </div>
        <div class="a-block" id="ab-c1" style="top:112px;left:0;width:116px;height:60px">
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:6px 8px;gap:4px;opacity:0" id="c1-content">
            <div class="lbl-audit lbl-active">LOGO</div>
            <div class="logo-box"></div>
          </div>
        </div>
        <div class="a-block" id="ab-c2" style="top:112px;left:122px;width:116px;height:60px">
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:6px 8px;gap:3px;opacity:0" id="c2-content">
            <div class="lbl-audit lbl-dim">LAYOUT</div>
            <div style="display:flex;gap:2px">
              <div class="layout-sq" style="width:20px;height:14px;border-radius:1px"></div>
              <div style="display:flex;flex-direction:column;gap:2px">
                <div class="layout-sm" style="width:28px;height:6px;border-radius:1px"></div>
                <div class="layout-sm" style="width:28px;height:6px;border-radius:1px"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="a-block" id="ab-c3" style="top:112px;left:244px;width:116px;height:60px">
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:6px 8px;gap:3px;opacity:0" id="c3-content">
            <div class="lbl-audit lbl-dim">TONE</div>
            <div class="ai-dim" style="width:70%"></div>
            <div class="ai-dim" style="width:50%"></div>
          </div>
        </div>
        <div class="a-block" id="ab-ft" style="top:178px;left:0;width:360px;height:16px;opacity:0.4"></div>
      </div>
    </div>
    <div class="scene" id="s3">
      <div class="caption">
        <div class="cap-step">03 · REBUILD</div>
        <div class="cap-title">A new site takes shape.</div>
        <div class="cap-sub">Reconstructed from scratch — new layout, new hierarchy, same brand signals, better output.</div>
      </div>
      <div class="new-browser">
        <div class="ns-bar">
          <div class="bd" style="background:#28c840;opacity:0.8"></div>
          <div class="bd" style="background:#28c840;opacity:0.45"></div>
          <div class="bd" style="background:#28c840;opacity:0.2"></div>
          <div style="flex:1;height:11px;border-radius:3px;margin:0 8px" class="gk2"></div>
        </div>
        <div class="ns-body">
          <div class="ns-nav">
            <div class="gk" style="width:30px;height:5px"></div>
            <div class="gk" style="width:26px;height:5px"></div>
            <div class="gk" style="width:26px;height:5px"></div>
            <div style="flex:1"></div>
            <div class="gk" style="width:34px;height:11px;border-radius:2px"></div>
          </div>
          <div class="ns-hero" id="ns-hero" style="opacity:0;transition:opacity 0.9s">
            <div class="gk" style="width:70%;height:9px"></div>
            <div class="gk" style="width:52%;height:6px"></div>
            <div class="gk2" style="width:38%;height:5px;margin-top:3px"></div>
            <div style="display:flex;gap:6px;margin-top:7px">
              <div class="gk" style="width:50px;height:14px;border-radius:2px"></div>
              <div class="gk2" style="width:50px;height:14px;border-radius:2px"></div>
            </div>
          </div>
          <div class="ns-cols" id="ns-cols" style="opacity:0;transition:opacity 0.9s 0.5s">
            <div class="ns-col"><div class="gk2" style="width:100%;height:28px;border-radius:1px"></div><div class="gk" style="width:80%;height:4px"></div><div class="gk" style="width:60%;height:4px"></div></div>
            <div class="ns-col"><div class="gk2" style="width:100%;height:28px;border-radius:1px"></div><div class="gk" style="width:88%;height:4px"></div><div class="gk" style="width:65%;height:4px"></div></div>
            <div class="ns-col"><div class="gk2" style="width:100%;height:28px;border-radius:1px"></div><div class="gk" style="width:72%;height:4px"></div><div class="gk" style="width:52%;height:4px"></div></div>
          </div>
          <div class="ns-footer"></div>
        </div>
      </div>
    </div>
    <div class="scene" id="s4">
      <div class="caption">
        <div class="cap-step">THE FULL PIPELINE</div>
        <div class="cap-title">Input → Audit → Analyse → Build → Export</div>
        <div class="cap-sub">One URL in. A redesigned, coded website out.</div>
      </div>
      <div class="flow-wrap">
        <div class="flow-nodes">
          <div class="fn"><div class="fn-circle" id="fc0"></div><div class="fn-label" id="fl0">INPUT</div></div>
          <div class="fn-line" id="fl-0"></div>
          <div class="fn"><div class="fn-circle" id="fc1"></div><div class="fn-label" id="fl1">SCRAPE</div></div>
          <div class="fn-line" id="fl-1"></div>
          <div class="fn"><div class="fn-circle" id="fc2"></div><div class="fn-label" id="fl2">AUDIT</div></div>
          <div class="fn-line" id="fl-2"></div>
          <div class="fn"><div class="fn-circle" id="fc3"></div><div class="fn-label" id="fl3">ANALYSE</div></div>
          <div class="fn-line" id="fl-3"></div>
          <div class="fn"><div class="fn-circle" id="fc4"></div><div class="fn-label" id="fl4">BUILD</div></div>
          <div class="fn-line" id="fl-4"></div>
          <div class="fn"><div class="fn-circle" id="fc5"></div><div class="fn-label" id="fl5">EXPORT</div></div>
        </div>
        <div class="flow-cards" id="flow-cards">
          <div class="fc" id="fcard0"><div class="fc-label">INPUT</div><div class="fc-bar" style="width:90%"></div><div class="fc-bar" style="width:60%"></div></div>
          <div class="fc" id="fcard1"><div class="fc-label">SCRAPE</div><div class="fc-bar" style="width:80%"></div><div class="fc-bar" style="width:55%"></div><div class="fc-bar" style="width:70%"></div></div>
          <div class="fc" id="fcard2"><div class="fc-label">AUDIT</div><div style="display:flex;gap:3px;margin:2px 0"><div style="width:7px;height:7px;border-radius:50%;background:#c0392b"></div><div style="width:7px;height:7px;border-radius:50%;background:#2471a3"></div><div style="width:7px;height:7px;border-radius:50%;background:#1e8449"></div></div><div class="fc-bar" style="width:85%"></div></div>
          <div class="fc" id="fcard3"><div class="fc-label">ANALYSE</div><div class="fc-bar" style="width:95%"></div><div class="fc-bar" style="width:65%"></div><div class="fc-bar" style="width:75%"></div></div>
          <div class="fc" id="fcard4"><div class="fc-label">BUILD</div><div class="fc-bar g" style="width:90%"></div><div class="fc-bar g" style="width:70%"></div><div class="fc-bar g" style="width:80%"></div></div>
          <div class="fc" id="fcard5"><div class="fc-label">EXPORT</div><div class="fc-doc" style="width:28px;height:34px;margin-top:2px"><div class="fc-bar" style="width:100%"></div><div class="fc-bar" style="width:80%"></div><div class="fc-bar" style="width:90%"></div></div></div>
        </div>
      </div>
    </div>
    <div class="dot-row">
      <div class="di on" id="d0"></div>
      <div class="di" id="d1"></div>
      <div class="di" id="d2"></div>
      <div class="di" id="d3"></div>
    </div>
  </div>
</div>
<script>
let cur=0,auditRan=false,flowRan=false;
const DUR=[3800,5800,3600,5200];
function showScene(i){['s1','s2','s3','s4'].forEach((id,j)=>document.getElementById(id).classList.toggle('active',j===i));['d0','d1','d2','d3'].forEach((id,j)=>document.getElementById(id).classList.toggle('on',j===i));}
function setTheme(t){const w=document.getElementById('main-wrap');w.classList.remove('t-dark','t-purple','t-light');w.classList.add('t-'+t);}
function initInput(){const b=document.getElementById('url-fill');b.style.transition='none';b.style.width='0%';void b.offsetWidth;b.style.transition='width 1.4s ease';setTimeout(()=>{b.style.width='72%'},200);}
function runAudit(){if(auditRan)return;auditRan=true;const scan=document.getElementById('scan-line');scan.style.opacity='0.6';scan.style.top='0';scan.classList.add('go');const hl=(id,d)=>setTimeout(()=>{document.getElementById(id).classList.add('hl');const c=document.getElementById(id.replace('ab-','').replace('-','')+ '-content');if(c){c.style.transition='opacity 0.5s';c.style.opacity='1';}},d);hl('ab-nav',300);hl('ab-hero',600);hl('ab-c1',950);hl('ab-c2',1100);hl('ab-c3',1250);setTimeout(()=>{['ab-nav','ab-hero','ab-c1','ab-c2','ab-c3'].forEach(id=>document.getElementById(id).classList.remove('hl'));document.getElementById('ab-ft').style.opacity='0.1';const el=id=>document.getElementById(id);el('ab-hero').style.top='0';el('ab-hero').style.height='55px';el('ab-hero').style.width='360px';el('ab-c1').style.top='62px';el('ab-c1').style.left='0';el('ab-c1').style.width='174px';el('ab-c1').style.height='100px';el('ab-c2').style.top='62px';el('ab-c2').style.left='180px';el('ab-c2').style.width='180px';el('ab-c2').style.height='48px';el('ab-c3').style.top='116px';el('ab-c3').style.left='180px';el('ab-c3').style.width='180px';el('ab-c3').style.height='48px';},2000);}
function resetAudit(){auditRan=false;const scan=document.getElementById('scan-line');scan.classList.remove('go');scan.style.opacity='0';['hero-content','c1-content','c2-content','c3-content'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.opacity='0';});const blocks=['ab-nav','ab-hero','ab-c1','ab-c2','ab-c3','ab-ft'];blocks.forEach(id=>{const el=document.getElementById(id);el.classList.remove('hl');el.style.transition='none';});document.getElementById('ab-nav').style.cssText+=';top:0px;left:0px;width:360px;height:20px;opacity:1';document.getElementById('ab-hero').style.cssText+=';top:26px;left:0px;width:360px;height:80px;opacity:1';document.getElementById('ab-c1').style.cssText+=';top:112px;left:0px;width:116px;height:60px;opacity:1';document.getElementById('ab-c2').style.cssText+=';top:112px;left:122px;width:116px;height:60px;opacity:1';document.getElementById('ab-c3').style.cssText+=';top:112px;left:244px;width:116px;height:60px;opacity:1';document.getElementById('ab-ft').style.cssText+=';top:178px;left:0px;width:360px;height:16px;opacity:0.4';void document.getElementById('audit-wrap').offsetWidth;blocks.forEach(id=>{document.getElementById(id).style.transition="top 1.2s cubic-bezier(0.4,0,0.2,1),left 1.2s cubic-bezier(0.4,0,0.2,1),width 1.2s cubic-bezier(0.4,0,0.2,1),height 1.2s cubic-bezier(0.4,0,0.2,1),opacity 0.6s ease,border-color 0.8s ease,background 0.8s ease";});}
function revealBuild(){document.getElementById('ns-hero').style.opacity='1';setTimeout(()=>{document.getElementById('ns-cols').style.opacity='1';},500);}
function hideBuild(){document.getElementById('ns-hero').style.opacity='0';document.getElementById('ns-cols').style.opacity='0';}
function runFlow(){if(flowRan)return;flowRan=true;for(let i=0;i<6;i++){((idx)=>setTimeout(()=>{document.getElementById('fc'+idx).classList.add('lit');document.getElementById('fl'+idx).classList.add('lit');if(idx>0)document.getElementById('fl-'+(idx-1)).classList.add('lit');document.getElementById('fcard'+idx).classList.add('show');if(idx>0)document.getElementById('fcard'+(idx-1)).classList.remove('active-card');document.getElementById('fcard'+idx).classList.add('active-card');},idx*500))(i);}setTimeout(()=>{document.getElementById('fl-4').classList.add('lit');document.getElementById('fcard5').classList.remove('active-card');},3000);}
function resetFlow(){flowRan=false;for(let i=0;i<6;i++){document.getElementById('fc'+i).classList.remove('lit');document.getElementById('fl'+i).classList.remove('lit');const fc=document.getElementById('fcard'+i);fc.classList.remove('show','active-card');}for(let i=0;i<5;i++)document.getElementById('fl-'+i).classList.remove('lit');}
function next(){cur=(cur+1)%4;showScene(cur);if(cur===0){resetAudit();hideBuild();resetFlow();initInput();}if(cur===1)setTimeout(runAudit,600);if(cur===2)setTimeout(revealBuild,400);if(cur===3)setTimeout(runFlow,500);setTimeout(next,DUR[cur]);}
initInput();
setTimeout(next,DUR[0]);
window.addEventListener('message',function(e){if(e.data&&e.data.type==='setTheme')setTheme(e.data.theme);});
</script>
</body>
</html>`;

function CarsonAnimation({ theme }) {
  const iframeRef = useRef(null);
  // login theme → animation theme class
  const animTheme = { gray: 'light', black: 'dark', purple: 'purple' }[theme] || 'dark';

  // Send theme update whenever it changes (after iframe loads)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () =>
      iframe.contentWindow?.postMessage({ type: 'setTheme', theme: animTheme }, '*');
    iframe.addEventListener('load', send);
    send();
    return () => iframe.removeEventListener('load', send);
  }, [animTheme]);

  // Build the srcdoc once (initial theme baked in so first frame is correct)
  const srcDoc = buildAnimDoc(animTheme);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      title="Carson animation"
      style={{
        border: 'none',
        width: '100%',
        height: '100%',
        display: 'block',
        minHeight: 460,
      }}
      sandbox="allow-scripts"
    />
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────
export default function Login() {
  const { signInWithGoogle, error } = useAuth();
  const [loading,  setLoading]  = useState(false);
  const [theme,    setTheme]    = useState(
    () => localStorage.getItem('carson_login_theme') || 'gray'
  );
  const [btnHover, setBtnHover] = useState(false);

  const t = THEMES[theme];

  const handleSignIn = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  const selectTheme = (k) => {
    setTheme(k);
    localStorage.setItem('carson_login_theme', k);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      display: 'flex',
      fontFamily: "'Bai Jamjuree', 'Manrope', sans-serif",
      transition: 'background 0.35s ease',
      overflow: 'hidden',
    }}>

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '45%',
        minWidth: 380,
        maxWidth: 580,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 0 80px calc(clamp(32px, 8vw, 120px) + 40px)',
        position: 'relative',
      }}>

        {/* Eyebrow */}
        <div style={{
          position: 'absolute',
          top: 52,
          left: 'calc(clamp(32px, 8vw, 120px) + 40px)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: t.eyebrow,
          fontFamily: "'Manrope', sans-serif",
          transition: 'color 0.35s ease',
        }}>
          Sign In
        </div>

        {/* Big headline */}
        <div style={{ marginBottom: 20, lineHeight: 1.05 }}>
          <div style={{
            fontSize: 'clamp(48px, 5.2vw, 70px)',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: t.text,
            fontFamily: "'Bai Jamjuree', sans-serif",
            transition: 'color 0.35s ease',
            letterSpacing: '-0.01em',
          }}>
            Hi I'm,
          </div>
          <div style={{
            fontSize: 'clamp(48px, 5.2vw, 70px)',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: t.text,
            fontFamily: "'Bai Jamjuree', sans-serif",
            transition: 'color 0.35s ease',
            letterSpacing: '-0.01em',
          }}>
            Carson
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: t.tagline,
          marginBottom: 10,
          fontFamily: "'Bai Jamjuree', sans-serif",
          transition: 'color 0.35s ease',
        }}>
          AI-powered web redesign, in minutes.
        </div>

        {/* Description */}
        <div style={{
          fontSize: 15,
          fontWeight: 400,
          color: t.textBody,
          lineHeight: 1.6,
          marginBottom: 48,
          maxWidth: 400,
          fontFamily: "'Bai Jamjuree', sans-serif",
          transition: 'color 0.35s ease',
        }}>
          Paste a URL. Get a full brand audit, competitor analysis, and
          pixel-ready design direction — without the agency price tag.
        </div>

        {/* Sign-in button */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            width: 334,
            height: 60,
            background: btnHover && !loading ? t.btnHoverBg : t.btnBg,
            border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.15s ease, opacity 0.15s ease',
          }}
        >
          {t.showGLogo && <GoogleLogo />}
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: t.btnText,
            fontFamily: "'Manrope', sans-serif",
          }}>
            {loading ? 'Signing in…' : t.btnLabel}
          </span>
        </button>

        {error && (
          <div style={{
            marginTop: 12,
            fontSize: 12,
            color: theme === 'gray' ? '#EF4444' : 'rgba(255,120,120,1)',
            fontFamily: "'Manrope', sans-serif",
          }}>
            {error}
          </div>
        )}

        {/* Theme switcher */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: 'calc(clamp(32px, 8vw, 120px) + 40px)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          {THEME_KEYS.map(k => (
            <button
              key={k}
              onClick={() => selectTheme(k)}
              title={THEME_NAMES[k]}
              style={{
                width: theme === k ? 22 : 8,
                height: 8,
                borderRadius: 4,
                background: theme === k ? t.dot : t.dotInactive,
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Right animation panel ───────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'stretch',
        overflow: 'hidden',
      }}>
        <CarsonAnimation theme={theme} />
      </div>
    </div>
  );
}
