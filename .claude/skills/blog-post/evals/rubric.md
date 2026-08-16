# Judged checks (read the post; answer pass/fail with a quoted line as evidence)

These need a reader. Grade each as PASS or FAIL and cite the sentence(s) that decided
it. Be strict: "mostly fine" is a FAIL with a note. Add them to `grading.json` next
to the scripted checks with `text` = the label below.

1. **Intro earns attention** — the first two or three sentences state, in plain
   language, what was built or learned and why a reader should care. No throat-clearing
   ("In this post we will…"), no generic scene-setting. A reader skimming the blog index
   should know from the teaser alone whether this is for them.
2. **Voice sounds like a person** — first-hand, specific, occasionally opinionated. It
   reads like the developer telling you what happened, not a press release or a summary
   of a video. Fails on: passive "it is noted that", stacked adjectives, "the developer"
   used as a distancing device where "I" was clearly meant, sentence-level uniformity.
3. **No AI-slop rhythm** — beyond the scripted word list: no bold-lead bullet parades
   used as a substitute for prose, no "X. Y. Z." staccato for effect, no paragraph that
   ends on a punchy four-word fragment, no "But here's the thing." Em dashes are counted
   by the script; here judge whether the sentences still flow once they're gone.
4. **Practical insight** — at least two things a reader could act on tomorrow: a
   command, a config location, a gotcha with its fix, a design decision with the reason.
   Restating what the video shows is not insight; the *why* and the *what to watch for* is.
5. **Helpful, genuine tone** — admits what went wrong, doesn't oversell BFFless, doesn't
   moralise about AI. Marketing adjectives ("powerful", "effortless") count against.
6. **Clear call to action at the end** — the closing section tells the reader the next
   concrete step and links it: clone the repo, install the app from the catalog, read
   the specific docs page, watch the next episode, open an issue. "That's the power of
   building on an open platform" is a sentiment, not a CTA.
