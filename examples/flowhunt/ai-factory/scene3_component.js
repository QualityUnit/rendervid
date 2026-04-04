// Scene 3: Supervisor Chat & Cross-Agent Communication (20s = 600 frames @ 30fps)
// Shows the chat UI with typing, tool calls, cross-agent routing, rich responses, and notification feature
function AIFactoryChatScene(props) {
  var f = props.frame || 0;
  var W = props.layerSize.width;
  var H = props.layerSize.height;
  var e = React.createElement;

  // ===== EASING & HELPERS =====
  function eo3(t) { return 1 - Math.pow(1 - t, 3); }
  function eio2(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function p(s, n) { return cl((f - s) / (n - s), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // Smooth fade+slide helper: returns {opacity, translateY}
  function fadeSlide(s, dur, slideY) {
    slideY = slideY || 15;
    dur = dur || 25;
    var t = eo3(p(s, s + dur));
    return { opacity: t, y: slideY * (1 - t) };
  }
  // Smooth pulse for "Processing..." text
  function pulse(speed) {
    speed = speed || 0.06;
    return 0.6 + 0.4 * Math.sin(f * speed);
  }
  // Cursor blink (smooth sinusoidal)
  function cursorBlink() {
    return 0.3 + 0.7 * Math.sin(f * 0.2);
  }

  // ===== COLORS =====
  var C_BG = '#f0f4f8';
  var C_WHITE = '#ffffff';
  var C_INPUT_BG = '#f5f7fa';
  var C_TEXT = '#111827';
  var C_TEXT_GRAY = '#6b7280';
  var C_TEXT_MUTED = '#9ca3af';
  var C_BORDER = '#e5e7eb';
  var C_TOOL_BG = '#f9fafb';
  var C_BLUE = '#3b82f6';
  var C_BLUE_DARK = '#2563eb';
  var C_SIDEBAR_ICON_BG = '#1e293b';
  var C_SIDEBAR_NAV_BG = '#ffffff';
  var C_GREEN = '#22c55e';

  var children = [];

  // ===== TIMELINE (600 frames = 20 seconds) =====
  // f0-50:     Smooth fade in. Welcome state: centered "How can I help?" + textarea + 3 suggestion cards
  // f50-140:   User types "what are the latest blogs created" - SLOW over 90 frames
  // f140-165:  Send animation - message scales down, floats up as blue bubble. Welcome fades out over 25 frames
  // f165-210:  "Processing your request..." + 2 tool call rows (staggered 15 frames)
  // f210-250:  Tool calls fade out. AI text response fades in
  // f250-320:  Blog table slides up. 5 rows staggered by 8 frames. Key observations below
  // f320-350:  Pause. Breathing room
  // f350-430:  User types "ask team mate about how SEO is going" - 80 frames
  // f430-455:  Send animation
  // f455-510:  Agent routing visualization + tool call
  // f510-560:  SEO status text + 3 metric stat cards
  // f555-590:  Notification card slides in from right
  // f590-600:  Everything fades out

  // ===== FADE =====
  var fadeIn = eo3(p(0, 50));
  var fadeOut = f >= 590 ? 1 - eo3(p(590, 600)) : 1;
  var mainOp = fadeIn * fadeOut;

  // ===== BACKGROUND =====
  children.push(e('div', { key: 'bg', style: {
    position: 'absolute', top: 0, left: 0, width: W, height: H,
    background: C_BG, opacity: mainOp
  }}));

  // ===== SIDEBAR: Narrow icon strip (36px) =====
  var iconStripW = 36;
  var navPanelW = 170;
  var sidebarTotalW = iconStripW + navPanelW;

  // Icon strip
  children.push(e('div', { key: 'icon-strip', style: {
    position: 'absolute', top: 0, left: 0, width: iconStripW, height: H,
    background: C_SIDEBAR_ICON_BG, opacity: mainOp, zIndex: 12,
    display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 6
  }},
    // AI Factory icon (active, blue highlight)
    e('div', { style: {
      width: 28, height: 28, borderRadius: 6,
      background: C_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer'
    }},
      e('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' },
        e('path', { d: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
      )
    ),
    // AI Studio icon
    e('div', { style: { width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 } },
      e('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' },
        e('path', { d: 'M12 2a10 10 0 100 20 10 10 0 000-20z', stroke: '#94a3b8', strokeWidth: 2 })
      )
    ),
    // Photomatic icon
    e('div', { style: { width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 } },
      e('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' },
        e('path', { d: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z', stroke: '#94a3b8', strokeWidth: 2 }),
        e('circle', { cx: 12, cy: 13, r: 4, stroke: '#94a3b8', strokeWidth: 2 })
      )
    ),
    // Ads AI icon
    e('div', { style: { width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 } },
      e('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' },
        e('path', { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12', stroke: '#94a3b8', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
      )
    )
  ));

  // ===== SIDEBAR: Wider nav panel (170px) =====
  children.push(e('div', { key: 'nav-panel', style: {
    position: 'absolute', top: 0, left: iconStripW, width: navPanelW, height: H,
    background: C_SIDEBAR_NAV_BG, borderRight: '1px solid ' + C_BORDER,
    opacity: mainOp, zIndex: 11, display: 'flex', flexDirection: 'column'
  }},
    // FlowHunt logo + text
    e('div', { style: { padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 8 } },
      e('div', { style: {
        width: 22, height: 22, borderRadius: 5,
        background: 'linear-gradient(135deg, #984ad7, #465ce0, #0497dc)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }},
        e('svg', { width: 11, height: 9, viewBox: '0 0 20 16.2', fill: 'none' },
          e('path', { d: 'M2.6,12.7l-.9,2.1c-.2.4,0,.8.2,1.1.2.2.4.3.7.3s.5,0,.7-.3l.8-.8,3.2-3.2c.1-.1,0-.4-.2-.4h-1.8s0,0,0,0c-1.9,0-3.4-1.6-3.4-3.5,0-1.9,1.6-3.3,3.5-3.3h3.8c0,0,.1,0,.2,0l1.5-1.5c.1-.1,0-.4-.2-.4h-5.4C2.5,2.7,0,5.2,0,8.1c0,2,1.1,3.7,2.6,4.6h0ZM14.5,11.5c1.9,0,3.4-1.5,3.5-3.3,0-1.9-1.5-3.5-3.4-3.5s0,0,0,0h-1.8c-.2,0-.3-.3-.2-.4l3.3-3.3h0l.7-.7c.4-.4,1-.4,1.4,0,.3.3.4.8.3,1.1l-.9,2.1c1.6.9,2.6,2.6,2.6,4.6,0,3-2.5,5.4-5.5,5.4h-5.4c-.2,0-.3-.3-.2-.4l1.5-1.5s.1,0,.2,0h3.8,0ZM13.6,6.3c1,0,1.7.8,1.7,1.7s-.8,1.7-1.7,1.7-1.7-.8-1.7-1.7.8-1.7,1.7-1.7ZM6.5,6.3c1,0,1.7.8,1.7,1.7s-.8,1.7-1.7,1.7-1.7-.8-1.7-1.7.8-1.7,1.7-1.7Z', fill: '#fff' })
        )
      ),
      e('span', { style: { color: C_TEXT, fontSize: 13, fontWeight: 700 } }, 'FlowHunt')
    ),
    // "My Personal one" + email
    e('div', { style: { padding: '0 14px 8px', borderBottom: '1px solid ' + C_BORDER } },
      e('div', { style: { color: C_TEXT, fontSize: 11, fontWeight: 500 } }, 'My Personal one'),
      e('div', { style: { color: C_TEXT_MUTED, fontSize: 9, marginTop: 1 } }, 'user@example.com')
    ),
    // Back to projects
    e('div', { style: { padding: '10px 14px', borderBottom: '1px solid ' + C_BORDER } },
      e('div', { style: { color: C_BLUE, fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 } },
        '\u2190 Email Marketing'
      ),
      e('div', { style: { color: C_TEXT_MUTED, fontSize: 9, marginTop: 2 } }, 'Back to projects')
    ),
    // Nav items: Issues and Chat
    e('div', { style: { padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 1 } },
      e('div', { style: {
        padding: '6px 10px', borderRadius: 6, fontSize: 12, color: C_TEXT_GRAY,
        display: 'flex', alignItems: 'center', gap: 8
      }},
        e('span', { style: { fontSize: 12 } }, '\u2261'),
        'Issues'
      ),
      e('div', { style: {
        padding: '6px 10px', borderRadius: 6, fontSize: 12, color: C_TEXT, fontWeight: 600,
        background: '#f0f4f8',
        display: 'flex', alignItems: 'center', gap: 8
      }},
        e('span', { style: { fontSize: 12 } }, '\u25CB'),
        'Chat'
      )
    ),
    // RECENT CONVERSATIONS
    e('div', { style: { padding: '12px 14px 4px', color: C_TEXT_MUTED, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' } }, 'Recent Conversations'),
    e('div', { style: { padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 1 } },
      [
        { time: '16h ago', num: '2' },
        { time: '3h ago', num: '3' },
        { time: '16h ago', num: '1' }
      ].map(function(conv, ci) {
        return e('div', { key: 'conv-' + ci, style: {
          padding: '5px 10px', borderRadius: 5, fontSize: 10, color: C_TEXT_GRAY,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }},
          e('span', null, conv.time),
          e('span', { style: { color: C_TEXT_MUTED, fontSize: 9 } }, conv.num)
        );
      })
    ),
    // Spacer
    e('div', { style: { flex: 1 } }),
    // Bottom: avatar + name + enterprise
    e('div', { style: {
      padding: '10px 14px', borderTop: '1px solid ' + C_BORDER,
      display: 'flex', alignItems: 'center', gap: 8
    }},
      e('div', { style: {
        width: 24, height: 24, borderRadius: '50%', background: '#6366f1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 10, fontWeight: 600
      }}, 'N'),
      e('div', null,
        e('div', { style: { color: C_TEXT, fontSize: 10, fontWeight: 500 } }, 'Test'),
        e('div', { style: { color: C_TEXT_MUTED, fontSize: 8 } }, 'Enterprise 99908.64')
      )
    )
  ));

  // ===== CHAT AREA LAYOUT =====
  var chatAreaLeft = sidebarTotalW;
  var chatAreaW = W - sidebarTotalW;
  var headerH = 0; // no separate header bar, content starts at top
  var inputBarH = 72;
  var agentBadgeH = 36;
  var chatContentTop = headerH + 20; // start of scrollable content

  // Conversation mode starts after send animation completes
  var inConversation = f >= 155;

  // Smooth scroll offset for later content to keep things visible
  var scrollOffset = 0;
  if (f >= 350) {
    scrollOffset = lerp(0, -180, eo3(p(350, 400)));
  }
  if (f >= 455) {
    scrollOffset = lerp(-180, -260, eo3(p(455, 500)));
  }

  // ===== WELCOME STATE (f0 - f155): Centered "How can I help?" =====
  if (!inConversation) {
    var welcomeFadeOut = f >= 140 ? 1 - eo3(p(140, 165)) : 1;
    var welcomeOp = mainOp * welcomeFadeOut;
    var welcomeSlide = fadeSlide(0, 50, 20);

    // "How can I help?" heading
    children.push(e('div', { key: 'welcome-heading', style: {
      position: 'absolute', left: chatAreaLeft, top: 0, width: chatAreaW, height: H,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: welcomeOp, zIndex: 5, pointerEvents: 'none',
      transform: 'translateY(' + welcomeSlide.y + 'px)'
    }},
      e('div', { style: {
        color: C_TEXT, fontSize: 26, fontWeight: 700, marginBottom: 8, marginTop: -100,
        opacity: welcomeSlide.opacity
      }}, 'How can I help?'),
      e('div', { style: {
        color: C_TEXT_GRAY, fontSize: 13, textAlign: 'center', maxWidth: 400, lineHeight: '1.5', marginBottom: 28,
        opacity: welcomeSlide.opacity
      }}, 'Your AI-powered project assistant for Email Marketing. Ask anything about your project.'),

      // Large centered textarea
      e('div', { style: {
        width: Math.min(chatAreaW - 80, 520), minHeight: 80,
        background: C_INPUT_BG, borderRadius: 14, border: '1px solid ' + C_BORDER,
        padding: '14px 18px', position: 'relative', marginBottom: 20,
        opacity: welcomeSlide.opacity
      }},
        e('div', { style: { color: f >= 50 ? C_TEXT : C_TEXT_MUTED, fontSize: 14, lineHeight: '1.6', minHeight: 44 } },
          (function() {
            if (f >= 50 && f < 140) {
              var text = 'what are the latest blogs created';
              var progress = eo3(cl((f - 50) / 90, 0, 1));
              var chars = Math.floor(progress * text.length);
              return e('span', null,
                text.substring(0, chars),
                e('span', { style: { borderRight: '2px solid ' + C_BLUE, marginLeft: 1, opacity: cl(cursorBlink(), 0, 1) } }, '\u200B')
              );
            }
            if (f >= 140) {
              return e('span', null, 'what are the latest blogs created');
            }
            return 'Type your message here...';
          })()
        ),
        // Send button - glows blue when text is complete
        e('div', { style: {
          position: 'absolute', bottom: 10, right: 10,
          width: 32, height: 32, borderRadius: '50%',
          background: f >= 135 ? 'linear-gradient(135deg, ' + C_BLUE + ', ' + C_BLUE_DARK + ')' : '#e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: f >= 135 && f < 165 ? '0 0 12px rgba(59,130,246,0.5)' : 'none',
          transform: f >= 140 && f < 150 ? 'scale(' + lerp(1, 0.85, eo3(p(140, 145))) + ')' : 'scale(1)'
        }},
          e('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' },
            e('path', { d: 'M5 12h14M12 5l7 7-7 7', stroke: f >= 135 ? '#fff' : '#9ca3af', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
          )
        )
      ),

      // Suggestion cards (3 in a row) - visible from start, fade when typing begins
      e('div', { style: {
        display: 'flex', gap: 10, opacity: welcomeSlide.opacity * (f >= 50 ? lerp(1, 0, eo3(p(50, 75))) : 1),
        maxWidth: Math.min(chatAreaW - 80, 520)
      }},
        [
          { emoji: '\uD83E\uDD1D', text: 'What should we publish this week?' },
          { emoji: '\uD83D\uDD27', text: 'Are CI/CD failures blocking deployment?' },
          { emoji: '\uD83D\uDCC8', text: 'How to grow subscribers fast?' }
        ].map(function(card, ci) {
          var cardFs = fadeSlide(8 + ci * 8, 25, 15);
          return e('div', { key: 'sug-' + ci, style: {
            flex: 1, padding: '10px 12px', borderRadius: 10,
            border: '1px solid ' + C_BORDER, background: C_WHITE,
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: cardFs.opacity, cursor: 'pointer',
            transform: 'translateY(' + cardFs.y + 'px)'
          }},
            e('span', { style: { fontSize: 14, flexShrink: 0 } }, card.emoji),
            e('span', { style: { color: C_TEXT, fontSize: 11, flex: 1, lineHeight: '1.3' } }, card.text),
            e('span', { style: { color: C_TEXT_MUTED, fontSize: 12, flexShrink: 0 } }, '\u203A')
          );
        })
      )
    ));
  }

  // ===== FLYING MESSAGE ANIMATION (f140-165) =====
  if (f >= 140 && f < 170) {
    var flyT = eo3(p(140, 165));
    var flyScale = lerp(1, 0.85, eio2(cl(flyT * 2, 0, 1)));
    var flyOpacity = f >= 165 ? 1 - eo3(p(165, 170)) : flyT;
    // Fly from center to top-right of chat area
    var startX = chatAreaLeft + chatAreaW / 2 - 150;
    var startY = H / 2 - 40;
    var endX = chatAreaLeft + chatAreaW - 60 - 280;
    var endY = chatContentTop;
    var curX = lerp(startX, endX, flyT);
    var curY = lerp(startY, endY, flyT);

    children.push(e('div', { key: 'fly-msg', style: {
      position: 'absolute', left: curX, top: curY,
      padding: '10px 16px',
      borderRadius: '16px 16px 4px 16px',
      background: 'linear-gradient(135deg, ' + C_BLUE + ', ' + C_BLUE_DARK + ')',
      color: '#fff', fontSize: 14, maxWidth: 400,
      opacity: flyOpacity * mainOp,
      transform: 'scale(' + flyScale + ')',
      zIndex: 20, whiteSpace: 'nowrap'
    }}, 'what are the latest blogs created'));
  }

  // ===== CONVERSATION STATE (f155+) =====
  if (inConversation) {
    var convOp = mainOp * (f < 170 ? eo3(p(155, 170)) : 1);
    var msgPad = 28;
    var contentW = chatAreaW - msgPad * 2;

    // ===== EXPLICIT Y-POSITION TRACKING =====
    var nextY = chatContentTop;

    // --- User Message 1: blue bubble on right ---
    var msg1Fs = fadeSlide(155, 20, 15);
    var msg1H = 50;
    children.push(e('div', { key: 'msg1-user', style: {
      position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + scrollOffset,
      width: contentW, display: 'flex', justifyContent: 'flex-end',
      opacity: msg1Fs.opacity * convOp, zIndex: 8,
      transform: 'translateY(' + msg1Fs.y + 'px)'
    }},
      e('div', { style: {
        padding: '10px 16px',
        borderRadius: '16px 16px 4px 16px',
        background: 'linear-gradient(135deg, ' + C_BLUE + ', ' + C_BLUE_DARK + ')',
        color: '#fff', fontSize: 14, maxWidth: 400
      }}, 'what are the latest blogs created')
    ));
    nextY += msg1H + 20; // 70

    // --- Processing / Tool calls (f165-210) ---
    if (f >= 165) {
      var procFadeIn = eo3(p(165, 190));
      var procFadeOut = f >= 210 ? 1 - eo3(p(210, 230)) : 1;
      var procOp = convOp * procFadeIn * procFadeOut;

      // "Processing your request..." with pulsing sparkle
      children.push(e('div', { key: 'processing1', style: {
        position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + scrollOffset,
        opacity: procOp * cl(pulse(0.06), 0, 1), zIndex: 8,
        transform: 'translateY(' + (15 * (1 - procFadeIn)) + 'px)'
      }},
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          e('span', { style: { fontSize: 14, opacity: 0.5 + 0.5 * Math.sin(f * 0.15) } }, '\u2728'),
          e('span', { style: { color: C_TEXT_GRAY, fontSize: 13 } }, 'Processing your request...')
        )
      ));

      // Tool call cards (2 tools, staggered by 15 frames)
      var tools1 = [
        { name: 'search_and_load_tools', sub: 'search_and_load_tools', ms: 155 },
        { name: 'get_blog_posts', sub: 'get_blog_posts', ms: 234 }
      ];
      tools1.forEach(function(tool, ti) {
        var toolStart = 180 + ti * 15;
        var toolFadeIn = f >= toolStart ? eo3(p(toolStart, toolStart + 20)) : 0;
        var toolSlideX = 15 * (1 - toolFadeIn);
        var toolOp = toolFadeIn * procFadeOut * convOp;
        var elapsed = f >= toolStart ? Math.min(Math.floor((f - toolStart) * 6), tool.ms) : 0;

        children.push(e('div', { key: 'tool1-' + ti, style: {
          position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + 30 + ti * 52 + scrollOffset,
          width: contentW, opacity: toolOp, zIndex: 8,
          transform: 'translateX(' + (-toolSlideX) + 'px)'
        }},
          e('div', { style: {
            display: 'flex', alignItems: 'center', padding: '8px 14px',
            background: C_TOOL_BG, border: '1px solid ' + C_BORDER,
            borderRadius: 8, gap: 10
          }},
            e('span', { style: { fontSize: 13 } }, '\uD83D\uDD27'),
            e('div', { style: { flex: 1 } },
              e('div', { style: { color: C_TEXT, fontSize: 12, fontWeight: 600 } }, 'Using ' + tool.name),
              e('div', { style: { color: C_TEXT_GRAY, fontSize: 10, marginTop: 1 } }, tool.sub)
            ),
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              e('span', { style: { color: C_TEXT_MUTED, fontSize: 10 } }, elapsed + 'ms'),
              e('span', { style: { color: C_TEXT_MUTED, fontSize: 12 } }, '\u203A')
            )
          )
        ));
      });
    }

    // After processing/tools, advance Y for AI response
    // Processing label ~24px + 2 tools * 52px = 128px + gap
    if (f >= 210) {
      nextY += 10; // small gap since tools faded out
    }

    // --- AI Response 1: Text + Table (f210+) ---
    if (f >= 210) {
      var r1Fs = fadeSlide(210, 25, 15);
      var aiTextH = 24; // "Here's a summary..." single line

      children.push(e('div', { key: 'resp1-text', style: {
        position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + r1Fs.y + scrollOffset,
        width: contentW, opacity: r1Fs.opacity * convOp, zIndex: 8
      }},
        e('div', { style: { color: C_TEXT, fontSize: 13, lineHeight: '1.6' } },
          "Here's a summary of the 5 latest blog posts from the repository:"
        )
      ));
      nextY += aiTextH + 20; // 44 more
    }

    // --- Blog Table (f250+) ---
    if (f >= 250) {
      var tableFadeIn = fadeSlide(250, 25, 15);
      var tableH = 200;

      children.push(e('div', { key: 'resp1-table', style: {
        position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + tableFadeIn.y + scrollOffset,
        width: contentW, opacity: tableFadeIn.opacity * convOp, zIndex: 8
      }},
        e('div', { style: {
          borderRadius: 8, overflow: 'hidden', border: '1px solid ' + C_BORDER
        }},
          // Table header
          e('div', { style: {
            display: 'flex', background: '#f3f4f6', padding: '8px 12px',
            borderBottom: '1px solid ' + C_BORDER
          }},
            e('div', { style: { width: 30, color: C_TEXT, fontSize: 11, fontWeight: 600 } }, '#'),
            e('div', { style: { flex: 2.5, color: C_TEXT, fontSize: 11, fontWeight: 600 } }, 'Title'),
            e('div', { style: { flex: 1, color: C_TEXT, fontSize: 11, fontWeight: 600 } }, 'Date'),
            e('div', { style: { flex: 0.8, color: C_TEXT, fontSize: 11, fontWeight: 600 } }, 'Read Time'),
            e('div', { style: { flex: 1, color: C_TEXT, fontSize: 11, fontWeight: 600 } }, 'Tags')
          ),
          // Table rows (5 rows, staggered by 8 frames)
          [
            { n: '1', title: 'How AI Agents Transform SEO', date: 'Mar 28', time: '8 min', tags: 'AI, SEO' },
            { n: '2', title: 'Newsletter Automation Guide', date: 'Mar 25', time: '6 min', tags: 'Email' },
            { n: '3', title: 'Growth Analytics Deep Dive', date: 'Mar 22', time: '12 min', tags: 'Analytics' },
            { n: '4', title: 'Content Calendar Best Practices', date: 'Mar 20', time: '5 min', tags: 'Content' },
            { n: '5', title: 'Multi-Agent Workflow Patterns', date: 'Mar 18', time: '10 min', tags: 'AI, Agents' }
          ].map(function(row, ri) {
            var rowStart = 258 + ri * 8;
            var rowOp = f >= rowStart ? eo3(p(rowStart, rowStart + 20)) : 0;
            var rowSlideY = f >= rowStart ? 8 * (1 - eo3(p(rowStart, rowStart + 20))) : 8;
            return e('div', { key: 'row-' + ri, style: {
              display: 'flex', padding: '7px 12px',
              borderBottom: ri < 4 ? '1px solid ' + C_BORDER : 'none',
              background: C_WHITE, opacity: rowOp,
              transform: 'translateY(' + rowSlideY + 'px)'
            }},
              e('div', { style: { width: 30, color: C_TEXT_GRAY, fontSize: 12 } }, row.n),
              e('div', { style: { flex: 2.5, color: C_TEXT, fontSize: 12 } }, row.title),
              e('div', { style: { flex: 1, color: C_TEXT_GRAY, fontSize: 12 } }, row.date),
              e('div', { style: { flex: 0.8, color: C_TEXT_GRAY, fontSize: 12 } }, row.time),
              e('div', { style: { flex: 1 } },
                e('span', { style: {
                  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                  background: '#eff6ff', color: C_BLUE
                }}, row.tags)
              )
            );
          })
        )
      ));
      nextY += tableH + 20;

      // Key observations bullets (f300+)
      if (f >= 300) {
        var obsFs = fadeSlide(300, 25, 15);
        var obsH = 80;
        children.push(e('div', { key: 'resp1-obs', style: {
          position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + obsFs.y + scrollOffset,
          width: contentW, opacity: obsFs.opacity * convOp, zIndex: 8
        }},
          e('strong', { style: { color: C_TEXT, fontSize: 12 } }, 'Key observations:'),
          e('div', { style: { paddingLeft: 12, marginTop: 6, color: C_TEXT, fontSize: 11, lineHeight: '1.8' } },
            e('div', null, '\u2022 Content production is on track with 5 posts in the last 2 weeks'),
            e('div', null, '\u2022 AI and SEO topics are the most popular (highest read times)'),
            e('div', null, '\u2022 The latest post on AI agents has strong engagement metrics')
          )
        ));
        nextY += obsH + 25;
      }
    }

    // --- User Message 2: typing (f350-430), send (f430-455) ---
    if (f >= 430) {
      var msg2Text = 'ask team mate about how SEO is going';
      var msg2Fs = fadeSlide(430, 20, 15);
      var msg2H = 50;

      children.push(e('div', { key: 'msg2-user', style: {
        position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + scrollOffset,
        width: contentW, display: 'flex', justifyContent: 'flex-end',
        opacity: msg2Fs.opacity * convOp, zIndex: 8,
        transform: 'translateY(' + msg2Fs.y + 'px)'
      }},
        e('div', { style: {
          padding: '10px 16px',
          borderRadius: '16px 16px 4px 16px',
          background: 'linear-gradient(135deg, ' + C_BLUE + ', ' + C_BLUE_DARK + ')',
          color: '#fff', fontSize: 14, maxWidth: 420
        }}, msg2Text)
      ));
      nextY += msg2H + 20;
    }

    // --- Agent routing + tool call (f455+) ---
    if (f >= 455) {
      var route2FadeIn = eo3(p(455, 480));
      var route2FadeOut = f >= 500 ? 1 - eo3(p(500, 520)) : 1;
      var route2Op = convOp * route2FadeIn * route2FadeOut;

      // "Processing your request..." with pulse
      children.push(e('div', { key: 'processing2', style: {
        position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + scrollOffset,
        opacity: route2Op * cl(pulse(0.06), 0, 1), zIndex: 8,
        transform: 'translateY(' + (15 * (1 - route2FadeIn)) + 'px)'
      }},
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          e('span', { style: { fontSize: 14, opacity: 0.5 + 0.5 * Math.sin(f * 0.15) } }, '\u2728'),
          e('span', { style: { color: C_TEXT_GRAY, fontSize: 13 } }, 'Processing your request...')
        )
      ));

      // Agent routing visualization: newsletter_site_director -> growth_analytics_agent
      var routeVizStart = 462;
      if (f >= routeVizStart) {
        var routeVizFadeIn = eo3(p(routeVizStart, routeVizStart + 25));
        var routeVizOp = routeVizFadeIn * route2FadeOut * convOp;
        var dotProgress = cl((f - routeVizStart) / 30, 0, 1);

        children.push(e('div', { key: 'route-viz', style: {
          position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + 30 + scrollOffset,
          width: contentW, opacity: routeVizOp, zIndex: 8,
          transform: 'translateY(' + (15 * (1 - routeVizFadeIn)) + 'px)'
        }},
          e('div', { style: {
            display: 'flex', alignItems: 'center', gap: 0, padding: '10px 16px',
            background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 10
          }},
            // From badge
            e('div', { style: {
              padding: '4px 10px', borderRadius: 12, background: C_BLUE, color: '#fff',
              fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap'
            }}, 'newsletter_site_director'),
            // Animated connecting line with dots
            e('div', { style: {
              flex: 1, height: 2, margin: '0 8px', position: 'relative',
              background: '#bfdbfe', borderRadius: 1, overflow: 'hidden', minWidth: 40
            }},
              e('div', { style: {
                position: 'absolute', left: 0, top: -2, width: 6, height: 6, borderRadius: '50%',
                background: C_BLUE,
                transform: 'translateX(' + (dotProgress * 100) + '%)',
                boxShadow: '0 0 6px rgba(59,130,246,0.6)'
              }})
            ),
            // Arrow
            e('span', { style: { color: C_BLUE, fontSize: 14, margin: '0 4px' } }, '\u2192'),
            // To badge
            e('div', { style: {
              padding: '4px 10px', borderRadius: 12, background: C_BLUE, color: '#fff',
              fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
              opacity: cl(dotProgress * 2 - 0.5, 0, 1)
            }}, 'growth_analytics_agent')
          )
        ));
      }

      // Tool: ask_from_coworker
      var tcStart = 480;
      if (f >= tcStart) {
        var tcFadeIn = eo3(p(tcStart, tcStart + 25));
        var tcOp = tcFadeIn * route2FadeOut * convOp;
        children.push(e('div', { key: 'tool-coworker', style: {
          position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + 82 + scrollOffset,
          width: contentW, opacity: tcOp, zIndex: 8,
          transform: 'translateX(' + (-15 * (1 - tcFadeIn)) + 'px)'
        }},
          e('div', { style: {
            display: 'flex', alignItems: 'center', padding: '8px 14px',
            background: C_TOOL_BG, border: '1px solid ' + C_BORDER,
            borderRadius: 8, gap: 10
          }},
            e('span', { style: { fontSize: 13 } }, '\uD83D\uDD27'),
            e('div', { style: { flex: 1 } },
              e('div', { style: { color: C_TEXT, fontSize: 12, fontWeight: 600 } }, 'Using ask_from_coworker'),
              e('div', { style: { color: C_TEXT_GRAY, fontSize: 10, marginTop: 1 } }, 'ask_from_coworker')
            ),
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              e('span', { style: { color: C_TEXT_MUTED, fontSize: 10 } }, '320ms'),
              e('span', { style: { color: C_TEXT_MUTED, fontSize: 12 } }, '\u203A')
            )
          )
        ));
      }
    }

    // Advance past tools/routing for response 2
    if (f >= 510) {
      nextY += 140; // processing + route viz + tool
    }

    // --- AI Response 2: SEO Report (f510+) ---
    if (f >= 510) {
      var r2Fs = fadeSlide(510, 25, 15);
      var r2Op = r2Fs.opacity * convOp;

      children.push(e('div', { key: 'resp2', style: {
        position: 'absolute', left: chatAreaLeft + msgPad, top: nextY + r2Fs.y + scrollOffset,
        width: contentW - 30, opacity: r2Op, zIndex: 8
      }},
        // Header
        e('div', { style: { color: C_TEXT, fontSize: 13, lineHeight: '1.6', marginBottom: 14 } },
          e('strong', null, 'SEO Status Report'),
          ' from growth_analytics_agent:'
        ),

        // Metric stat cards (3 cards in a row)
        e('div', { style: { display: 'flex', gap: 10, marginBottom: 14 } },
          [
            { label: 'Impressions', value: '12,847', change: '+23%', color: '#16a34a' },
            { label: 'Clicks', value: '1,432', change: '+18%', color: '#16a34a' },
            { label: 'Avg Position', value: '14.2', change: '-3.1', color: '#16a34a' }
          ].map(function(stat, si) {
            var statStart = 522 + si * 12;
            var statOp = f >= statStart ? eo3(p(statStart, statStart + 20)) : 0;
            var statSlideY = f >= statStart ? 15 * (1 - eo3(p(statStart, statStart + 20))) : 15;
            return e('div', { key: 'stat-' + si, style: {
              flex: 1, padding: '12px 14px', borderRadius: 8,
              background: C_WHITE, border: '1px solid ' + C_BORDER,
              opacity: statOp, transform: 'translateY(' + statSlideY + 'px)'
            }},
              e('div', { style: { color: C_TEXT_GRAY, fontSize: 10, marginBottom: 4, fontWeight: 500 } }, stat.label),
              e('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
                e('span', { style: { color: C_TEXT, fontSize: 18, fontWeight: 700 } }, stat.value),
                e('span', { style: { color: stat.color, fontSize: 11, fontWeight: 600 } }, stat.change)
              )
            );
          })
        )
      ));
    }

    // ===== NOTIFICATION CARD (f555-590) =====
    if (f >= 555) {
      var notifSlideIn = eo3(p(555, 580));
      var notifFadeOut = f >= 590 ? 1 - eo3(p(590, 600)) : 1;
      var notifOp = notifSlideIn * notifFadeOut * convOp;
      var notifSlideX = 30 * (1 - notifSlideIn);
      var notifW = 260;

      children.push(e('div', { key: 'notification', style: {
        position: 'absolute', right: 16 + notifSlideX, top: 80,
        width: notifW, opacity: notifOp, zIndex: 20,
        background: C_WHITE, borderRadius: 12, border: '1px solid ' + C_BORDER,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(34,197,94,0.15)',
        padding: '16px', overflow: 'hidden'
      }},
        // Green accent bar at top
        e('div', { style: {
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, ' + C_GREEN + ', #4ade80)'
        }}),
        // Header: bell + FlowHunt + just now
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 2 } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            e('span', { style: { fontSize: 13 } }, '\uD83D\uDD14'),
            e('span', { style: { color: C_TEXT, fontSize: 12, fontWeight: 700 } }, 'FlowHunt')
          ),
          e('span', { style: { color: C_TEXT_MUTED, fontSize: 10 } }, 'just now')
        ),
        // Notification items
        e('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 } },
          e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8 } },
            e('span', { style: { fontSize: 12, flexShrink: 0 } }, '\u2705'),
            e('span', { style: { color: C_TEXT, fontSize: 11, lineHeight: '1.4' } }, '3 tasks completed in Newsletter Site')
          ),
          e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8 } },
            e('span', { style: { fontSize: 12, flexShrink: 0 } }, '\uD83D\uDCCA'),
            e('span', { style: { color: C_TEXT, fontSize: 11, lineHeight: '1.4' } }, 'SEO report ready for review')
          )
        ),
        // Action link
        e('div', { style: {
          color: C_BLUE, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          paddingTop: 8, borderTop: '1px solid ' + C_BORDER
        }}, 'Reply or view in app \u2192'),
        // Sub-label
        e('div', { style: {
          color: C_TEXT_MUTED, fontSize: 9, marginTop: 10, textAlign: 'center', lineHeight: '1.4'
        }}, 'Stay in the loop via Slack, iMessage, or email')
      ));
    }

    // --- Agent badge above input ---
    if (f >= 165) {
      var badge1Start = 165;
      var badge1FadeIn = eo3(p(badge1Start, badge1Start + 25));
      var badge1SlideY = 15 * (1 - badge1FadeIn);
      var glowIntensity = 0.15 + 0.1 * Math.sin(f * 0.06);

      children.push(e('div', { key: 'agent-badge', style: {
        position: 'absolute', left: chatAreaLeft, bottom: inputBarH + 8, width: chatAreaW,
        display: 'flex', justifyContent: 'center', gap: 8,
        zIndex: 12, pointerEvents: 'none',
        transform: 'translateY(' + badge1SlideY + 'px)'
      }},
        e('div', { style: {
          padding: '5px 12px', borderRadius: 16, background: C_BLUE,
          color: '#fff', fontSize: 11, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: badge1FadeIn * convOp,
          boxShadow: '0 0 ' + Math.round(glowIntensity * 20) + 'px rgba(59,130,246,' + glowIntensity + ')'
        }},
          e('span', { style: { width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' } }),
          'newsletter_site_director'
        )
      ));
    }
  }

  // ===== REPLY INPUT BAR (always visible at bottom in conversation mode) =====
  if (inConversation) {
    var inputFadeIn = eo3(p(155, 175));
    var inputOp = mainOp * inputFadeIn;

    // Determine what to show in the input
    var isTyping2 = f >= 350 && f < 430;
    var sendGlow2 = f >= 425 && f < 455;
    var sendScale2 = f >= 430 && f < 440 ? lerp(1, 0.85, eo3(p(430, 435))) : 1;

    children.push(e('div', { key: 'input-bar', style: {
      position: 'absolute', left: chatAreaLeft, bottom: 0, width: chatAreaW, height: inputBarH,
      background: C_WHITE, borderTop: '1px solid ' + C_BORDER,
      display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 10,
      opacity: inputOp, zIndex: 12
    }},
      // Textarea-style input (larger, rounded)
      e('div', { style: {
        flex: 1, minHeight: 48, padding: '12px 16px',
        borderRadius: 14, border: '1px solid ' + (isTyping2 ? C_BLUE : C_BORDER),
        background: C_WHITE, position: 'relative',
        display: 'flex', alignItems: 'flex-start',
        boxShadow: isTyping2 ? '0 0 0 2px rgba(59,130,246,0.15)' : 'none'
      }},
        e('span', { style: { color: isTyping2 ? C_TEXT : C_TEXT_MUTED, fontSize: 13, lineHeight: '1.5' } },
          (function() {
            if (isTyping2) {
              var text = 'ask team mate about how SEO is going';
              var progress = eo3(cl((f - 350) / 80, 0, 1));
              var chars = Math.floor(progress * text.length);
              return e('span', { style: { color: C_TEXT } },
                text.substring(0, chars),
                e('span', { style: { borderRight: '2px solid ' + C_BLUE, marginLeft: 1, opacity: cl(cursorBlink(), 0, 1) } }, '\u200B')
              );
            }
            return 'Reply...';
          })()
        ),
        // Small circular send button at bottom-right
        e('div', { style: {
          position: 'absolute', bottom: 8, right: 8,
          width: 30, height: 30, borderRadius: '50%',
          background: sendGlow2 ? 'linear-gradient(135deg, ' + C_BLUE + ', ' + C_BLUE_DARK + ')' : '#e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: sendGlow2 ? '0 0 10px rgba(59,130,246,0.4)' : 'none',
          transform: 'scale(' + sendScale2 + ')'
        }},
          e('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none' },
            e('path', { d: 'M5 12h14M12 5l7 7-7 7', stroke: sendGlow2 ? '#fff' : '#9ca3af', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
          )
        )
      )
    ));
  }

  // ===== VOICEOVER TEXT =====
  var vo1Op = f >= 20 ? (f < 45 ? eo3(p(20, 45)) : (f < 320 ? 1 : (f < 345 ? 1 - eo3(p(320, 345)) : 0))) : 0;
  vo1Op *= mainOp;
  if (vo1Op > 0) {
    children.push(e('div', { key: 'vo1', style: {
      position: 'absolute', bottom: 84, left: chatAreaLeft, width: chatAreaW, textAlign: 'center',
      opacity: vo1Op, zIndex: 20, pointerEvents: 'none'
    }},
      e('div', { style: {
        display: 'inline-block', padding: '6px 18px', borderRadius: 8,
        background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(59,130,246,0.25)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }},
        e('span', { style: { color: C_TEXT, fontSize: 13, fontWeight: 500 } },
          'Just ask \u2014 your Supervisor has full context of all agent activity'
        )
      )
    ));
  }

  var vo2Op = f >= 455 ? (f < 475 ? eo3(p(455, 475)) : (f < 570 ? 1 : (f < 590 ? 1 - eo3(p(570, 590)) : 0))) : 0;
  vo2Op *= mainOp;
  if (vo2Op > 0) {
    children.push(e('div', { key: 'vo2', style: {
      position: 'absolute', bottom: 84, left: chatAreaLeft, width: chatAreaW, textAlign: 'center',
      opacity: vo2Op, zIndex: 20, pointerEvents: 'none'
    }},
      e('div', { style: {
        display: 'inline-block', padding: '6px 18px', borderRadius: 8,
        background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(59,130,246,0.25)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }},
        e('span', { style: { color: C_TEXT, fontSize: 13, fontWeight: 500 } },
          'Agents talk to each other \u2014 cross-team queries happen automatically'
        )
      )
    ));
  }

  // ===== EXIT FADE =====
  if (f >= 590) {
    children.push(e('div', { key: 'fade-out', style: {
      position: 'absolute', top: 0, left: 0, width: W, height: H,
      background: C_BG, opacity: eo3(p(590, 600)), zIndex: 30
    }}));
  }

  return e('div', { style: {
    position: 'relative', width: W, height: H, overflow: 'hidden',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: C_BG
  }}, children);
}
