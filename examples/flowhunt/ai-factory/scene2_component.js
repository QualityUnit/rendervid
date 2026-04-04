// Scene 2: Agent Hierarchy & Project Setup (15s = 450 frames @ 30fps)
// Shows project creation wizard, integration suggestions, and agent hierarchy generation
// Styled to match the real FlowHunt light-mode UI
function AIFactoryAgentSetupScene(props) {
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

  // ===== COLORS (FlowHunt real UI palette) =====
  var C_GR1 = '#984ad7'; var C_GR2 = '#465ce0'; var C_GR3 = '#0497dc';
  var C_BG = '#f0f4f8';
  var C_CARD = '#ffffff';
  var C_CARD_BORDER = '#e5e7eb';
  var C_TEXT = '#111827';
  var C_TEXT_DIM = '#6b7280';
  var C_TEXT_MUTED = '#9ca3af';
  var C_BLUE = '#3b82f6';
  var C_LINE = '#d1d5db';

  var children = [];

  // ===== TIMELINE =====
  // f0-20:    Fade in from previous scene
  // f0-80:    "Describe Your Project" wizard card appears with typing animation
  // f80-130:  Project description typed out
  // f130-160: Integration suggestions appear (GitHub, Slack, GSC, DataForSEO)
  // f160-190: "Generating Your AI Team..." loading spinner
  // f190-350: Agent hierarchy tree animates in (Supervisor -> Leaders -> Workers)
  // f350-420: Connection lines pulse between agents
  // f420-450: Fade out

  // ===== BACKGROUND =====
  var bgOp = f < 20 ? eo3(p(0, 20)) : 1;
  children.push(e('div', { key: 'bg', style: {
    position: 'absolute', top: 0, left: 0, width: W, height: H,
    background: C_BG,
    opacity: bgOp
  }}));

  // Grid dots background (matches FlowHunt editor canvas)
  children.push(e('div', { key: 'dots', style: {
    position: 'absolute', top: 0, left: 0, width: W, height: H,
    backgroundImage: 'radial-gradient(circle, #c7cdd4 1px, transparent 1px)',
    backgroundSize: '24px 24px', opacity: bgOp * 0.5, pointerEvents: 'none'
  }}));

  // ===== PHASE 1: Project Description Wizard (f0-160) =====
  if (f < 200) {
    var wizardOp = f < 20 ? eo3(p(0, 20)) : (f < 160 ? 1 : 1 - eo3(p(160, 200)));
    var wizardScale = f < 20 ? lerp(0.95, 1, eo3(p(0, 20))) : (f < 160 ? 1 : lerp(1, 0.95, eo3(p(160, 200))));

    // Wizard card
    var cardW = 640; var cardH = 420;
    var cardX = (W - cardW) / 2;
    var cardY = (H - cardH) / 2 - 20;

    children.push(e('div', { key: 'wizard', style: {
      position: 'absolute', left: cardX, top: cardY, width: cardW,
      background: C_CARD, borderRadius: 12, border: '1px solid ' + C_CARD_BORDER,
      boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
      opacity: wizardOp, transform: 'scale(' + wizardScale + ')',
      zIndex: 10, overflow: 'hidden'
    }},
      // Header
      e('div', { style: {
        padding: '20px 24px', borderBottom: '1px solid ' + C_CARD_BORDER,
        display: 'flex', alignItems: 'center', gap: 12
      }},
        // FlowHunt-style icon: rounded square with gradient
        e('div', { style: {
          width: 36, height: 36, borderRadius: 8,
          background: 'linear-gradient(135deg, ' + C_GR1 + ', ' + C_GR2 + ')',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', fontSize: 18, fontWeight: 700
        }}, '+'),
        e('div', null,
          e('div', { style: { color: C_TEXT, fontSize: 16, fontWeight: 600, letterSpacing: '-0.2px' } }, 'Create AI Factory Project'),
          e('div', { style: { color: C_TEXT_MUTED, fontSize: 13, marginTop: 2 } }, 'Describe what you want to accomplish')
        )
      ),
      // Body
      e('div', { style: { padding: '24px 24px' } },
        // Label
        e('div', { style: { color: C_TEXT_DIM, fontSize: 12, fontWeight: 500, marginBottom: 8 } }, 'Project Description'),
        // Text area with typing animation
        e('div', { style: {
          padding: '14px 16px', borderRadius: 8,
          background: '#f5f7fa', border: '1px solid ' + (f >= 30 ? C_BLUE + '60' : C_CARD_BORDER),
          minHeight: 100, transition: 'border-color 0.3s'
        }},
          (function() {
            var fullText = 'Build and manage a newsletter website with automated content creation, SEO optimization, and growth analytics. The site should publish weekly articles, track search performance, and manage social media promotion.';
            var typeStart = 30;
            var typeEnd = 120;
            if (f < typeStart) return null;
            var progress = cl((f - typeStart) / (typeEnd - typeStart), 0, 1);
            var chars = Math.floor(progress * fullText.length);
            var displayText = fullText.substring(0, chars);
            var showCursor = f < typeEnd || (f % 30 < 15);
            return e('span', { style: { color: C_TEXT, fontSize: 14, lineHeight: '1.65' } },
              displayText,
              showCursor ? e('span', { style: { borderRight: '2px solid ' + C_BLUE, marginLeft: 1 } }, '\u200B') : null
            );
          })()
        ),
        // Suggested integrations (appear after typing)
        f >= 130 ? e('div', { style: { marginTop: 20 } },
          e('div', { style: { color: C_TEXT_DIM, fontSize: 12, fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 } },
            e('div', { style: {
              width: 16, height: 16, borderRadius: '50%', background: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700
            }}, '\u2713'),
            'Suggested Integrations'
          ),
          e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            ['GitHub', 'Slack', 'Google Search Console', 'DataForSEO'].map(function(name, i) {
              var intStart = 130 + i * 8;
              var intOp = f >= intStart ? (f < intStart + 15 ? eo3(p(intStart, intStart + 15)) : 1) : 0;
              var intScale = f >= intStart ? (f < intStart + 15 ? eob(p(intStart, intStart + 15)) : 1) : 0;
              var colors = ['#24292f', '#e01e5a', '#4285f4', '#2196f3'];
              var bgColors = ['#f3f4f6', '#fce7f3', '#eff6ff', '#e0f2fe'];
              var borderColors = ['#d1d5db', '#f9a8d4', '#93c5fd', '#7dd3fc'];
              return e('div', { key: 'int-' + i, style: {
                padding: '6px 12px', borderRadius: 8,
                background: bgColors[i], border: '1px solid ' + borderColors[i],
                color: colors[i], fontSize: 12, fontWeight: 500,
                opacity: intOp, transform: 'scale(' + intScale + ')',
                display: 'flex', alignItems: 'center', gap: 6
              }},
                e('div', { style: {
                  width: 16, height: 16, borderRadius: 4,
                  background: colors[i], opacity: 0.85,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }},
                  e('div', { style: { width: 8, height: 8, borderRadius: 1, background: '#fff' } })
                ),
                name
              );
            })
          ),
          // "Generate" button that appears after integrations
          f >= 150 ? e('div', { style: { marginTop: 18 } },
            e('div', { style: {
              display: 'inline-block', padding: '10px 28px', borderRadius: 8,
              background: C_BLUE, color: '#ffffff',
              fontSize: 14, fontWeight: 600, letterSpacing: '-0.1px',
              boxShadow: '0 1px 3px rgba(59,130,246,0.3)',
              opacity: f < 158 ? eo3(p(150, 158)) : 1,
              transform: 'scale(' + (f < 158 ? eob(p(150, 158)) : 1) + ')'
            }}, 'Generate AI Team')
          ) : null
        ) : null
      )
    ));
  }

  // ===== PHASE 2: Loading Transition (f160-190) =====
  if (f >= 155 && f < 200) {
    var loadOp = f < 165 ? eo3(p(155, 165)) : (f < 190 ? 1 : 1 - eo3(p(190, 200)));
    var spinAngle = (f - 155) * 8;
    children.push(e('div', { key: 'loading', style: {
      position: 'absolute', left: 0, top: 0, width: W, height: H,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: loadOp, zIndex: 15
    }},
      // Spinner (FlowHunt blue style)
      e('div', { style: {
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid ' + C_CARD_BORDER,
        borderTopColor: C_BLUE,
        transform: 'rotate(' + spinAngle + 'deg)',
        marginBottom: 16
      }}),
      e('div', { style: { color: C_TEXT, fontSize: 15, fontWeight: 600 } }, 'Generating Your AI Team...'),
      e('div', { style: { color: C_TEXT_MUTED, fontSize: 13, marginTop: 6 } }, 'Analyzing requirements and creating specialized agents')
    ));
  }

  // ===== PHASE 3: Agent Hierarchy Tree (f190-450) =====
  if (f >= 190) {
    var treeOp = f < 220 ? eo3(p(190, 220)) : 1;

    // Hierarchy data - styled like real FlowHunt node cards
    // Using the FlowHunt node color scheme: green for input/triggers, pink/red for agents, teal for supervisors
    var supervisor = { name: 'Project Supervisor', type: 'supervisor', color: '#0d9488', borderColor: '#99f6e4', bgTint: '#f0fdfa', icon: null };
    var leaders = [
      { name: 'Newsletter Director', type: 'leader', color: '#be185d', borderColor: '#f9a8d4', bgTint: '#fdf2f8', icon: null },
      { name: 'Growth Team Lead', type: 'leader', color: '#be185d', borderColor: '#f9a8d4', bgTint: '#fdf2f8', icon: null }
    ];
    var workers = [
      [
        { name: 'Content Curator', color: '#7c3aed', borderColor: '#c4b5fd', bgTint: '#f5f3ff', icon: null },
        { name: 'SEO Specialist', color: '#7c3aed', borderColor: '#c4b5fd', bgTint: '#f5f3ff', icon: null }
      ],
      [
        { name: 'Analytics Agent', color: '#7c3aed', borderColor: '#c4b5fd', bgTint: '#f5f3ff', icon: null },
        { name: 'Social Media Agent', color: '#7c3aed', borderColor: '#c4b5fd', bgTint: '#f5f3ff', icon: null }
      ]
    ];

    // Positions — more spaced out for breathing room
    var treeCX = W / 2;
    var supY = 140;
    var leaderY = 340;
    var workerY = 540;
    var leaderSpacing = 440;
    var workerSpacing = 220;

    // Helper to draw a FlowHunt-style agent node card
    function agentNode(key, agent, cx, cy, startFrame, isSuper) {
      var nodeOp = f >= startFrame ? (f < startFrame + 25 ? eo3(p(startFrame, startFrame + 25)) : 1) : 0;
      var nodeScale = f >= startFrame ? (f < startFrame + 25 ? eob(p(startFrame, startFrame + 25)) : 1) : 0;
      var nFloat = nodeOp >= 1 ? float(hash(startFrame) * 100, 1.5, 0.025) : 0;
      var exitFade = f >= 420 ? 1 - eo3(p(420, 450)) : 1;
      nodeOp *= treeOp * exitFade;

      if (nodeOp <= 0) return null;

      var nodeW = isSuper ? 240 : 200;
      var nodeH = isSuper ? 72 : 60;

      // FlowHunt-style colored left border accent
      return [
        e('div', { key: key, style: {
          position: 'absolute',
          left: cx - nodeW / 2, top: cy - nodeH / 2 + nFloat,
          width: nodeW, height: nodeH,
          borderRadius: 10, background: C_CARD,
          border: '1px solid ' + C_CARD_BORDER,
          borderLeft: '3px solid ' + agent.color,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 14px',
          opacity: nodeOp, transform: 'scale(' + nodeScale + ')',
          zIndex: 8
        }},
          // Icon block (FlowHunt-style rounded square icon)
          e('div', { style: {
            width: isSuper ? 36 : 30, height: isSuper ? 36 : 30, borderRadius: 7,
            background: agent.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }},
            // Simple robot/agent icon using white shapes
            e('div', { style: {
              width: isSuper ? 16 : 13, height: isSuper ? 16 : 13,
              borderRadius: 2, background: 'rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }},
              e('div', { style: {
                width: isSuper ? 8 : 6, height: isSuper ? 8 : 6,
                borderRadius: 1, background: agent.color, opacity: 0.7
              }})
            )
          ),
          // Text
          e('div', { style: { overflow: 'hidden' } },
            e('div', { style: {
              color: C_TEXT, fontSize: isSuper ? 13 : 12, fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}, agent.name),
            e('div', { style: {
              color: C_TEXT_MUTED, fontSize: 10, fontWeight: 500, marginTop: 2,
              textTransform: 'uppercase', letterSpacing: '0.5px'
            }}, agent.type)
          )
        )
      ];
    }

    // Helper to draw smooth solid connection lines with electricity animation
    function connectionLine(key, x1, y1, x2, y2, color, startFrame) {
      var lineOp = f >= startFrame ? (f < startFrame + 25 ? eo3(p(startFrame, startFrame + 25)) : 1) : 0;
      var exitFade = f >= 420 ? 1 - eo3(p(420, 450)) : 1;
      lineOp *= treeOp * exitFade;
      if (lineOp <= 0) return null;

      var midY = (y1 + y2) / 2;
      var lineColor = '#cbd5e1'; // smooth light gray
      var lineW = 2;

      // Electricity particles flowing down from supervisor (f350-420)
      var sparks = [];
      if (f >= 350 && f < 420) {
        // Multiple sparks traveling along the path at different speeds/offsets
        for (var si = 0; si < 3; si++) {
          var sparkSpeed = 55 + si * 15; // different cycle lengths
          var sparkOffset = si * 18; // stagger
          var sparkPhase = ((f - 350 + sparkOffset) % sparkSpeed) / sparkSpeed;

          // Path: down from y1 to midY, across to x2, down to y2
          var totalLen = (midY - y1) + Math.abs(x2 - x1) + (y2 - midY);
          var dist = sparkPhase * totalLen;
          var seg1 = midY - y1;
          var seg2 = Math.abs(x2 - x1);
          var sx, sy;

          if (dist < seg1) {
            // On vertical segment 1
            sx = x1; sy = y1 + dist;
          } else if (dist < seg1 + seg2) {
            // On horizontal segment
            var hProgress = (dist - seg1) / seg2;
            sx = x1 < x2 ? lerp(x1, x2, hProgress) : lerp(x1, x2, hProgress);
            sy = midY;
          } else {
            // On vertical segment 2
            var vDist = dist - seg1 - seg2;
            sx = x2; sy = midY + Math.min(vDist, y2 - midY);
          }

          // Spark glow intensity (brighter at center of path)
          var sparkBright = 0.7 + 0.3 * Math.sin(sparkPhase * Math.PI);
          var sparkSize = 5 + si * 2;

          sparks.push(e('div', { key: key + '-spark-' + si, style: {
            position: 'absolute',
            left: sx - sparkSize / 2, top: sy - sparkSize / 2,
            width: sparkSize, height: sparkSize, borderRadius: '50%',
            background: 'radial-gradient(circle, ' + C_BLUE + ' 0%, rgba(59,130,246,0) 70%)',
            boxShadow: '0 0 ' + (sparkSize * 2) + 'px ' + C_BLUE + '80, 0 0 ' + (sparkSize) + 'px ' + C_BLUE,
            opacity: lineOp * sparkBright * 0.85,
            zIndex: 9, pointerEvents: 'none'
          }}));
        }

        // Glowing line effect during electricity
        var glowPulse = 0.3 + 0.4 * Math.sin(f * 0.15);
        sparks.push(e('div', { key: key + '-glow-v1', style: {
          position: 'absolute', left: x1 - 2, top: y1, width: 4, height: midY - y1,
          background: C_BLUE, opacity: lineOp * glowPulse * 0.15, borderRadius: 2,
          filter: 'blur(3px)', zIndex: 6, pointerEvents: 'none'
        }}));
        if (Math.abs(x2 - x1) > 2) {
          sparks.push(e('div', { key: key + '-glow-h', style: {
            position: 'absolute', left: Math.min(x1, x2), top: midY - 2, width: Math.abs(x2 - x1), height: 4,
            background: C_BLUE, opacity: lineOp * glowPulse * 0.15, borderRadius: 2,
            filter: 'blur(3px)', zIndex: 6, pointerEvents: 'none'
          }}));
        }
        sparks.push(e('div', { key: key + '-glow-v2', style: {
          position: 'absolute', left: x2 - 2, top: midY, width: 4, height: y2 - midY,
          background: C_BLUE, opacity: lineOp * glowPulse * 0.15, borderRadius: 2,
          filter: 'blur(3px)', zIndex: 6, pointerEvents: 'none'
        }}));
      }

      return [
        // Smooth vertical line from parent down to midY
        e('div', { key: key + '-v1', style: {
          position: 'absolute', left: x1 - lineW / 2, top: y1,
          width: lineW, height: midY - y1,
          background: lineColor, borderRadius: 1,
          opacity: lineOp, zIndex: 6
        }}),
        // Connector dot at parent
        e('div', { key: key + '-c1', style: {
          position: 'absolute', left: x1 - 4, top: y1 - 4,
          width: 8, height: 8, borderRadius: '50%',
          border: '2px solid ' + lineColor, background: C_CARD,
          opacity: lineOp, zIndex: 7
        }}),
        // Smooth horizontal line
        Math.abs(x2 - x1) > 2 ? e('div', { key: key + '-h', style: {
          position: 'absolute', left: Math.min(x1, x2), top: midY - lineW / 2,
          width: Math.abs(x2 - x1), height: lineW,
          background: lineColor, borderRadius: 1,
          opacity: lineOp, zIndex: 6
        }}) : null,
        // Smooth vertical line from midY down to child
        e('div', { key: key + '-v2', style: {
          position: 'absolute', left: x2 - lineW / 2, top: midY,
          width: lineW, height: y2 - midY,
          background: lineColor, borderRadius: 1,
          opacity: lineOp, zIndex: 6
        }}),
        // Connector dot at child
        e('div', { key: key + '-c2', style: {
          position: 'absolute', left: x2 - 4, top: y2 - 4,
          width: 8, height: 8, borderRadius: '50%',
          border: '2px solid ' + lineColor, background: C_CARD,
          opacity: lineOp, zIndex: 7
        }}),
        // Blue "+" button at midpoint
        e('div', { key: key + '-plus', style: {
          position: 'absolute',
          left: (x1 + x2) / 2 - 10, top: midY - 10,
          width: 20, height: 20, borderRadius: '50%',
          background: C_BLUE, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, lineHeight: '1',
          boxShadow: '0 1px 3px rgba(59,130,246,0.3)',
          opacity: lineOp, zIndex: 7
        }}, '+')
      ].concat(sparks);
    }

    // "Your AI Team" title - clean pill style
    var titleOp = f >= 195 ? (f < 220 ? eo3(p(195, 220)) : 1) : 0;
    var exitFade = f >= 420 ? 1 - eo3(p(420, 450)) : 1;
    if (titleOp * exitFade > 0) {
      children.push(e('div', { key: 'tree-title', style: {
        position: 'absolute', left: 0, width: W, top: 36, textAlign: 'center',
        opacity: titleOp * treeOp * exitFade, zIndex: 10
      }},
        e('div', { style: {
          display: 'inline-block', padding: '8px 20px', borderRadius: 8,
          background: C_CARD, border: '1px solid ' + C_CARD_BORDER,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }},
          e('span', { style: { color: C_TEXT, fontSize: 16, fontWeight: 600 } }, 'Your AI Team'),
          e('span', { style: { color: C_TEXT_MUTED, fontSize: 14, fontWeight: 400, marginLeft: 8 } }, '- Auto-Generated')
        )
      ));
    }

    // Draw connections first
    // Supervisor to leaders
    leaders.forEach(function(leader, li) {
      var lx = treeCX + (li - 0.5) * leaderSpacing;
      var lines = connectionLine('conn-sl-' + li, treeCX, supY + 36, lx, leaderY - 30, C_LINE, 220 + li * 10);
      if (lines) lines.forEach(function(el) { if (el) children.push(el); });
    });

    // Leaders to workers
    leaders.forEach(function(leader, li) {
      var lx = treeCX + (li - 0.5) * leaderSpacing;
      workers[li].forEach(function(worker, wi) {
        var wx = lx + (wi - 0.5) * workerSpacing;
        var lines = connectionLine('conn-lw-' + li + '-' + wi, lx, leaderY + 30, wx, workerY - 30, C_LINE, 260 + li * 15 + wi * 8);
        if (lines) lines.forEach(function(el) { if (el) children.push(el); });
      });
    });

    // Draw nodes
    // Supervisor
    var supNodes = agentNode('sup', supervisor, treeCX, supY, 200, true);
    if (supNodes) supNodes.forEach(function(el) { if (el) children.push(el); });

    // Leaders
    leaders.forEach(function(leader, li) {
      var lx = treeCX + (li - 0.5) * leaderSpacing;
      var leaderNodes = agentNode('leader-' + li, leader, lx, leaderY, 230 + li * 12, false);
      if (leaderNodes) leaderNodes.forEach(function(el) { if (el) children.push(el); });
    });

    // Workers
    leaders.forEach(function(leader, li) {
      var lx = treeCX + (li - 0.5) * leaderSpacing;
      workers[li].forEach(function(worker, wi) {
        var wx = lx + (wi - 0.5) * workerSpacing;
        var workerNodes = agentNode('worker-' + li + '-' + wi, worker, wx, workerY, 260 + li * 15 + wi * 8, false);
        if (workerNodes) workerNodes.forEach(function(el) { if (el) children.push(el); });
      });
    });

    // Tier labels - clean, subtle, left-aligned
    var tiers = [
      { label: 'SUPERVISOR', y: supY, start: 205, color: '#0d9488' },
      { label: 'LEADERS', y: leaderY, start: 235, color: '#be185d' },
      { label: 'WORKERS', y: workerY, start: 270, color: '#7c3aed' }
    ];
    tiers.forEach(function(tier, ti) {
      var tierOp = f >= tier.start ? (f < tier.start + 20 ? eo3(p(tier.start, tier.start + 20)) : 1) : 0;
      tierOp *= treeOp * exitFade;
      if (tierOp > 0) {
        children.push(e('div', { key: 'tier-' + ti, style: {
          position: 'absolute', left: 50, top: tier.y - 8,
          opacity: tierOp, zIndex: 5
        }},
          e('div', { style: {
            padding: '3px 8px', borderRadius: 4,
            background: tier.color + '10', border: '1px solid ' + tier.color + '20',
            color: tier.color, fontSize: 9, fontWeight: 600,
            letterSpacing: '1.5px'
          }}, tier.label)
        ));
      }
    });
  }

  // ===== VOICEOVER TEXT =====
  var voText1Op = f >= 5 ? (f < 25 ? eo3(p(5, 25)) : (f < 150 ? 1 : (f < 170 ? 1 - eo3(p(150, 170)) : 0))) : 0;
  if (voText1Op > 0) {
    children.push(e('div', { key: 'vo1', style: {
      position: 'absolute', bottom: 50, left: 0, width: W, textAlign: 'center',
      opacity: voText1Op, zIndex: 20
    }},
      e('div', { style: {
        display: 'inline-block', padding: '10px 24px', borderRadius: 10,
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        border: '1px solid ' + C_CARD_BORDER
      }},
        e('span', { style: { color: C_TEXT, fontSize: 15, fontWeight: 500 } },
          'Describe your project \u2192 Connect integrations \u2192 AI builds your team'
        )
      )
    ));
  }

  var voText2Op = f >= 200 ? (f < 220 ? eo3(p(200, 220)) : (f < 410 ? 1 : (f < 430 ? 1 - eo3(p(410, 430)) : 0))) : 0;
  if (voText2Op > 0) {
    children.push(e('div', { key: 'vo2', style: {
      position: 'absolute', bottom: 50, left: 0, width: W, textAlign: 'center',
      opacity: voText2Op, zIndex: 20
    }},
      e('div', { style: {
        display: 'inline-block', padding: '10px 24px', borderRadius: 10,
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        border: '1px solid ' + C_CARD_BORDER
      }},
        e('span', { style: { color: C_TEXT, fontSize: 15, fontWeight: 500 } },
          'Supervisor \u2192 Leaders \u2192 Workers: an intelligent hierarchy, instantly created'
        )
      )
    ));
  }

  // ===== AMBIENT PARTICLES =====
  if (f >= 10) {
    var partOp = f < 30 ? eo3(p(10, 30)) : 1;
    for (var pi = 0; pi < 8; pi++) {
      var pSeed = hash(pi + 300);
      var pSpeed = 0.1 + pSeed * 0.2;
      var pxBase = hash(pi + 400) * W;
      var pPhase = ((f - 10) * pSpeed + pSeed * 200) % 140;
      var pY = H + 10 - pPhase * (H + 30) / 140;
      var pFadeIn = Math.min(pPhase / 12, 1);
      var pFadeOut = Math.max(0, 1 - (pPhase - 110) / 30);
      var pAlpha = pFadeIn * pFadeOut * partOp * 0.08;
      var pSize = 2 + pSeed * 2;
      var pColor = [C_GR1, C_GR2, C_GR3][pi % 3];
      if (pAlpha > 0.01) {
        children.push(e('div', { key: 'pt' + pi, style: {
          position: 'absolute', left: pxBase, top: pY,
          width: pSize, height: pSize, borderRadius: '50%',
          background: pColor, opacity: pAlpha, pointerEvents: 'none', zIndex: 25
        }}));
      }
    }
  }

  // ===== EXIT FADE =====
  if (f >= 430) {
    children.push(e('div', { key: 'fade-out', style: {
      position: 'absolute', top: 0, left: 0, width: W, height: H,
      background: C_BG, opacity: eo3(p(430, 450)), zIndex: 30
    }}));
  }

  return e('div', { style: {
    position: 'relative', width: W, height: H, overflow: 'hidden',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: C_BG
  }}, children);
}
