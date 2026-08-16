# blog-post skill — memory

Lessons about *improving this skill*, not instructions for running it (those live in
SKILL.md). Append a dated entry whenever a run, an eval, or user feedback teaches
something. Two or three sentences per day; fold a lesson into SKILL.md once it is
settled and delete it here.

## 2026-08-16

- Baseline (no skill) matched the skill on all structure checks because `blog/` has 16
  strong examples to copy; the skill only pays off on voice, cross-linking, and the
  fresh-agent grading loop. Don't add structural rules to the skill; add judgement.
- The user's real complaint surfaced late: AI slop (em dashes, "The problem?" fragments,
  filler words, no closing CTA), which the *published* posts are full of (35 em dashes
  in the last one). Grader now measures it; when the author changes taste, the examples
  in `blog/` lag, so weight user feedback over precedent.
- Contractions: the hand-finished Studio One-Shot post expanded every one, older posts
  don't. Unresolved; asked the user, no answer yet. Don't encode a rule until they say.
- Test agents pick the YouTube thumbnail as cover when the skill lets them; the user
  picked the AI-generated frame. Cover choice = strongest frame by default (fixed in
  SKILL.md, keep an eye on it).
- Iteration 2 (voice rules + fresh-grader loop): scripted 16/16 first try, rubric
  converged in 3 rounds (both fails were slop rhythm: bullet-parade narrative and short
  fragments), 102k tokens / 9 min vs 77k / 4 min before. The loop works; the cost is the
  price of the quality bar. Watch whether rubric #3 keeps being the sticky one; if so,
  make the bullet-vs-prose rule in SKILL.md sharper rather than adding rounds.
- The grader agent also caught facts I would not have (button label "Start the run",
  "Nano Banana 2" read off a frame). Reading the frames, not just the prose, is worth
  saying explicitly in SKILL.md if it doesn't happen on its own next time.

## Open questions

- Should the CTA be templated per post type (walkthrough → install from catalog;
  build session → clone repo; explainer → next episode)?
- `date:` for same-day ordering has only been needed once; drop from SKILL.md if it
  never comes up again.
