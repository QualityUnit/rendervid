// Scene 1: AI Factory Kanban — Supervisor Delegation Flow (15s = 450 frames @ 30fps)
// Tasks fade between columns (no sliding). Supervisor overlay. Mouse cursor clicks task. Task detail modal.
function AIFactoryKanbanScene(props) {
  var f = props.frame || 0;
  var W = props.layerSize.width;
  var H = props.layerSize.height;
  var e = React.createElement;

  // ===== EASING & HELPERS =====
  function eo3(t) { return 1 - Math.pow(1 - t, 3); }
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function p(s, n) { return cl((f - s) / (n - s), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(i) { return (((i * 2654435761) >>> 0) % 10000) / 10000; }
  function breathe(seed, speed) { return (Math.sin(f * (speed || 0.06) + (seed || 0) * 3.7) + 1) * 0.5; }
  function float(seed, amp, speed) { return Math.sin(f * (speed || 0.02) + (seed || 0) * 4.1) * (amp || 1); }

  // ===== COLORS =====
  var C_GR1 = '#984ad7';
  var C_GR2 = '#465ce0';
  var C_GR3 = '#0497dc';
  var C_BG = '#f0f4f8';
  var C_CARD = '#ffffff';
  var C_CARD_BORDER = '#e5e7eb';
  var C_TEXT = '#111827';
  var C_TEXT_DIM = '#6b7280';
  var C_TEXT_MUTED = '#9ca3af';
  var C_BLUE = '#3b82f6';

  // Agent tag colors
  var AGENT_COLORS = {
    'content_curator': { bg: '#ede9fe', text: '#8b5cf6', label: 'Content Curator' },
    'seo_specialist': { bg: '#d1fae5', text: '#10b981', label: 'SEO Specialist' },
    'growth_analytics': { bg: '#dbeafe', text: '#3b82f6', label: 'Growth Analytics' },
    'social_media': { bg: '#fef3c7', text: '#f59e0b', label: 'Social Media' },
    'site_director': { bg: '#fce7f3', text: '#ec4899', label: 'Site Director' }
  };

  // ===== 10 TASKS =====
  var TASKS = [
    { id: 0, emoji: '\u{1F4F0}', title: 'Draft weekly newsletter', desc: 'Write the main editorial content for this weeks newsletter edition covering latest updates...', agent: 'content_curator', date: 'Apr 4, 2026' },
    { id: 1, emoji: '\u{1F50D}', title: 'Keyword research Q2', desc: 'Analyze trending keywords and search volume data for Q2 content planning strategy...', agent: 'seo_specialist', date: 'Apr 4, 2026' },
    { id: 2, emoji: '\u{1F4CA}', title: 'Analyze open rates', desc: 'Deep dive into newsletter open rate trends across segments to identify optimization...', agent: 'growth_analytics', date: 'Apr 4, 2026' },
    { id: 3, emoji: '\u{1F426}', title: 'Schedule social posts', desc: 'Queue up promotional social media posts for the upcoming newsletter edition across channels...', agent: 'social_media', date: 'Apr 4, 2026' },
    { id: 4, emoji: '\u{1F3A8}', title: 'Design email template', desc: 'Create a responsive email template with updated branding and improved mobile layout...', agent: 'site_director', date: 'Apr 4, 2026' },
    { id: 5, emoji: '\u{270D}\u{FE0F}', title: 'Write subscriber welcome flow', desc: 'Build automated onboarding email sequence for new subscribers with personalization...', agent: 'content_curator', date: 'Apr 4, 2026' },
    { id: 6, emoji: '\u{1F4C8}', title: 'A/B test subject lines', desc: 'Set up and run A/B tests on subject lines to maximize open rates and engagement...', agent: 'growth_analytics', date: 'Apr 4, 2026' },
    { id: 7, emoji: '\u{1F517}', title: 'Fix broken signup form', desc: 'Debug and repair the newsletter signup form that is failing on mobile Safari browsers...', agent: 'site_director', date: 'Apr 3, 2026' },
    { id: 8, emoji: '\u{1F4DD}', title: 'Curate content roundup', desc: 'Gather and summarize the top 10 industry articles for the weekly content roundup section...', agent: 'content_curator', date: 'Apr 3, 2026' },
    { id: 9, emoji: '\u{1F680}', title: 'Launch referral program', desc: 'Implement and test the subscriber referral reward program with tracking integration...', agent: 'growth_analytics', date: 'Apr 3, 2026' }
  ];

  // ===== TASK STATE MACHINE (fade-based transitions) =====
  // Timeline:
  //   f90-210:  10 tasks fade into Open, one every 12 frames, 25-frame fade
  //   f200-290: Tasks 0-5 fade from Open → In Progress, staggered every 15 frames, 30-frame fade
  //   f280-370: Final moves (30-frame fades):
  //     Tasks 0,1,2 → Done (every 20 frames starting f280)
  //     Task 3      → Human Input (starts f320)
  //     Task 4      → Failed (starts f340)
  //     Task 5      stays In Progress
  //     Tasks 6-9   stay in Open
  // Final counts: Open 4, In Progress 1, Human Input 1, Done 3, Failed 1 = 10

  // Returns { column, fadeOutOp, fadeInOp } for rendering
  // column: where the card currently "is" (for counting/positioning)
  // We track transitions as pairs: fading out of source + fading in to dest
  function getTaskState(taskId) {
    var appearFrame = 90 + taskId * 12;
    var appearEnd = appearFrame + 25;

    // Not yet appeared
    if (f < appearFrame) return { phase: 'hidden' };

    // Fading into Open
    if (f < appearEnd) {
      var t = eo3(p(appearFrame, appearEnd));
      return { phase: 'appearing', column: 'open', opacity: t, slideY: lerp(8, 0, t) };
    }

    // Tasks 0-5 move to In Progress
    if (taskId <= 5) {
      var moveToIPStart = 200 + taskId * 15;
      var moveToIPEnd = moveToIPStart + 30;

      // Still in Open, before IP transition
      if (f < moveToIPStart) return { phase: 'settled', column: 'open', opacity: 1 };

      // Fading out of Open / fading into In Progress
      if (f < moveToIPEnd) {
        var t2 = eo3(p(moveToIPStart, moveToIPEnd));
        return { phase: 'transitioning', fromCol: 'open', toCol: 'in_progress', fadeOut: 1 - t2, fadeIn: t2 };
      }

      // Now in In Progress — check further transitions
      // Tasks 0,1,2 → Done
      if (taskId <= 2) {
        var moveToDoneStart = 280 + taskId * 20;
        var moveToDoneEnd = moveToDoneStart + 30;

        if (f < moveToDoneStart) return { phase: 'settled', column: 'in_progress', opacity: 1 };
        if (f < moveToDoneEnd) {
          var t3 = eo3(p(moveToDoneStart, moveToDoneEnd));
          return { phase: 'transitioning', fromCol: 'in_progress', toCol: 'done', fadeOut: 1 - t3, fadeIn: t3 };
        }
        return { phase: 'settled', column: 'done', opacity: 1 };
      }

      // Task 3 → Human Input
      if (taskId === 3) {
        var moveToHIStart = 320;
        var moveToHIEnd = 350;

        if (f < moveToHIStart) return { phase: 'settled', column: 'in_progress', opacity: 1 };
        if (f < moveToHIEnd) {
          var t4 = eo3(p(moveToHIStart, moveToHIEnd));
          return { phase: 'transitioning', fromCol: 'in_progress', toCol: 'human_input', fadeOut: 1 - t4, fadeIn: t4 };
        }
        return { phase: 'settled', column: 'human_input', opacity: 1 };
      }

      // Task 4 → Failed
      if (taskId === 4) {
        var moveToFailStart = 340;
        var moveToFailEnd = 370;

        if (f < moveToFailStart) return { phase: 'settled', column: 'in_progress', opacity: 1 };
        if (f < moveToFailEnd) {
          var t5 = eo3(p(moveToFailStart, moveToFailEnd));
          return { phase: 'transitioning', fromCol: 'in_progress', toCol: 'failed', fadeOut: 1 - t5, fadeIn: t5 };
        }
        return { phase: 'settled', column: 'failed', opacity: 1 };
      }

      // Task 5 stays In Progress
      return { phase: 'settled', column: 'in_progress', opacity: 1 };
    }

    // Tasks 6-9 stay in Open
    return { phase: 'settled', column: 'open', opacity: 1 };
  }

  // Count tasks visible in each column (for count badges)
  function countInColumn(colKey) {
    var count = 0;
    for (var i = 0; i < TASKS.length; i++) {
      var st = getTaskState(i);
      if (st.phase === 'settled' && st.column === colKey) count++;
      if (st.phase === 'appearing' && st.column === colKey) count++;
      if (st.phase === 'transitioning') {
        // Count in destination if more than halfway
        if (st.fadeIn > 0.5 && st.toCol === colKey) count++;
        if (st.fadeOut > 0.5 && st.fromCol === colKey) count++;
      }
    }
    return count;
  }

  // Column definitions
  var COLUMNS = [
    { key: 'open', label: 'Open', borderColor: '#22c55e', colIndex: 0 },
    { key: 'in_progress', label: 'In Progress', borderColor: '#f59e0b', colIndex: 1 },
    { key: 'human_input', label: 'Human Input Needed', borderColor: '#f97316', colIndex: 2 },
    { key: 'done', label: 'Done', borderColor: '#22c55e', colIndex: 3 },
    { key: 'failed', label: 'Failed', borderColor: '#ef4444', colIndex: 4 }
  ];

  var colKeyToIndex = { 'open': 0, 'in_progress': 1, 'human_input': 2, 'done': 3, 'failed': 4 };

  // Conversation list items
  var CONVERSATIONS = [
    { time: '16h ago', num: '2' },
    { time: '3h ago', num: '3' },
    { time: '16h ago', num: '1' }
  ];

  var children = [];

  // ===== GLOBAL EXIT FADE (f420-450) =====
  var exitOp = f >= 420 ? 1 - eo3(p(420, 450)) : 1;

  // ===== BACKGROUND (f0-40 fade in) =====
  var bgOp = f < 40 ? eo3(p(0, 40)) : 1;
  children.push(e('div', { key: 'bg', style: {
    position: 'absolute', top: 0, left: 0, width: W, height: H,
    background: C_BG, opacity: bgOp * exitOp
  }}));

  // ===== ICON STRIP (far left, 36px) =====
  var iconStripW = 36;
  var navPanelW = 170;
  var totalSidebarW = iconStripW + navPanelW;
  var sidebarOp = f < 40 ? eo3(p(5, 40)) : 1;
  var sidebarX = f < 40 ? -totalSidebarW + eo3(p(5, 40)) * totalSidebarW : 0;

  var iconStripIcons = [
    { label: 'AI Factory', active: true },
    { label: 'AI Studio', active: false },
    { label: 'Photomatic', active: false },
    { label: 'Ads AI', active: false }
  ];

  children.push(e('div', { key: 'icon-strip', style: {
    position: 'absolute', top: 0, left: sidebarX, width: iconStripW, height: H,
    background: '#ffffff', borderRight: '1px solid #f0f0f0',
    opacity: sidebarOp * exitOp, zIndex: 12,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    paddingTop: 10, gap: 4
  }},
    iconStripIcons.map(function(icon, i) {
      var isActive = icon.active;
      return e('div', { key: 'icon-' + i, style: {
        width: 32, height: 40, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        borderRadius: 6, cursor: 'pointer',
        background: isActive ? 'linear-gradient(135deg, ' + C_GR1 + ', ' + C_GR2 + ', ' + C_GR3 + ')' : 'transparent'
      }},
        e('div', { style: {
          width: 20, height: 20, borderRadius: 4,
          background: isActive ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }},
          e('div', { style: { width: 10, height: 10, borderRadius: 2, background: isActive ? '#fff' : '#9ca3af' } })
        ),
        e('div', { style: {
          fontSize: 5, fontWeight: 500, textAlign: 'center', lineHeight: '1.1',
          color: isActive ? '#fff' : '#9ca3af', whiteSpace: 'nowrap'
        }}, icon.label)
      );
    })
  ));

  // ===== NAV PANEL =====
  children.push(e('div', { key: 'nav-panel', style: {
    position: 'absolute', top: 0, left: sidebarX + iconStripW, width: navPanelW, height: H,
    background: '#ffffff', borderRight: '1px solid ' + C_CARD_BORDER,
    opacity: sidebarOp * exitOp, zIndex: 11,
    display: 'flex', flexDirection: 'column'
  }},
    // FlowHunt logo + name
    e('div', { key: 'logo-area', style: {
      padding: '14px 14px 10px 14px', display: 'flex', alignItems: 'center', gap: 8
    }},
      e('div', { key: 'logo-icon', style: {
        width: 26, height: 26, borderRadius: 6,
        background: 'linear-gradient(135deg, ' + C_GR1 + ', ' + C_GR2 + ', ' + C_GR3 + ')',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }},
        e('svg', { width: 14, height: 12, viewBox: '0 0 20 16.2', fill: 'none' },
          e('path', {
            d: 'M2.6,12.7l-.9,2.1c-.2.4,0,.8.2,1.1.2.2.4.3.7.3s.5,0,.7-.3l.8-.8,3.2-3.2c.1-.1,0-.4-.2-.4h-1.8s0,0,0,0c-1.9,0-3.4-1.6-3.4-3.5,0-1.9,1.6-3.3,3.5-3.3h3.8c0,0,.1,0,.2,0l1.5-1.5c.1-.1,0-.4-.2-.4h-5.4C2.5,2.7,0,5.2,0,8.1c0,2,1.1,3.7,2.6,4.6h0ZM14.5,11.5c1.9,0,3.4-1.5,3.5-3.3,0-1.9-1.5-3.5-3.4-3.5s0,0,0,0h-1.8c-.2,0-.3-.3-.2-.4l3.3-3.3h0l.7-.7c.4-.4,1-.4,1.4,0,.3.3.4.8.3,1.1l-.9,2.1c1.6.9,2.6,2.6,2.6,4.6,0,3-2.5,5.4-5.5,5.4h-5.4c-.2,0-.3-.3-.2-.4l1.5-1.5s.1,0,.2,0h3.8,0ZM13.6,6.3c1,0,1.7.8,1.7,1.7s-.8,1.7-1.7,1.7-1.7-.8-1.7-1.7.8-1.7,1.7-1.7ZM6.5,6.3c1,0,1.7.8,1.7,1.7s-.8,1.7-1.7,1.7-1.7-.8-1.7-1.7.8-1.7,1.7-1.7Z',
            fill: '#ffffff'
          })
        )
      ),
      e('span', { style: { color: C_TEXT, fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px' } }, 'FlowHunt')
    ),

    // Workspace name + email
    e('div', { key: 'workspace', style: { padding: '0 14px 10px 14px' } },
      e('div', { style: { fontSize: 11, fontWeight: 600, color: C_TEXT } }, 'My Personal one'),
      e('div', { style: { fontSize: 9, color: C_TEXT_MUTED, marginTop: 1 } }, 'test1@test.com')
    ),

    // Project back nav
    e('div', { key: 'project-back', style: {
      padding: '8px 14px', borderTop: '1px solid ' + C_CARD_BORDER, borderBottom: '1px solid ' + C_CARD_BORDER
    }},
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C_TEXT } },
        e('span', { style: { fontSize: 11 } }, '\u2190'),
        'Newsletter Site'
      ),
      e('div', { style: { fontSize: 9, color: C_TEXT_MUTED, marginTop: 2 } }, 'Back to projects')
    ),

    // Nav items: Issues and Chat
    e('div', { key: 'nav-items', style: { padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 } },
      e('div', { style: {
        padding: '5px 8px', fontSize: 12, fontWeight: 700, color: C_TEXT,
        display: 'flex', alignItems: 'center', gap: 6, borderRadius: 4
      }},
        e('span', { style: { fontSize: 11 } }, '\u2261'),
        'Issues'
      ),
      e('div', { style: {
        padding: '5px 8px', fontSize: 12, fontWeight: 400, color: C_TEXT_DIM,
        display: 'flex', alignItems: 'center', gap: 6, borderRadius: 4
      }},
        e('span', { style: { fontSize: 11 } }, '\u25CB'),
        'Chat'
      )
    ),

    // RECENT CONVERSATIONS
    e('div', { key: 'recent-label', style: {
      padding: '10px 14px 4px 14px', fontSize: 8, fontWeight: 600,
      color: C_TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.6px'
    }}, 'Recent Conversations'),

    e('div', { key: 'conversations', style: { padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 2 } },
      CONVERSATIONS.map(function(conv, i) {
        return e('div', { key: 'conv-' + i, style: {
          padding: '4px 8px', fontSize: 10, color: C_TEXT_DIM,
          display: 'flex', alignItems: 'center', gap: 6, borderRadius: 4
        }},
          e('div', { style: { width: 6, height: 6, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 } }),
          e('span', { style: { color: C_TEXT_MUTED, fontSize: 9 } }, conv.time),
          e('span', { style: { marginLeft: 'auto', fontSize: 9, color: C_TEXT_DIM } }, conv.num)
        );
      })
    ),

    // Spacer
    e('div', { key: 'spacer', style: { flex: 1 } }),

    // Bottom user area
    e('div', { key: 'user-area', style: {
      padding: '10px 14px', borderTop: '1px solid ' + C_CARD_BORDER,
      display: 'flex', alignItems: 'center', gap: 8
    }},
      e('div', { style: {
        width: 24, height: 24, borderRadius: '50%',
        background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 10, fontWeight: 600, flexShrink: 0
      }}, 'N'),
      e('div', { style: { flex: 1, minWidth: 0 } },
        e('div', { style: { fontSize: 10, fontWeight: 600, color: C_TEXT } }, 'Test'),
        e('div', { style: { fontSize: 8, color: C_TEXT_MUTED } }, 'Enterprise  99908.64')
      )
    )
  ));

  // ===== HEADER / TAB BAR =====
  var headerH = 50;
  var headerOp = f >= 10 ? (f < 40 ? eo3(p(10, 40)) : 1) : 0;
  var headerY = f < 40 ? -headerH + eo3(p(10, 40)) * headerH : 0;

  var tabItems = ['Issues', 'Agents', 'Settings'];

  children.push(e('div', { key: 'header', style: {
    position: 'absolute', top: headerY, left: totalSidebarW, right: 0, height: headerH,
    background: '#ffffff', borderBottom: '1px solid ' + C_CARD_BORDER,
    opacity: headerOp * exitOp, zIndex: 15, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 20px'
  }},
    // Tab bar (left)
    e('div', { style: { display: 'flex', gap: 0, height: '100%' } },
      tabItems.map(function(tab, i) {
        var isActive = i === 0;
        return e('div', { key: 'tab-' + i, style: {
          padding: '0 14px', display: 'flex', alignItems: 'center',
          borderBottom: isActive ? '2px solid ' + C_BLUE : '2px solid transparent',
          color: isActive ? C_BLUE : C_TEXT_MUTED,
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          marginBottom: -1
        }}, tab);
      })
    ),
    // Toolbar (right)
    e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      e('div', { style: {
        padding: '5px 10px', borderRadius: 6, border: '1px solid ' + C_CARD_BORDER,
        color: C_TEXT_MUTED, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
        background: '#fff'
      }},
        e('span', { style: { fontSize: 11, color: C_TEXT_MUTED } }, '\u{1F50D}'),
        'Search issues...'
      ),
      e('div', { style: {
        padding: '5px 10px', borderRadius: 6, border: '1px solid ' + C_CARD_BORDER,
        color: C_TEXT_DIM, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
        background: '#fff'
      }},
        'All statuses',
        e('span', { style: { fontSize: 8, marginLeft: 2 } }, '\u25BC')
      ),
      e('div', { style: {
        display: 'flex', borderRadius: 6, border: '1px solid ' + C_CARD_BORDER, overflow: 'hidden'
      }},
        e('div', { style: {
          padding: '5px 10px', fontSize: 11, fontWeight: 600,
          background: C_BLUE, color: '#fff'
        }}, 'Board'),
        e('div', { style: {
          padding: '5px 10px', fontSize: 11,
          background: '#fff', color: C_TEXT_DIM
        }}, 'List')
      ),
      e('div', { style: {
        padding: '5px 14px', borderRadius: 6,
        background: C_BLUE, color: '#fff', fontSize: 11, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 4
      }},
        '+', ' New Issue'
      )
    )
  ));

  // ===== KANBAN LAYOUT =====
  var contentLeft = totalSidebarW + 16;
  var contentTop = headerH + 14;
  var contentW = W - totalSidebarW - 32;
  var colGap = 10;
  var numCols = 5;
  var colW = (contentW - colGap * (numCols - 1)) / numCols;

  function colX(ci) {
    return contentLeft + ci * (colW + colGap);
  }

  var cardH = 68;
  var cardGap = 7;
  var cardPad = 6;
  var colHeaderH = 35;

  function cardYInColumn(slot) {
    return contentTop + colHeaderH + cardPad + slot * (cardH + cardGap);
  }

  // ===== COLUMN HEADERS + BODIES =====
  var kanbanFadeIn = f < 40 ? eo3(p(0, 40)) : 1;

  COLUMNS.forEach(function(col, ci) {
    var colOp = kanbanFadeIn * exitOp;
    if (colOp <= 0) return;

    var currentCount = countInColumn(col.key);

    // Column header
    children.push(e('div', { key: 'colh-' + ci, style: {
      position: 'absolute',
      left: colX(ci), top: contentTop, width: colW,
      background: '#ffffff',
      borderTop: '3px solid ' + col.borderColor,
      borderRadius: '6px 6px 0 0',
      padding: '8px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderLeft: '1px solid ' + C_CARD_BORDER,
      borderRight: '1px solid ' + C_CARD_BORDER,
      opacity: colOp, zIndex: 5
    }},
      e('span', { style: { color: C_TEXT, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, col.label),
      e('span', { style: {
        background: '#f3f4f6', color: C_TEXT_DIM, fontSize: 9, fontWeight: 500,
        padding: '1px 5px', borderRadius: 10, marginLeft: 4, flexShrink: 0
      }}, String(currentCount))
    ));

    // Column body background
    var colBodyTop = contentTop + colHeaderH;
    var colBodyH = H - colBodyTop - 16;
    children.push(e('div', { key: 'colbg-' + ci, style: {
      position: 'absolute',
      left: colX(ci), top: colBodyTop, width: colW, height: colBodyH,
      background: '#f9fafb',
      borderLeft: '1px solid ' + C_CARD_BORDER,
      borderRight: '1px solid ' + C_CARD_BORDER,
      borderBottom: '1px solid ' + C_CARD_BORDER,
      borderRadius: '0 0 6px 6px',
      opacity: colOp, zIndex: 4
    }}));
  });

  // ===== SUPERVISOR OVERLAY (f40-190) =====
  var supVisible = f >= 40 && f < 190;
  if (supVisible) {
    var supFadeIn = f < 70 ? eo3(p(40, 70)) : 1;
    var supFadeOut = f >= 150 ? 1 - eo3(p(150, 190)) : 1;
    var supOp = supFadeIn * supFadeOut * exitOp;

    // Frosted glass backdrop
    var overlayW = 280;
    var overlayH = 120;
    var overlayCX = contentLeft + contentW / 2;
    var overlayCY = contentTop + (H - contentTop) / 2 - 20;

    children.push(e('div', { key: 'sup-backdrop', style: {
      position: 'absolute',
      left: overlayCX - overlayW / 2,
      top: overlayCY - overlayH / 2,
      width: overlayW, height: overlayH,
      borderRadius: 16,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 0 ' + (16 + breathe(0, 0.08) * 12) + 'px rgba(139,92,246,0.15)',
      opacity: supOp, zIndex: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8
    }},
      // FlowHunt gradient logo (large)
      e('div', { style: {
        width: 60, height: 60, borderRadius: 14,
        background: 'linear-gradient(135deg, ' + C_GR1 + ', ' + C_GR2 + ', ' + C_GR3 + ')',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(139,92,246,0.3), 0 0 ' + (10 + breathe(1, 0.06) * 8) + 'px rgba(70,92,224,0.2)',
        transform: 'scale(' + (1 + breathe(0, 0.06) * 0.03) + ')'
      }},
        e('svg', { width: 32, height: 28, viewBox: '0 0 20 16.2', fill: 'none' },
          e('path', {
            d: 'M2.6,12.7l-.9,2.1c-.2.4,0,.8.2,1.1.2.2.4.3.7.3s.5,0,.7-.3l.8-.8,3.2-3.2c.1-.1,0-.4-.2-.4h-1.8s0,0,0,0c-1.9,0-3.4-1.6-3.4-3.5,0-1.9,1.6-3.3,3.5-3.3h3.8c0,0,.1,0,.2,0l1.5-1.5c.1-.1,0-.4-.2-.4h-5.4C2.5,2.7,0,5.2,0,8.1c0,2,1.1,3.7,2.6,4.6h0ZM14.5,11.5c1.9,0,3.4-1.5,3.5-3.3,0-1.9-1.5-3.5-3.4-3.5s0,0,0,0h-1.8c-.2,0-.3-.3-.2-.4l3.3-3.3h0l.7-.7c.4-.4,1-.4,1.4,0,.3.3.4.8.3,1.1l-.9,2.1c1.6.9,2.6,2.6,2.6,4.6,0,3-2.5,5.4-5.5,5.4h-5.4c-.2,0-.3-.3-.2-.4l1.5-1.5s.1,0,.2,0h3.8,0ZM13.6,6.3c1,0,1.7.8,1.7,1.7s-.8,1.7-1.7,1.7-1.7-.8-1.7-1.7.8-1.7,1.7-1.7ZM6.5,6.3c1,0,1.7.8,1.7,1.7s-.8,1.7-1.7,1.7-1.7-.8-1.7-1.7.8-1.7,1.7-1.7Z',
            fill: '#ffffff'
          })
        )
      ),
      // Title
      e('div', { style: { color: C_TEXT, fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' } }, 'Project Supervisor'),
      // Subtitle
      e('div', { style: { color: C_TEXT_DIM, fontSize: 14, fontWeight: 400 } }, 'Delegating 10 tasks to your AI team...')
    ));
  }

  // ===== RENDER TASK CARDS =====
  // Build slot indices per column for positioning
  function getSlotInColumn(taskId, colKey) {
    var slot = 0;
    for (var i = 0; i < taskId; i++) {
      var st = getTaskState(i);
      if (st.phase === 'settled' && st.column === colKey) slot++;
      if (st.phase === 'appearing' && st.column === colKey) slot++;
      if (st.phase === 'transitioning') {
        if (st.toCol === colKey && st.fadeIn >= 0.01) slot++;
        else if (st.fromCol === colKey && st.fadeOut >= 0.01) slot++;
      }
    }
    return slot;
  }

  // Render a single card element
  function renderCard(task, x, y, opacity, extraStyle, keyExtra) {
    var agentInfo = AGENT_COLORS[task.agent] || { bg: '#f3f4f6', text: '#6b7280', label: task.agent };
    var floatY = opacity >= 0.95 ? float(task.id, 0.5, 0.02) : 0;
    var style = {
      position: 'absolute',
      left: x + 3, top: y + floatY, width: colW - 6, height: cardH,
      padding: '7px 9px',
      borderRadius: 6,
      background: C_CARD, border: '1px solid ' + C_CARD_BORDER,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      opacity: opacity * exitOp,
      zIndex: 8,
      overflow: 'hidden'
    };
    if (extraStyle) {
      for (var k in extraStyle) style[k] = extraStyle[k];
    }
    return e('div', { key: 'task-' + task.id + (keyExtra || ''), style: style },
      // Title row
      e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 3 } },
        e('span', { style: { fontSize: 10, lineHeight: '1.3' } }, task.emoji),
        e('span', { style: { color: C_TEXT, fontSize: 9, fontWeight: 600, lineHeight: '1.3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, task.title)
      ),
      // Description
      e('div', { style: {
        color: C_TEXT_DIM, fontSize: 7, lineHeight: '1.35', marginBottom: 4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}, task.desc),
      // Agent tag + date row
      e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        e('span', { style: {
          padding: '1px 5px', borderRadius: 4, fontSize: 7, fontWeight: 600,
          background: agentInfo.bg, color: agentInfo.text
        }}, agentInfo.label),
        e('span', { style: { color: C_TEXT_MUTED, fontSize: 6 } }, task.date)
      )
    );
  }

  // Render all task cards
  for (var ti = 0; ti < TASKS.length; ti++) {
    var st = getTaskState(ti);

    if (st.phase === 'hidden') continue;

    if (st.phase === 'appearing') {
      var ci = colKeyToIndex[st.column];
      var slot = getSlotInColumn(ti, st.column);
      var cx = colX(ci);
      var cy = cardYInColumn(slot);
      children.push(renderCard(TASKS[ti], cx, cy + st.slideY, st.opacity, {}, ''));
    }

    if (st.phase === 'settled') {
      var ci2 = colKeyToIndex[st.column];
      var slot2 = getSlotInColumn(ti, st.column);
      var cx2 = colX(ci2);
      var cy2 = cardYInColumn(slot2);
      var extra = {};
      if (st.column === 'done') extra.borderLeft = '3px solid #22c55e';
      if (st.column === 'human_input') extra.borderLeft = '3px solid #f97316';
      if (st.column === 'failed') extra.borderLeft = '3px solid #ef4444';

      // Highlight for task 5 when cursor clicks
      if (ti === 5 && f >= 370) {
        extra.border = '2px solid ' + C_BLUE;
        extra.boxShadow = '0 0 8px rgba(59,130,246,0.25)';
      }

      children.push(renderCard(TASKS[ti], cx2, cy2, st.opacity, extra, ''));
    }

    if (st.phase === 'transitioning') {
      // Fade-out ghost in source column
      if (st.fadeOut > 0.01) {
        var fromCI = colKeyToIndex[st.fromCol];
        var fromSlot = getSlotInColumn(ti, st.fromCol);
        var fromX = colX(fromCI);
        var fromY = cardYInColumn(fromSlot);
        var fromExtra = {};
        if (st.fromCol === 'done') fromExtra.borderLeft = '3px solid #22c55e';
        if (st.fromCol === 'human_input') fromExtra.borderLeft = '3px solid #f97316';
        if (st.fromCol === 'failed') fromExtra.borderLeft = '3px solid #ef4444';
        children.push(renderCard(TASKS[ti], fromX, fromY, st.fadeOut, fromExtra, '-fo'));
      }

      // Fade-in ghost in destination column
      if (st.fadeIn > 0.01) {
        var toCI = colKeyToIndex[st.toCol];
        var toSlot = getSlotInColumn(ti, st.toCol);
        var toX = colX(toCI);
        var toY = cardYInColumn(toSlot);
        var toExtra = {};
        if (st.toCol === 'done') toExtra.borderLeft = '3px solid #22c55e';
        if (st.toCol === 'human_input') toExtra.borderLeft = '3px solid #f97316';
        if (st.toCol === 'failed') toExtra.borderLeft = '3px solid #ef4444';
        children.push(renderCard(TASKS[ti], toX, toY, st.fadeIn, toExtra, '-fi'));
      }
    }
  }

  // ===== MOUSE CURSOR (f340-420) =====
  if (f >= 340 && f < 420) {
    // Task 5 is in In Progress column, slot 0 (only one staying there)
    var task5CI = colKeyToIndex['in_progress'];
    var task5Slot = getSlotInColumn(5, 'in_progress');
    var task5CX = colX(task5CI) + colW / 2;
    var task5CY = cardYInColumn(task5Slot) + cardH / 2;

    // Cursor start position (from right)
    var cursorStartX = W - 40;
    var cursorStartY = H / 2;

    // Glide to target (f340-365)
    var glideT = eo3(p(340, 365));
    var cursorX = lerp(cursorStartX, task5CX + 10, glideT);
    var cursorY = lerp(cursorStartY, task5CY + 5, glideT);

    // Click animation at ~f370 (scale dip)
    var clickScale = 1;
    if (f >= 368 && f < 375) {
      var clickT = p(368, 371);
      var clickReturn = p(371, 375);
      if (f < 371) clickScale = lerp(1, 0.8, clickT);
      else clickScale = lerp(0.8, 1, clickReturn);
    }

    var cursorOp = exitOp;
    // Fade cursor out after modal appears
    if (f >= 400) cursorOp = (1 - eo3(p(400, 415))) * exitOp;

    children.push(e('div', { key: 'cursor', style: {
      position: 'absolute',
      left: cursorX, top: cursorY,
      width: 14, height: 20,
      zIndex: 30,
      opacity: cursorOp,
      transform: 'scale(' + clickScale + ')',
      transformOrigin: 'top left',
      pointerEvents: 'none'
    }},
      // Cursor arrow using SVG
      e('svg', { width: 14, height: 20, viewBox: '0 0 14 20', fill: 'none' },
        e('path', {
          d: 'M1 1L1 15L4.5 11.5L7.5 18L10 17L7 10.5L12 10.5L1 1Z',
          fill: '#ffffff',
          stroke: '#1f2937',
          strokeWidth: 1.2,
          strokeLinejoin: 'round'
        })
      )
    ));
  }

  // ===== TASK DETAIL RIGHT PANEL (f375-420) =====
  if (f >= 375) {
    var panelSlide = eo3(p(375, 405));
    var panelOp = panelSlide * exitOp;
    var panelW = 520;
    var panelX = W - panelW * panelSlide; // slides in from right edge

    var task5 = TASKS[5];
    var task5Agent = AGENT_COLORS[task5.agent];

    children.push(e('div', { key: 'detail-panel', style: {
      position: 'absolute',
      left: panelX, top: headerH,
      width: panelW, height: H - headerH,
      background: '#ffffff',
      borderLeft: '1px solid ' + C_CARD_BORDER,
      boxShadow: '-8px 0 30px rgba(0,0,0,0.08)',
      opacity: panelOp, zIndex: 26,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column'
    }},
      // ---- Panel Header: Title + Close ----
      e('div', { style: {
        padding: '18px 20px 14px', borderBottom: '1px solid ' + C_CARD_BORDER
      }},
        // Close X button (top right)
        e('div', { style: {
          position: 'absolute', top: 14, right: 16,
          width: 26, height: 26, borderRadius: 6, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: C_TEXT_MUTED, fontSize: 16, cursor: 'pointer',
          border: '1px solid ' + C_CARD_BORDER, background: '#fff'
        }}, '\u00D7'),
        // Title
        e('div', { style: { fontSize: 16, fontWeight: 700, color: C_TEXT, marginBottom: 8, paddingRight: 40 } },
          task5.emoji + ' ' + task5.title
        ),
        // Badge row: status + date + tag
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
          // In Progress badge
          e('span', { style: {
            padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
            background: '#dbeafe', color: '#2563eb',
            display: 'flex', alignItems: 'center', gap: 4
          }},
            e('span', { style: { width: 6, height: 6, borderRadius: '50%', background: '#2563eb' } }),
            'In Progress'
          ),
          e('span', { style: { fontSize: 11, color: C_TEXT_MUTED } }, 'Apr 4, 2026'),
          // Enhancement tag
          e('span', { style: {
            padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500,
            background: '#d1fae5', color: '#059669'
          }}, 'Enhancement')
        )
      ),

      // ---- Scrollable body ----
      e('div', { style: { flex: 1, overflowY: 'auto', padding: '0' } },

        // Status / Type / Last Run row
        e('div', { style: { padding: '14px 20px', borderBottom: '1px solid ' + C_CARD_BORDER, display: 'flex', gap: 40 } },
          e('div', null,
            e('div', { style: { fontSize: 10, color: C_TEXT_MUTED, fontWeight: 600, marginBottom: 4 } }, 'Status'),
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
              e('div', { style: { width: 7, height: 7, borderRadius: '50%', background: '#3b82f6' } }),
              e('span', { style: { fontSize: 12, fontWeight: 500, color: C_TEXT } }, 'In Progress')
            )
          ),
          e('div', null,
            e('div', { style: { fontSize: 10, color: C_TEXT_MUTED, fontWeight: 600, marginBottom: 4 } }, 'Type'),
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
              e('div', { style: { width: 7, height: 7, borderRadius: '50%', border: '1.5px solid ' + C_TEXT_MUTED } }),
              e('span', { style: { fontSize: 12, fontWeight: 500, color: C_TEXT } }, 'Normal')
            )
          ),
          e('div', null,
            e('div', { style: { fontSize: 10, color: C_TEXT_MUTED, fontWeight: 600, marginBottom: 4 } }, 'Last Run'),
            e('span', { style: { fontSize: 12, color: C_TEXT } }, '4/4/2026, 10:36 AM')
          )
        ),

        // Description section
        e('div', { style: { padding: '14px 20px', borderBottom: '1px solid ' + C_CARD_BORDER } },
          e('div', { style: { fontSize: 12, fontWeight: 700, color: C_TEXT, marginBottom: 8 } }, 'Description'),
          e('div', { style: { fontSize: 12, color: C_TEXT_DIM, lineHeight: '1.65' } },
            'Content Curator should build an automated onboarding email sequence for new subscribers. Include a welcome message, getting started guide, and feature highlights across a 5-email drip campaign with personalization tokens.'
          )
        ),

        // Activity section
        e('div', { style: { padding: '14px 20px' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 } },
            e('span', { style: { fontSize: 12, fontWeight: 700, color: C_TEXT } }, 'Activity'),
            e('span', { style: { fontSize: 10, color: C_TEXT_MUTED, background: '#f3f4f6', padding: '1px 6px', borderRadius: 8 } }, '3')
          ),

          // Activity timeline
          e('div', { style: { position: 'relative', paddingLeft: 28 } },
            // Timeline line
            e('div', { style: { position: 'absolute', left: 11, top: 4, width: 1.5, height: 'calc(100% - 8px)', background: '#e5e7eb' } }),

            // Activity entry 1: assigned
            e('div', { style: { marginBottom: 16, position: 'relative' } },
              // Dot on timeline
              e('div', { style: { position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%', background: task5Agent.bg, border: '2px solid ' + task5Agent.text } }),
              e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                e('span', { style: { fontSize: 11, fontWeight: 600, color: C_TEXT } }, 'content_curator'),
                e('span', { style: { fontSize: 9, color: C_TEXT_MUTED } }, 'Apr 4, 12:38 PM')
              ),
              e('div', { style: { fontSize: 11, color: C_TEXT_DIM } }, 'Task assigned to content_curator')
            ),

            // Activity entry 2: agent working
            e('div', { style: { marginBottom: 16, position: 'relative' } },
              e('div', { style: { position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%', background: task5Agent.bg, border: '2px solid ' + task5Agent.text } }),
              e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                e('span', { style: { fontSize: 11, fontWeight: 600, color: C_TEXT } }, 'content_curator'),
                e('span', { style: { fontSize: 9, color: C_TEXT_MUTED } }, 'Apr 4, 12:39 PM')
              ),
              e('div', { style: { fontSize: 11, color: C_TEXT_DIM, lineHeight: '1.55', background: '#f9fafb', padding: '10px 12px', borderRadius: 8, border: '1px solid ' + C_CARD_BORDER } },
                'Analyzing top-performing onboarding flows. Identified 3 key patterns:\n\n',
                e('div', { style: { marginTop: 4 } },
                  e('div', { style: { fontSize: 10, color: C_TEXT_DIM, marginBottom: 2 } }, '\u2022 Welcome + value proposition (Day 0)'),
                  e('div', { style: { fontSize: 10, color: C_TEXT_DIM, marginBottom: 2 } }, '\u2022 Getting started guide (Day 1)'),
                  e('div', { style: { fontSize: 10, color: C_TEXT_DIM, marginBottom: 2 } }, '\u2022 Feature highlights + social proof (Day 3)'),
                  e('div', { style: { fontSize: 10, color: C_TEXT_DIM, marginBottom: 2 } }, '\u2022 Tips & best practices (Day 5)'),
                  e('div', { style: { fontSize: 10, color: C_TEXT_DIM } }, '\u2022 Re-engagement + feedback ask (Day 7)')
                )
              )
            ),

            // Activity entry 3: progress
            e('div', { style: { position: 'relative' } },
              e('div', { style: { position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#dbeafe', border: '2px solid #3b82f6' } }),
              e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                e('span', { style: { fontSize: 11, fontWeight: 600, color: C_TEXT } }, 'content_curator'),
                e('span', { style: { fontSize: 9, color: C_TEXT_MUTED } }, 'Apr 4, 12:41 PM')
              ),
              e('div', { style: { fontSize: 11, color: C_TEXT_DIM } }, 'Drafting email 1/5: Welcome message with personalization tokens...')
            )
          )
        )
      )
    ));
  }

  // ===== SLACK NOTIFICATION TOAST (f350-420) =====
  var slackStart = 350;
  var slackEnd = 400;
  var slackVisible = f >= slackStart && f < slackEnd + 25;
  if (slackVisible) {
    var slackSlideIn = f < slackStart + 25 ? eo3(p(slackStart, slackStart + 25)) : 1;
    var slackSlideOut = f >= slackEnd ? 1 - eo3(p(slackEnd, slackEnd + 25)) : 1;
    var slackT = slackSlideIn * slackSlideOut;
    var slackCardW = 260;
    var slackCardH = 82;
    var slackXPos = W - slackCardW - 24;
    var slackBaseY = H + 10;
    var slackTargetY = H - slackCardH - 30;
    var slackYPos = lerp(slackBaseY, slackTargetY, slackT);

    children.push(e('div', { key: 'slack-toast', style: {
      position: 'absolute',
      left: slackXPos, top: slackYPos,
      width: slackCardW, height: slackCardH,
      background: '#ffffff',
      borderRadius: 10,
      boxShadow: '0 8px 30px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
      padding: '12px 16px',
      zIndex: 28,
      opacity: slackT * exitOp,
      overflow: 'hidden'
    }},
      // Green accent bar on left
      e('div', { style: {
        position: 'absolute', left: 0, top: 0, width: 4, height: '100%',
        background: '#2eb67d', borderRadius: '10px 0 0 10px'
      }}),
      // Header row: Slack icon + channel
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, marginLeft: 4 } },
        e('div', { style: {
          width: 10, height: 10, borderRadius: '50%', background: '#2eb67d', flexShrink: 0
        }}),
        e('span', { style: { fontSize: 10, fontWeight: 700, color: '#1d1c1d' } }, 'Slack'),
        e('span', { style: { fontSize: 9, color: '#616061' } }, '\u00B7'),
        e('span', { style: { fontSize: 9, fontWeight: 600, color: '#1264a3' } }, '#ai-factory')
      ),
      // Message line 1
      e('div', { style: { fontSize: 10, color: '#1d1c1d', marginBottom: 3, marginLeft: 4 } },
        '\u2705 Task completed:'
      ),
      // Message line 2
      e('div', { style: { fontSize: 10, color: '#1d1c1d', fontWeight: 500, marginBottom: 3, marginLeft: 4 } },
        '\u201CDraft weekly newsletter\u201D'
      ),
      // Agent line
      e('div', { style: { fontSize: 9, color: '#616061', marginLeft: 4 } },
        '\u{1F916} by content_curator'
      )
    ));
  }

  // ===== VOICEOVER TEXT OVERLAY =====
  var voText1Op = f >= 10 ? (f < 40 ? eo3(p(10, 40)) : (f < 120 ? 1 : (f < 150 ? 1 - eo3(p(120, 150)) : 0))) : 0;
  if (voText1Op > 0) {
    children.push(e('div', { key: 'vo1', style: {
      position: 'absolute', bottom: 50, left: 0, width: W, textAlign: 'center',
      opacity: voText1Op * exitOp, zIndex: 22, pointerEvents: 'none'
    }},
      e('div', { style: {
        display: 'inline-block', padding: '10px 24px', borderRadius: 12,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(70,92,224,0.2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }},
        e('span', { style: { color: '#0f172a', fontSize: 16, fontWeight: 500 } },
          'Meet FlowHunt AI Factory \u2014 your AI Supervisor delegates and tracks every task'
        )
      )
    ));
  }

  var voText2Op = f >= 200 ? (f < 230 ? eo3(p(200, 230)) : (f < 320 ? 1 : (f < 350 ? 1 - eo3(p(320, 350)) : 0))) : 0;
  if (voText2Op > 0) {
    children.push(e('div', { key: 'vo2', style: {
      position: 'absolute', bottom: 50, left: 0, width: W, textAlign: 'center',
      opacity: voText2Op * exitOp, zIndex: 22, pointerEvents: 'none'
    }},
      e('div', { style: {
        display: 'inline-block', padding: '10px 24px', borderRadius: 12,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(70,92,224,0.2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }},
        e('span', { style: { color: '#0f172a', fontSize: 16, fontWeight: 500 } },
          'Watch tasks flow through your pipeline \u2014 from open to done, automatically'
        )
      )
    ));
  }

  // ===== AMBIENT PARTICLES =====
  if (f >= 20) {
    var partOp = f < 50 ? eo3(p(20, 50)) : 1;
    for (var pi = 0; pi < 12; pi++) {
      var pSeed = hash(pi + 500);
      var pSpeed = 0.08 + pSeed * 0.2;
      var pxBase = totalSidebarW + hash(pi + 600) * (W - totalSidebarW);
      var pPhase = ((f - 20) * pSpeed + pSeed * 200) % 140;
      var pY = H + 10 - pPhase * (H + 30) / 140;
      var pFadeIn = Math.min(pPhase / 15, 1);
      var pFadeOut = Math.max(0, 1 - (pPhase - 110) / 30);
      var pAlpha = pFadeIn * pFadeOut * partOp * 0.1 * exitOp;
      var pSize = 2 + pSeed * 3;
      var pColor = [C_GR1, C_GR2, C_GR3][pi % 3];
      if (pAlpha > 0.01) {
        children.push(e('div', { key: 'pt' + pi, style: {
          position: 'absolute', left: pxBase, top: pY,
          width: pSize, height: pSize, borderRadius: '50%',
          background: pColor, opacity: pAlpha,
          pointerEvents: 'none', zIndex: 23
        }}));
      }
    }
  }

  // ===== SCENE EXIT FADE =====
  if (f >= 430) {
    var fadeOp = eo3(p(430, 450));
    children.push(e('div', { key: 'fade-out', style: {
      position: 'absolute', top: 0, left: 0, width: W, height: H,
      background: C_BG, opacity: fadeOp, zIndex: 30
    }}));
  }

  return e('div', { style: {
    position: 'relative', width: W, height: H, overflow: 'hidden',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: C_BG
  }}, children);
}
