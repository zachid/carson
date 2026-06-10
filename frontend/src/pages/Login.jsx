import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

// ─── Theme definitions ────────────────────────────────────────────────────────
const THEMES = {
  gray: {
    bg:           '#F2F2EF',
    text:         '#7C3AED',
    textBody:     '#202020',
    eyebrow:      '#7C3AED',
    tagline:      '#7C3AED',
    btnBg:        '#7C3AED',
    btnText:      '#FFFFFF',
    btnHoverBg:   '#6D28D9',
    showGLogo:    false,
    btnLabel:     'Sign with Google',
    dot:          '#7C3AED',
    dotInactive:  'rgba(124,58,237,0.2)',
    // animation
    animWrap:     '#EAEAE6',
    animCard:     '#FFFFFF',
    animBorder:   'rgba(124,58,237,0.12)',
    animAccent:   '#7C3AED',
    animText:     '#111110',
    animSub:      '#666662',
    animMuted:    '#AAAAAA',
    animDot1:     '#EF4444',
    animDot2:     '#F59E0B',
    animDot3:     '#10B981',
    animBar:      'rgba(124,58,237,0.15)',
    animBarFill:  '#7C3AED',
  },
  black: {
    bg:           '#000000',
    text:         '#FFFFFF',
    textBody:     'rgba(255,255,255,0.75)',
    eyebrow:      '#FFFFFF',
    tagline:      '#FFFFFF',
    btnBg:        '#FFFFFF',
    btnText:      '#111111',
    btnHoverBg:   '#E8E8E8',
    showGLogo:    true,
    btnLabel:     'Continue with Google',
    dot:          '#FFFFFF',
    dotInactive:  'rgba(255,255,255,0.2)',
    // animation
    animWrap:     '#0D0D0D',
    animCard:     '#161616',
    animBorder:   'rgba(255,255,255,0.08)',
    animAccent:   '#4ADE80',
    animText:     '#FFFFFF',
    animSub:      'rgba(255,255,255,0.5)',
    animMuted:    'rgba(255,255,255,0.2)',
    animDot1:     '#EF4444',
    animDot2:     '#F59E0B',
    animDot3:     '#4ADE80',
    animBar:      'rgba(255,255,255,0.1)',
    animBarFill:  '#4ADE80',
  },
  purple: {
    bg:           '#7C3AED',
    text:         '#FFFFFF',
    textBody:     'rgba(255,255,255,0.80)',
    eyebrow:      'rgba(255,255,255,0.50)',
    tagline:      '#FFFFFF',
    btnBg:        '#FFFFFF',
    btnText:      '#111111',
    btnHoverBg:   '#F0EBFF',
    showGLogo:    true,
    btnLabel:     'Continue with Google',
    dot:          '#FFFFFF',
    dotInactive:  'rgba(255,255,255,0.28)',
    // animation
    animWrap:     'rgba(0,0,0,0.18)',
    animCard:     'rgba(255,255,255,0.10)',
    animBorder:   'rgba(255,255,255,0.15)',
    animAccent:   '#C4B5FD',
    animText:     '#FFFFFF',
    animSub:      'rgba(255,255,255,0.55)',
    animMuted:    'rgba(255,255,255,0.25)',
    animDot1:     '#F87171',
    animDot2:     '#FCD34D',
    animDot3:     '#6EE7B7',
    animBar:      'rgba(255,255,255,0.15)',
    animBarFill:  '#C4B5FD',
  },
};

const THEME_KEYS = ['gray', 'black', 'purple'];
const THEME_LABELS = { gray: 'Light', black: 'Dark', purple: 'Purple' };

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

// ─── Animated product preview ─────────────────────────────────────────────────
const STAGES = [
  {
    step: '01',
    label: 'INPUT',
    heading: 'Paste any website URL.',
    sub: 'Carson crawls the page and extracts brand signals automatically.',
    cells: [
      { title: 'URL', bar: 0.6, lines: 1 },
      { title: 'INDUSTRY', bar: 0.4, lines: 1 },
    ],
  },
  {
    step: '02',
    label: 'AUDIT',
    heading: 'Reading the brand DNA.',
    sub: 'Logos · colors · typography · layout patterns · tone — all extracted automatically.',
    cells: [
      { title: 'HERO',     bar: 0.85, lines: 2 },
      { title: 'PALETTE',  bar: 0.60, lines: 1 },
      { title: 'TYPEFACE', bar: 0.40, lines: 1 },
    ],
  },
  {
    step: '03',
    label: 'ANALYSIS',
    heading: 'Competitive positioning.',
    sub: 'White space · market gaps · messaging clarity — scored and ranked.',
    cells: [
      { title: 'LOGO',    bar: 0.55, lines: 2 },
      { title: 'LAYOUT',  bar: 0.70, lines: 1 },
      { title: 'TONE',    bar: 0.80, lines: 3 },
    ],
  },
  {
    step: '04',
    label: 'BLUEPRINT',
    heading: 'Content strategy mapped.',
    sub: 'Copy architecture, CTAs, and messaging hierarchy defined.',
    cells: [
      { title: 'HEADLINE', bar: 0.75, lines: 2 },
      { title: 'BODY',     bar: 0.50, lines: 3 },
    ],
  },
  {
    step: '05',
    label: 'DIRECTION',
    heading: 'Design direction selected.',
    sub: 'Classic · Spicy · Bold — choose your visual identity system.',
    cells: [
      { title: 'CLASSIC',  bar: 0.90, lines: 1 },
      { title: 'SPICY',    bar: 0.65, lines: 1 },
      { title: 'BOLD',     bar: 0.45, lines: 1 },
    ],
  },
];

function CarsonAnimation({ theme }) {
  const t = THEMES[theme];
  const [stageIdx, setStageIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setStageIdx(i => (i + 1) % STAGES.length);
        setFade(true);
      }, 350);
    }, 3200);
    return () => clearInterval(timerRef.current);
  }, []);

  const stage = STAGES[stageIdx];

  return (
    <div style={{
      width: '100%',
      maxWidth: 580,
      background: t.animWrap,
      borderRadius: 2,
      overflow: 'hidden',
      border: `1px solid ${t.animBorder}`,
    }}>
      {/* Mock browser bar */}
      <div style={{
        height: 36,
        background: t.animCard,
        borderBottom: `1px solid ${t.animBorder}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 7,
      }}>
        {[t.animDot1, t.animDot2, t.animDot3].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.85 }} />
        ))}
        <div style={{
          flex: 1, marginLeft: 10,
          height: 20,
          background: t.animBar,
          borderRadius: 2,
          maxWidth: 260,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
        }}>
          <span style={{
            fontSize: 10, fontFamily: "'Manrope', monospace",
            color: t.animMuted, letterSpacing: '0.04em',
          }}>
            carson.app · analyzing…
          </span>
        </div>
        {/* Stage indicators */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {STAGES.map((_, i) => (
            <div key={i} style={{
              width: i === stageIdx ? 16 : 6,
              height: 6,
              borderRadius: 3,
              background: i === stageIdx ? t.animBarFill : t.animBar,
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{
        padding: '28px 28px 32px',
        minHeight: 300,
        opacity: fade ? 1 : 0,
        transform: fade ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}>
        {/* Step label */}
        <div style={{
          fontSize: 10, fontWeight: 700,
          fontFamily: "'Manrope', sans-serif",
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: t.animAccent,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>{stage.step}</span>
          <span style={{ color: t.animMuted }}>·</span>
          <span>{stage.label}</span>
        </div>

        {/* Heading */}
        <div style={{
          fontSize: 18, fontWeight: 700,
          fontFamily: "'Bai Jamjuree', sans-serif",
          color: t.animText,
          marginBottom: 8,
          lineHeight: 1.3,
        }}>
          {stage.heading}
        </div>

        {/* Sub */}
        <div style={{
          fontSize: 12, fontWeight: 400,
          fontFamily: "'Bai Jamjuree', sans-serif",
          color: t.animSub,
          marginBottom: 28,
          lineHeight: 1.6,
          maxWidth: 380,
        }}>
          {stage.sub}
        </div>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: stage.cells.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr',
          gap: 10,
        }}>
          {stage.cells.map((cell, i) => (
            <div key={i} style={{
              background: t.animCard,
              border: `1px solid ${t.animBorder}`,
              borderRadius: 2,
              padding: '14px 14px 16px',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700,
                fontFamily: "'Manrope', sans-serif",
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: t.animAccent,
                marginBottom: 10,
              }}>
                {cell.title}
              </div>
              {/* Progress bar */}
              <div style={{
                height: 3, background: t.animBar,
                borderRadius: 2, marginBottom: 10, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${cell.bar * 100}%`,
                  background: t.animBarFill,
                  borderRadius: 2,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              {/* Content lines */}
              {Array.from({ length: cell.lines }).map((_, li) => (
                <div key={li} style={{
                  height: 6, background: t.animBar,
                  borderRadius: 2,
                  marginBottom: li < cell.lines - 1 ? 5 : 0,
                  width: li === cell.lines - 1 ? '60%' : '100%',
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────
export default function Login() {
  const { signInWithGoogle, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(
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
        maxWidth: 560,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 0 80px clamp(32px, 8vw, 120px)',
        position: 'relative',
      }}>

        {/* Eyebrow — top left */}
        <div style={{
          position: 'absolute',
          top: 52,
          left: 'clamp(32px, 8vw, 120px)',
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

        {/* Google sign-in button */}
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

        {/* Error */}
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

        {/* Theme switcher — bottom left */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: 'clamp(32px, 8vw, 120px)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          {THEME_KEYS.map(k => (
            <button
              key={k}
              onClick={() => selectTheme(k)}
              title={THEME_LABELS[k]}
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 48px 40px 24px',
      }}>
        <CarsonAnimation theme={theme} />
      </div>
    </div>
  );
}
