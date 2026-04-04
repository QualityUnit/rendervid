// Scene 4: HITL + Task Detail + Closing CTA (15s = 450 frames @ 30fps)
// Phase 1: Real FlowHunt UI task detail view matching actual Kanban card style
// Phase 2: Closing CTA with light branded sequence
function AIFactoryClosingScene(props) {
  var f = props.frame || 0;
  var W = props.layerSize.width;
  var H = props.layerSize.height;
  var e = React.createElement;

  // ===== EASING & HELPERS =====
  function eo3(t) { return 1 - Math.pow(1 - t, 3); }
  function eob(t) { var c = 2.2; return Math.min(1 + ((c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)), 1.12); }
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function p(s, n) { return cl((f - s) / (n - s), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(i) { return (((i * 2654435761) >>> 0) % 10000) / 10000; }
  function breathe(seed, speed) { return (Math.sin(f * (speed || 0.06) + (seed || 0) * 3.7) + 1) * 0.5; }
  function float(seed, amp, speed) { return Math.sin(f * (speed || 0.05) + (seed || 0) * 4.1) * (amp || 3); }

  // ===== COLORS - matching real FlowHunt UI =====
  var C_GR1 = '#984ad7'; var C_GR2 = '#465ce0'; var C_GR3 = '#0497dc';
  var C_BG = '#f0f4f8';
  var C_CARD = '#ffffff';
  var C_CARD_BORDER = '#e5e7eb';
  var C_SHADOW = '0 1px 3px rgba(0,0,0,0.1)';
  var C_TEXT = '#111827';
  var C_TEXT_SEC = '#6b7280';
  var C_TEXT_MUTED = '#9ca3af';

  // Tag colors from real UI
  var TAG_BLUE_BG = '#dbeafe'; var TAG_BLUE_TEXT = '#1d4ed8';
  var TAG_TEAL_BG = '#ccfbf1'; var TAG_TEAL_TEXT = '#0d9488';
  var TAG_RED_BG = '#fee2e2'; var TAG_RED_TEXT = '#dc2626';
  var TAG_PURPLE_BG = '#f3e8ff'; var TAG_PURPLE_TEXT = '#7c3aed';

  // Status colors
  var STATUS_AMBER_BG = '#fef3c7'; var STATUS_AMBER_TEXT = '#b45309';
  var STATUS_FAILED_BG = '#ef4444'; var STATUS_FAILED_TEXT = '#ffffff';
  var STATUS_DONE_BG = '#22c55e'; var STATUS_DONE_TEXT = '#ffffff';

  var children = [];

  // ===== TIMELINE =====
  // PHASE 1: Task Detail View (f0-200)
  //   f0-20:   Fade in
  //   f0-30:   Card zooms in from Kanban
  //   f30-160: Brief content scrolls in
  //   f160-200: Fade out to closing
  //
  // PHASE 2: Closing CTA (f200-450)
  //   f200-230: Light bg solidifies
  //   f220-270: FlowHunt logo + "AI Factory"
  //   f270-310: Feature bullets
  //   f310-350: CTA button
  //   f350-400: URL + tagline
  //   f400-450: Breathe, sparkle

  // ===== BACKGROUND =====
  var bgOp = f < 15 ? eo3(p(0, 15)) : 1;
  children.push(e('div', { key: 'bg', style: {
    position: 'absolute', top: 0, left: 0, width: W, height: H,
    background: C_BG, opacity: bgOp
  }}));

  // ===== PHASE 1: Task Detail View =====
  if (f < 210) {
    var phase1Op = f < 15 ? eo3(p(0, 15)) : (f < 190 ? 1 : 1 - eo3(p(190, 210)));

    // Semi-transparent overlay behind modal (like real modal backdrop)
    children.push(e('div', { key: 'modal-overlay', style: {
      position: 'absolute', top: 0, left: 0, width: W, height: H,
      background: 'rgba(0,0,0,0.15)', opacity: phase1Op, zIndex: 5
    }}));

    // === Background Kanban cards (blurred, to show context) ===
    var kanbanCards = [
      { x: 40, y: 60, title: 'Set up project repository', status: 'Done', statusBg: STATUS_DONE_BG, statusText: STATUS_DONE_TEXT, tags: [{ label: 'Enhancement', bg: TAG_TEAL_BG, color: TAG_TEAL_TEXT }], date: 'Apr 3, 2026, 02:15 PM' },
      { x: 40, y: 220, title: 'Configure CI/CD pipeline', status: 'Done', statusBg: STATUS_DONE_BG, statusText: STATUS_DONE_TEXT, tags: [{ label: 'Documentation', bg: TAG_BLUE_BG, color: TAG_BLUE_TEXT }], date: 'Apr 3, 2026, 03:30 PM' },
      { x: 360, y: 60, title: 'Research and draft first newsletter article', status: 'Failed', statusBg: STATUS_FAILED_BG, statusText: STATUS_FAILED_TEXT, tags: [{ label: 'Documentation', bg: TAG_BLUE_BG, color: TAG_BLUE_TEXT }, { label: 'Urgent', bg: TAG_RED_BG, color: TAG_RED_TEXT }], date: 'Apr 3, 2026, 06:41 PM' },
      { x: 680, y: 60, title: 'Design landing page mockup', status: 'In Progress', statusBg: '#dbeafe', statusText: '#1d4ed8', tags: [{ label: 'Enhancement', bg: TAG_TEAL_BG, color: TAG_TEAL_TEXT }], date: 'Apr 3, 2026, 05:12 PM' }
    ];

    var bgCardsOp = f < 15 ? eo3(p(0, 15)) * 0.4 : (f < 25 ? 0.4 : (f < 35 ? lerp(0.4, 0.2, eo3(p(25, 35))) : 0.2));
    bgCardsOp *= phase1Op;

    kanbanCards.forEach(function(card, ci) {
      var cardW = 280; var cardH = 140;
      children.push(e('div', { key: 'bg-card-' + ci, style: {
        position: 'absolute', left: card.x, top: card.y,
        width: cardW, height: cardH,
        borderRadius: 10, background: C_CARD,
        border: '1px solid ' + C_CARD_BORDER,
        boxShadow: C_SHADOW, padding: '12px 14px',
        opacity: bgCardsOp, zIndex: 2,
        filter: 'blur(1.5px)'
      }},
        // Title with emoji
        e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 } },
          e('span', { style: { fontSize: 13, flexShrink: 0 } }, ci === 2 ? '\u{1f4dd}' : (ci === 0 ? '\u{1f4e6}' : (ci === 1 ? '\u2699\ufe0f' : '\u{1f3a8}'))),
          e('div', { style: { color: C_TEXT, fontSize: 13, fontWeight: 600, lineHeight: '1.3' } }, card.title)
        ),
        // Status badge inline
        e('div', { style: {
          display: 'inline-block', padding: '2px 8px', borderRadius: 4,
          background: card.statusBg, color: card.statusText,
          fontSize: 10, fontWeight: 600, marginBottom: 8
        }}, card.status),
        // Tags at bottom
        e('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' } },
          card.tags.map(function(tag, ti) {
            return e('span', { key: 'tag-' + ti, style: {
              padding: '2px 7px', borderRadius: 4,
              background: tag.bg, color: tag.color,
              fontSize: 9, fontWeight: 500
            }}, tag.label);
          })
        ),
        // Date
        e('div', { style: { color: C_TEXT_MUTED, fontSize: 9, marginTop: 6 } }, card.date)
      ));
    });

    // === Main task detail modal (expanded card) ===
    var cardW = 780; var cardH = 580;
    var cardX = (W - cardW) / 2;
    var cardY = (H - cardH) / 2;
    var cardScale = f < 25 ? lerp(0.85, 1, eob(p(0, 25))) : 1;

    children.push(e('div', { key: 'task-card', style: {
      position: 'absolute', left: cardX, top: cardY, width: cardW, height: cardH,
      borderRadius: 12, background: C_CARD,
      border: '1px solid ' + C_CARD_BORDER,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
      opacity: phase1Op, transform: 'scale(' + cardScale + ')',
      overflow: 'hidden', zIndex: 10
    }},

      // ---- Header bar ----
      e('div', { style: {
        padding: '14px 20px', borderBottom: '1px solid ' + C_CARD_BORDER,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: C_CARD
      }},
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          // Status badge - amber "Human Input Needed"
          e('div', { style: {
            padding: '3px 10px', borderRadius: 5,
            background: STATUS_AMBER_BG,
            color: STATUS_AMBER_TEXT, fontSize: 11, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5
          }},
            e('div', { style: { width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' } }),
            'Human Input Needed'
          ),
          // Agent tag - purple
          e('div', { style: {
            padding: '3px 10px', borderRadius: 5,
            background: TAG_PURPLE_BG,
            color: TAG_PURPLE_TEXT, fontSize: 10, fontWeight: 600
          }}, 'content_curator')
        ),
        // Close button
        e('div', { style: {
          width: 28, height: 28, borderRadius: 6,
          background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer'
        }},
          e('span', { style: { color: C_TEXT_SEC, fontSize: 16, lineHeight: 1 } }, '\u00d7')
        )
      ),

      // ---- Task title + metadata ----
      e('div', { style: { padding: '16px 20px 0' } },
        e('div', { style: { color: C_TEXT, fontSize: 17, fontWeight: 700, lineHeight: '1.4' } },
          '\u{1f4dd} Research and draft first newsletter article'
        ),
        e('div', { style: { color: C_TEXT_MUTED, fontSize: 11, marginTop: 4 } },
          'Created by newsletter_site_director \u2022 Apr 3, 2026, 06:41 PM'
        )
      ),

      // ---- Tag badges row ----
      e('div', { style: { padding: '10px 20px 0', display: 'flex', gap: 6 } },
        e('span', { style: { padding: '2px 8px', borderRadius: 4, background: TAG_BLUE_BG, color: TAG_BLUE_TEXT, fontSize: 10, fontWeight: 600 } }, 'Documentation'),
        e('span', { style: { padding: '2px 8px', borderRadius: 4, background: TAG_TEAL_BG, color: TAG_TEAL_TEXT, fontSize: 10, fontWeight: 600 } }, 'Enhancement'),
        e('span', { style: { padding: '2px 8px', borderRadius: 4, background: TAG_RED_BG, color: TAG_RED_TEXT, fontSize: 10, fontWeight: 600 } }, 'Urgent')
      ),

      // ---- Scrollable content area ----
      e('div', { style: {
        padding: '14px 20px', flex: 1, overflowY: 'hidden',
        position: 'relative'
      }},
        (function() {
          var briefStart = 30;
          var briefOp = f >= briefStart ? (f < briefStart + 20 ? eo3(p(briefStart, briefStart + 20)) : 1) : 0;

          // Scroll effect
          var briefScroll = 0;
          if (f >= 80 && f < 160) {
            briefScroll = eo3(p(80, 160)) * -160;
          }
          if (f >= 160) briefScroll = -160;

          var briefItems = [];

          // Section: Mission Brief
          briefItems.push(e('div', { key: 'brief-header', style: {
            marginBottom: 10, opacity: briefOp
          }},
            e('div', { style: {
              color: C_TEXT, fontSize: 13, fontWeight: 700, marginBottom: 6
            }}, 'Mission Brief'),
            e('div', { style: { width: '100%', height: 1, background: C_CARD_BORDER } })
          ));

          // Objective
          var objOp = f >= 40 ? (f < 55 ? eo3(p(40, 55)) : 1) : 0;
          briefItems.push(e('div', { key: 'objective', style: { marginBottom: 14, opacity: objOp * briefOp } },
            e('div', { style: { color: C_TEXT, fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Objective'),
            e('div', { style: {
              color: C_TEXT_SEC, fontSize: 12, lineHeight: '1.7',
              paddingLeft: 10, borderLeft: '2px solid ' + C_CARD_BORDER
            }},
              'Research trending topics in AI and newsletter automation. Draft a 1,500-2,000 word article optimized for SEO with target keyword "AI newsletter automation". Include real-world examples, data points, and actionable insights.'
            )
          ));

          // Requirements
          var reqOp = f >= 55 ? (f < 70 ? eo3(p(55, 70)) : 1) : 0;
          briefItems.push(e('div', { key: 'requirements', style: { marginBottom: 14, opacity: reqOp * briefOp } },
            e('div', { style: { color: C_TEXT, fontSize: 12, fontWeight: 600, marginBottom: 6 } }, 'Requirements'),
            ['Minimum 5 credible source references', 'Include SEO meta title and description', 'H2/H3 heading structure for readability', 'Call-to-action for newsletter signup', 'Internal linking to 2 existing articles'].map(function(req, ri) {
              return e('div', { key: 'req-' + ri, style: {
                color: C_TEXT_SEC, fontSize: 11, lineHeight: '1.6', paddingLeft: 14,
                display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2
              }},
                e('span', { style: { color: C_TEXT_MUTED, fontSize: 8, marginTop: 4, flexShrink: 0 } }, '\u2022'),
                req
              );
            })
          ));

          // Deliverables as chips
          var delOp = f >= 70 ? (f < 85 ? eo3(p(70, 85)) : 1) : 0;
          briefItems.push(e('div', { key: 'deliverables', style: { marginBottom: 14, opacity: delOp * briefOp } },
            e('div', { style: { color: C_TEXT, fontSize: 12, fontWeight: 600, marginBottom: 6 } }, 'Deliverables'),
            e('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              ['article.md', 'meta.json', 'images/', 'references.bib'].map(function(file, fi) {
                return e('div', { key: 'file-' + fi, style: {
                  padding: '4px 10px', borderRadius: 6,
                  background: '#f3f4f6', border: '1px solid ' + C_CARD_BORDER,
                  color: C_TEXT_SEC, fontSize: 11, fontFamily: '"SF Mono", "Fira Code", monospace'
                }}, file);
              })
            )
          ));

          // HITL section with amber/warning styling
          var hitlOp = f >= 90 ? (f < 110 ? eo3(p(90, 110)) : 1) : 0;
          briefItems.push(e('div', { key: 'hitl', style: {
            marginBottom: 14, opacity: hitlOp * briefOp,
            padding: '12px 14px', borderRadius: 8,
            background: '#fffbeb', border: '1px solid #fde68a'
          }},
            e('div', { style: { color: STATUS_AMBER_TEXT, fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 } },
              '\u26a0\ufe0f Human Action Required'
            ),
            e('div', { style: { color: C_TEXT_SEC, fontSize: 11, lineHeight: '1.6', marginBottom: 8 } },
              'The content_curator agent needs the following before proceeding:'
            ),
            [
              { action: 'Approve topic selection', detail: '"How AI Newsletter Automation Saves 10hrs/Week"' },
              { action: 'Provide brand voice guidelines', detail: 'Tone, style preferences, and target audience details' },
              { action: 'Confirm publishing date', detail: 'Needed for scheduling social media promotion' }
            ].map(function(item, ii) {
              return e('div', { key: 'hitl-' + ii, style: {
                padding: '7px 10px', borderRadius: 6, marginBottom: 5,
                background: C_CARD, border: '1px solid ' + C_CARD_BORDER,
                display: 'flex', alignItems: 'flex-start', gap: 8
              }},
                e('div', { style: {
                  width: 16, height: 16, borderRadius: 4,
                  border: '1.5px solid #fbbf24',
                  flexShrink: 0, marginTop: 1
                }}),
                e('div', null,
                  e('div', { style: { color: C_TEXT, fontSize: 11, fontWeight: 600 } }, item.action),
                  e('div', { style: { color: C_TEXT_MUTED, fontSize: 10, marginTop: 1 } }, item.detail)
                )
              );
            })
          ));

          return e('div', { key: 'brief-content', style: {
            transform: 'translateY(' + briefScroll + 'px)',
            transition: 'transform 0.05s'
          }}, briefItems);
        })()
      )
    ));

    // Voiceover overlay - white glass with subtle shadow
    var vo1Op = f >= 5 ? (f < 20 ? eo3(p(5, 20)) : (f < 180 ? 1 : (f < 200 ? 1 - eo3(p(180, 200)) : 0))) : 0;
    if (vo1Op > 0) {
      children.push(e('div', { key: 'vo1', style: {
        position: 'absolute', bottom: 36, left: 0, width: W, textAlign: 'center',
        opacity: vo1Op * phase1Op, zIndex: 20
      }},
        e('div', { style: {
          display: 'inline-block', padding: '8px 20px', borderRadius: 8,
          background: 'rgba(255,255,255,0.95)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.06)'
        }},
          e('span', { style: { color: C_TEXT, fontSize: 14, fontWeight: 500 } },
            'Every task has an auto-generated mission brief guiding your AI workers'
          )
        )
      ));
    }
  }

  // ===== PHASE 2: Closing CTA (f200-450) =====
  if (f >= 190) {
    var closingBgOp = f < 220 ? eo3(p(190, 220)) : 1;

    // Light gradient background
    children.push(e('div', { key: 'closing-bg', style: {
      position: 'absolute', top: 0, left: 0, width: W, height: H,
      background: 'linear-gradient(165deg, #f0f4f8 0%, #e8ecf4 35%, #f8fafc 70%, #ffffff 100%)',
      opacity: closingBgOp, zIndex: 15
    }}));

    // Subtle grid dots
    if (closingBgOp > 0.5) {
      children.push(e('div', { key: 'closing-dots', style: {
        position: 'absolute', top: 0, left: 0, width: W, height: H,
        backgroundImage: 'radial-gradient(circle, rgba(70,92,224,0.06) 1px, transparent 1px)',
        backgroundSize: '36px 36px', opacity: closingBgOp * 0.3, zIndex: 16, pointerEvents: 'none'
      }}));
    }

    // Soft radial glow
    if (f >= 210) {
      var glowBreath = breathe(10, 0.04);
      children.push(e('div', { key: 'closing-glow', style: {
        position: 'absolute',
        left: W / 2 - 400, top: H * 0.25 - 200,
        width: 800, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(70,92,224,' + (0.06 + glowBreath * 0.03) + ') 0%, rgba(152,74,215,' + (0.03 + glowBreath * 0.02) + ') 40%, transparent 70%)',
        filter: 'blur(60px)', opacity: closingBgOp, zIndex: 16, pointerEvents: 'none'
      }}));
    }

    // FlowHunt Logo + "AI Factory"
    var logoOp = f >= 220 ? (f < 260 ? eo3(p(220, 260)) : 1) : 0;
    var logoScale = f >= 220 ? (f < 260 ? eob(p(220, 260)) : 1) : 0;
    if (logoOp > 0) {
      var logoFloat = logoScale >= 1 ? float(1, 3, 0.035) : 0;
      var logoGlow = logoScale >= 1 ? breathe(1, 0.05) : 0;

      // Pulse rings
      if (f >= 250) {
        var pulsePhase = ((f - 250) % 80) / 80;
        var pulseR = 50 + pulsePhase * 50;
        var pulseA = (1 - pulsePhase) * 0.08;
        children.push(e('div', { key: 'logo-pulse', style: {
          position: 'absolute', left: W / 2 - pulseR, top: H * 0.27 - pulseR + logoFloat,
          width: pulseR * 2, height: pulseR * 2, borderRadius: '50%',
          border: '1.5px solid rgba(70,92,224,' + pulseA + ')',
          zIndex: 17, pointerEvents: 'none'
        }}));
      }

      // Logo with gradient
      children.push(e('div', { key: 'closing-logo', style: {
        position: 'absolute', left: W / 2 - 45, top: H * 0.27 - 45 + logoFloat,
        width: 90, height: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: logoOp, transform: 'scale(' + logoScale + ')',
        filter: 'drop-shadow(0 0 ' + (10 + logoGlow * 6) + 'px rgba(70,92,224,' + (0.15 + logoGlow * 0.1) + '))',
        zIndex: 18
      }},
        e('svg', { width: 80, height: 65, viewBox: '0 0 20 16.2', fill: 'none' },
          e('defs', null,
            e('linearGradient', { id: 'fhg2', x1: '20', y1: '9.9', x2: '0', y2: '9.9',
              gradientTransform: 'translate(0 18) scale(1 -1)', gradientUnits: 'userSpaceOnUse' },
              e('stop', { offset: '0', stopColor: C_GR1 }),
              e('stop', { offset: '.5', stopColor: C_GR2 }),
              e('stop', { offset: '1', stopColor: C_GR3 })
            )
          ),
          e('path', {
            d: 'M2.6,12.7l-.9,2.1c-.2.4,0,.8.2,1.1.2.2.4.3.7.3s.5,0,.7-.3l.8-.8,3.2-3.2c.1-.1,0-.4-.2-.4h-1.8s0,0,0,0c-1.9,0-3.4-1.6-3.4-3.5,0-1.9,1.6-3.3,3.5-3.3h3.8c0,0,.1,0,.2,0l1.5-1.5c.1-.1,0-.4-.2-.4h-5.4C2.5,2.7,0,5.2,0,8.1c0,2,1.1,3.7,2.6,4.6h0ZM14.5,11.5c1.9,0,3.4-1.5,3.5-3.3,0-1.9-1.5-3.5-3.4-3.5s0,0,0,0h-1.8c-.2,0-.3-.3-.2-.4l3.3-3.3h0l.7-.7c.4-.4,1-.4,1.4,0,.3.3.4.8.3,1.1l-.9,2.1c1.6.9,2.6,2.6,2.6,4.6,0,3-2.5,5.4-5.5,5.4h-5.4c-.2,0-.3-.3-.2-.4l1.5-1.5s.1,0,.2,0h3.8,0ZM13.6,6.3c1,0,1.7.8,1.7,1.7s-.8,1.7-1.7,1.7-1.7-.8-1.7-1.7.8-1.7,1.7-1.7ZM6.5,6.3c1,0,1.7.8,1.7,1.7s-.8,1.7-1.7,1.7-1.7-.8-1.7-1.7.8-1.7,1.7-1.7Z',
            fill: 'url(#fhg2)'
          })
        )
      ));

      // "FlowHunt AI Factory" text
      var wordOp = f >= 250 ? (f < 280 ? eo3(p(250, 280)) : 1) : 0;
      if (wordOp > 0) {
        children.push(e('div', { key: 'closing-word', style: {
          position: 'absolute', left: 0, width: W,
          top: H * 0.27 + 60 + logoFloat, textAlign: 'center',
          opacity: wordOp, zIndex: 18
        }},
          // "FlowHunt" in dark text
          e('span', { style: {
            fontSize: 48, fontWeight: 800, letterSpacing: '-1px',
            color: C_TEXT
          }}, 'FlowHunt'),
          // "AI Factory" in gradient
          e('span', { style: {
            fontSize: 48, fontWeight: 800, letterSpacing: '-1px',
            background: 'linear-gradient(90deg, ' + C_GR1 + ', ' + C_GR2 + ', ' + C_GR3 + ')',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginLeft: 14
          }}, 'AI Factory')
        ));
      }
    }

    // Feature bullets - dark text on light bg
    var features = [
      { icon: '\u{1f4ac}', text: 'Natural language project creation' },
      { icon: '\u{1f916}', text: 'Auto-generated multi-agent teams' },
      { icon: '\u{1f4cb}', text: 'Real-time Kanban task tracking' },
      { icon: '\u{1f517}', text: 'Smart integration suggestions' }
    ];

    features.forEach(function(feat, fi) {
      var featStart = 270 + fi * 12;
      var featOp = f >= featStart ? (f < featStart + 18 ? eo3(p(featStart, featStart + 18)) : 1) : 0;
      var featX = f >= featStart ? (f < featStart + 18 ? -20 * (1 - eo3(p(featStart, featStart + 18))) : 0) : -20;

      if (featOp > 0) {
        children.push(e('div', { key: 'feat-' + fi, style: {
          position: 'absolute',
          left: W / 2 - 180, top: H * 0.55 + fi * 36,
          opacity: featOp, transform: 'translateX(' + featX + 'px)',
          display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 18
        }},
          e('span', { style: { fontSize: 16 } }, feat.icon),
          e('span', { style: { color: C_TEXT_SEC, fontSize: 16, fontWeight: 500 } }, feat.text)
        ));
      }
    });

    // CTA Button - gradient is fine for a button
    var ctaOp = f >= 330 ? (f < 365 ? eo3(p(330, 365)) : 1) : 0;
    var ctaScale = f >= 330 ? (f < 365 ? eob(p(330, 365)) : 1) : 0;
    if (ctaOp > 0) {
      var ctaBreath = ctaScale >= 1 ? breathe(20, 0.06) : 0;
      var ctaPulse = 1 + ctaBreath * 0.02;
      var ctaFloat = ctaScale >= 1 ? float(20, 2, 0.04) : 0;

      children.push(e('div', { key: 'cta', style: {
        position: 'absolute', left: W / 2 - 120, top: H * 0.78 + ctaFloat,
        width: 240, height: 50, borderRadius: 25,
        background: 'linear-gradient(135deg, ' + C_GR1 + ', ' + C_GR2 + ', ' + C_GR3 + ')',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: '0.3px',
        opacity: ctaOp, transform: 'scale(' + (ctaScale * ctaPulse) + ')',
        boxShadow: '0 4px ' + (16 + ctaBreath * 8) + 'px rgba(70,92,224,' + (0.25 + ctaBreath * 0.1) + ')',
        zIndex: 18
      }},
        'Try AI Factory Free',
        e('span', { style: { marginLeft: 8, fontSize: 15 } }, '\u2192')
      ));

      // Subtle pulse ring behind CTA
      if (ctaScale >= 1) {
        var ctaRingPhase = ((f - 365) % 70) / 70;
        var ctaRingR = 30 + ctaRingPhase * 40;
        var ctaRingA = (1 - ctaRingPhase) * 0.07;
        children.push(e('div', { key: 'cta-ring', style: {
          position: 'absolute',
          left: W / 2 - ctaRingR, top: H * 0.78 + 25 - ctaRingR + ctaFloat,
          width: ctaRingR * 2, height: ctaRingR * 2, borderRadius: '50%',
          border: '1px solid rgba(70,92,224,' + ctaRingA + ')',
          zIndex: 17, pointerEvents: 'none'
        }}));
      }
    }

    // URL
    var urlOp = f >= 360 ? (f < 390 ? eo3(p(360, 390)) : 1) : 0;
    if (urlOp > 0) {
      children.push(e('div', { key: 'url', style: {
        position: 'absolute', left: 0, width: W,
        top: H * 0.78 + 62, textAlign: 'center',
        opacity: urlOp * 0.5, zIndex: 18
      }},
        e('span', { style: { fontSize: 14, fontWeight: 500, color: C_TEXT_MUTED, letterSpacing: '1px' } }, 'flowhunt.io/ai-factory')
      ));
    }

    // Ambient particles (softer for light theme)
    if (f >= 210) {
      var partOp = f < 230 ? eo3(p(210, 230)) : 1;
      for (var pi = 0; pi < 16; pi++) {
        var pSeed = hash(pi + 700);
        var pSpeed = 0.1 + pSeed * 0.35;
        var pxBase = hash(pi + 800) * W;
        var pPhase = ((f - 210) * pSpeed + pSeed * 250) % 150;
        var pY = H + 15 - pPhase * (H + 40) / 150;
        var pFadeIn = Math.min(pPhase / 12, 1);
        var pFadeOut = Math.max(0, 1 - (pPhase - 120) / 30);
        var pAlpha = pFadeIn * pFadeOut * partOp * 0.2;
        var pSize = 2 + pSeed * 3;
        var pColor = [C_GR1, C_GR2, C_GR3, '#10b981', '#f59e0b'][pi % 5];
        if (pAlpha > 0.01) {
          var pWobble = Math.sin(pPhase * 0.07 + pSeed * 6.28) * 20;
          children.push(e('div', { key: 'cpt' + pi, style: {
            position: 'absolute', left: pxBase + pWobble, top: pY,
            width: pSize, height: pSize, borderRadius: '50%',
            background: pColor, opacity: pAlpha,
            zIndex: 19, pointerEvents: 'none'
          }}));
        }
      }
    }

    // Corner accents (lighter)
    if (f >= 260) {
      var cornerOp = f < 290 ? eo3(p(260, 290)) : 1;
      var cAlpha = cornerOp * 0.1;
      children.push(e('div', { key: 'ctL', style: { position: 'absolute', top: 50, left: 60, width: 50, height: 50, borderLeft: '1px solid rgba(70,92,224,' + cAlpha + ')', borderTop: '1px solid rgba(70,92,224,' + cAlpha + ')', zIndex: 17 } }));
      children.push(e('div', { key: 'ctR', style: { position: 'absolute', top: 50, right: 60, width: 50, height: 50, borderRight: '1px solid rgba(70,92,224,' + cAlpha + ')', borderTop: '1px solid rgba(70,92,224,' + cAlpha + ')', zIndex: 17 } }));
      children.push(e('div', { key: 'cbL', style: { position: 'absolute', bottom: 50, left: 60, width: 50, height: 50, borderLeft: '1px solid rgba(70,92,224,' + cAlpha + ')', borderBottom: '1px solid rgba(70,92,224,' + cAlpha + ')', zIndex: 17 } }));
      children.push(e('div', { key: 'cbR', style: { position: 'absolute', bottom: 50, right: 60, width: 50, height: 50, borderRight: '1px solid rgba(70,92,224,' + cAlpha + ')', borderBottom: '1px solid rgba(70,92,224,' + cAlpha + ')', zIndex: 17 } }));
    }

    // Burst sparkles on CTA appear (softer)
    if (f >= 340 && f < 390) {
      var burstO = f < 360 ? eo3(p(340, 360)) : 1 - eo3(p(360, 390));
      var burstColors = [C_GR1, C_GR2, C_GR3, '#10b981', '#f59e0b'];
      for (var bi = 0; bi < 8; bi++) {
        var bSeed = hash(bi + 900);
        var bAngle = (bi / 8) * Math.PI * 2 + bSeed * 0.5;
        var bDist = 15 + (f - 340) * (1.2 + bSeed * 1.8);
        var bx = W / 2 + Math.cos(bAngle) * bDist;
        var by = H * 0.78 + 25 + Math.sin(bAngle) * bDist * 0.5;
        var bSize = 2 + bSeed * 3;
        if (burstO > 0.01) {
          children.push(e('div', { key: 'bst' + bi, style: {
            position: 'absolute', left: bx - bSize / 2, top: by - bSize / 2,
            width: bSize, height: bSize, borderRadius: '50%',
            background: burstColors[bi % burstColors.length],
            opacity: burstO * 0.4,
            zIndex: 20, pointerEvents: 'none'
          }}));
        }
      }
    }
  }

  return e('div', { style: {
    position: 'relative', width: W, height: H, overflow: 'hidden',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: C_BG
  }}, children);
}
