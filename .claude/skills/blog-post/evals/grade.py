#!/usr/bin/env python3
"""Objective checks for a produced blog post. Usage: grade.py <post.md> [--json]

Two groups: STRUCTURE (site conventions) and VOICE (anti-slop, intro, CTA).
Judgement calls (authentic voice, practical insight) live in rubric.md and are
graded by a reader, not here.
"""
import re, sys, json

p = sys.argv[1]; s = open(p).read()
fm = s.split('---')[1] if s.startswith('---') else ''
body = s.split('---', 2)[2] if s.startswith('---') else s

# prose = body minus fenced code/mermaid, headings, images, html tags
prose = re.sub(r'```.*?```', '', body, flags=re.S)
prose = re.sub(r'^#+ .*$', '', prose, flags=re.M)
prose = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', prose)
prose = re.sub(r'<[^>]+>', '', prose)
prose = re.sub(r'`[^`]*`', '', prose)

intro = body.split('<!-- truncate -->')[0] if '<!-- truncate -->' in body else body.split('\n## ')[0]
intro_prose = re.sub(r'<[^>]+>', '', intro)
intro_words = len(intro_prose.split())

links = re.findall(r'\]\((/[^)#\s]*)(#[^)]*)?\)', body)
rel = [l for l, _ in links if not l.startswith('/img/')]

FILLER = r"\b(delve|delving|leverag(e|es|ing)|utiliz(e|es|ing)|seamless(ly)?|robust|game[- ]chang(er|ing)|in today's|it'?s worth noting|dive into|deep dive|unlock(s|ing)?|empower(s|ing)?|elevate(s)?|landscape|tapestry|crucial|harness(es|ing)?|revolutioniz\w+|cutting[- ]edge|supercharge|streamline(s|d)?)\b"
filler_hits = sorted({m.group(0).lower() for m in re.finditer(FILLER, prose, re.I)})
CLOSERS = r"^(in conclusion|overall,|to sum up|in summary|wrapping up|final thoughts)"
closer_hits = re.findall(CLOSERS, prose, re.I | re.M)

# sentences (rough): split prose on . ! ? ; ignore list bullets and very short lines
sentences = [x.strip() for x in re.split(r'(?<=[.!?])\s+', re.sub(r'^\s*[-*\d.]+\s+', '', prose, flags=re.M)) if x.strip()]
choppy = [x for x in sentences if 0 < len(x.split()) <= 4 and not x.endswith(':')]
questions = prose.count('?')
em_dashes = prose.count('—') + prose.count(' -- ')

# closing section = text after the last H2
last_h2 = body.rfind('\n## ')
closing = body[last_h2:] if last_h2 != -1 else body[-1500:]
closing_prose = re.sub(r'```.*?```', '', closing, flags=re.S)
cta_verbs = re.search(r"\b(try|clone|fork|install|deploy|get started|start with|sign up|watch|check out|grab|spin up|read|follow|open an issue|let me know|reach out|run)\b", closing_prose, re.I)
cta_link = re.search(r'\]\((https?://|/)[^)]+\)', closing_prose)

concrete = bool(re.search(r'```(?!mermaid)\w*\n', body)) or bool(re.search(r'^\s*1\. ', body, re.M)) or len(re.findall(r'`[^`\n]+`', body)) >= 3

checks = [
 # STRUCTURE
 ("frontmatter complete", all(k in fm for k in ['slug:', 'title:', 'authors: [bffless-team]', 'tags:', 'image:', 'description:']), fm.strip()[:80]),
 ("no H1", not re.search(r'^# ', re.sub(r'```.*?```', '', body, flags=re.S), re.M), ''),
 ("embed+truncate after intro", 'YouTubeEmbed id="' in intro and 'TODO' not in intro and '<!-- truncate -->' in body and '\n## ' not in intro, ''),
 ("no images/frame refs", 'images/frame-' not in body, ''),
 ("no absolute docs links", 'docs.bffless.app' not in body and 'docs.bffless.dev' not in body, ''),
 ("trailing slashes on internal links", bool(rel) and all(l.endswith('/') for l in rel), str(sorted({l for l in rel if not l.endswith('/')}))),
 ("≥3 internal cross-links", len(set(rel)) >= 3, str(sorted(set(rel)))),
 ("bfflist typo fixed", 'bfflist' not in s, ''),
 # VOICE
 ("intro is concise (40–150 words above truncate)", 40 <= intro_words <= 150, f"{intro_words} words"),
 ("no em dashes in prose", em_dashes == 0, f"{em_dashes} found"),
 ("no filler/slop words", not filler_hits, str(filler_hits)),
 ("no boilerplate closers", not closer_hits, str(closer_hits)),
 ("≤3 choppy fragments (≤4 words)", len(choppy) <= 3, str(choppy[:6])),
 ("≤4 rhetorical questions", questions <= 4, f"{questions} '?'"),
 ("concrete specifics (code, steps or inline code)", concrete, ''),
 ("closing section has a call to action (verb + link)", bool(cta_verbs and cta_link), f"verb={cta_verbs.group(0) if cta_verbs else None} link={bool(cta_link)}"),
]

if '--json' in sys.argv:
    exp = [{"text": n, "passed": bool(ok), "evidence": ev or n} for n, ok, ev in checks]
    k = sum(e['passed'] for e in exp)
    print(json.dumps({"expectations": exp, "summary": {"passed": k, "failed": len(exp) - k, "total": len(exp), "pass_rate": k / len(exp)}}, indent=1))
else:
    for n, ok, ev in checks:
        print(('PASS' if ok else 'FAIL'), n, ('  [' + ev + ']') if ev and not ok else '')
    print(f"\n{sum(ok for _, ok, _ in checks)}/{len(checks)} passed")
