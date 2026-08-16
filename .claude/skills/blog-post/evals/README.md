# Evals for the `blog-post` skill

Nothing here runs automatically. These files make a manual test pass repeatable
when the skill changes.

## What's here

- `evals.json` — the test prompt(s). Each eval is a realistic user message plus a
  description of the expected output. This is what an agent is given to run.
- `grade.py` — 16 scripted checks on the produced blog `.md` (`--json` emits a
  grading.json body). Structure: frontmatter, no H1, embed+truncate placement, no
  `images/frame-*` refs, no absolute docs links, trailing slashes, ≥3 cross-links,
  `bfflist` typo. Voice: intro 40–150 words, zero em dashes in prose, no filler words
  (delve/leverage/seamless/…), no boilerplate closers, ≤3 choppy ≤4-word fragments,
  ≤4 rhetorical questions, concrete specifics present, closing section has a CTA
  verb + link.
- `rubric.md` — 6 judged checks (intro earns attention, voice sounds like a person,
  no slop rhythm, practical insight, genuine tone, clear CTA). A *fresh* agent grades
  these so the writer's context doesn't leak into the verdict; SKILL.md step 7 wires
  this into the authoring flow itself, not just these evals.
- `results/` — one folder per iteration with the outputs, gradings and a summary
  (created by a run; not committed if you don't want binaries in git).

## Running a pass (ask Claude Code)

> "re-run the blog-post evals"

What that does, step by step:

1. **Snapshot** the current skill (`cp -r .claude/skills/blog-post <workspace>/skill-snapshot`)
   if comparing old vs. new; for a brand-new skill the baseline is "no skill".
2. **Spawn two agents in isolated git worktrees**, same prompt from `evals.json`,
   one told to follow `SKILL.md`, one told not to. Have each remove the already-published
   version of the post first (`git rm blog/2026-08-15-building-…md static/img/studio-one-shot-*`)
   so the run is a genuine recreation, and symlink `node_modules` so `pnpm build` works.
   Tell them **not to commit or open a PR** and to copy the resulting `.md` + a `notes.md`
   into `results/iteration-N/eval-0/{with_skill,without_skill}/run-1/outputs/`.
3. **Grade** each output: `python3 .claude/skills/blog-post/evals/grade.py <post.md> --json > grading.json`,
   then spawn a fresh agent with `rubric.md` to append the six judged verdicts (same
   `text/passed/evidence` shape) and add `pnpm build passes` from the agent's notes.
   Recompute `summary.pass_rate`.
4. **Aggregate + view** with the skill-creator plugin:
   ```bash
   SC=~/.claude/plugins/cache/claude-plugins-official/skill-creator/unknown/skills/skill-creator
   cd $SC && python3 -m scripts.aggregate_benchmark <results/iteration-N> --skill-name blog-post
   python3 eval-viewer/generate_review.py <results/iteration-N> --skill-name blog-post \
     --benchmark <results/iteration-N>/benchmark.json --static <results/iteration-N>/review.html
   ```
   Open `review.html` to click through outputs and leave feedback; the benchmark tab
   shows pass rate / time / tokens per configuration.
5. **Iterate**: change `SKILL.md`, rerun into `iteration-N+1`, compare.

## Reading results

- The 8 structure checks are a floor that both with- and without-skill runs clear,
  because the repo has 16 example posts to copy. The 8 voice checks and the rubric are
  where the skill has to earn its keep: the published posts themselves fail several of
  them (35 em dashes, 'The problem?' fragments, no CTA), so a passing run means the
  skill changed the writing, not just the wrapper.
- Cost is ~70–80k tokens and ~4–5 min per agent (it builds the whole post), so run
  passes when the skill changes, not per commit.
- To add a test, append to `evals.json` with a different zip (a post with new
  concepts tests the cross-linking step best) and extend `grade.py` if there's a
  new objective check — e.g. a specific link you expect.

## Iteration 1 (2026-08-16)

Studio One-Shot zip, YouTube `TFKGedjVbtE`. With skill 9/9 (77k tokens, 253s);
without skill 9/9 (67k tokens, 279s). With-skill run additionally caught
`utils.randomUUID` → `crypto.randomUUID` and a mislabeled frame alt text.
