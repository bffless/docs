#!/usr/bin/env bash
# Print every internal link target on the docs site: docs routes and blog slugs,
# each with its title, so a post can be cross-linked without guessing paths.
# Run from the repo root (docs-public). Routes already carry the trailing slash.
set -euo pipefail
title() { grep -m1 '^title:' "$1" | sed -E "s/^title:[[:space:]]*//; s/^['\"]//; s/['\"]$//"; }
echo "# DOCS (routeBasePath '/')"
find docs -name '*.md' -o -name '*.mdx' | grep -v '^docs/agents/\|^docs/adr/\|^docs/design-system' | sort | while read -r f; do
  route="/${f#docs/}"; route="${route%.mdx}"; route="${route%.md}"; route="${route%/index}"; route="${route%index}"
  slug=$(grep -m1 '^slug:' "$f" | sed -E 's/^slug:[[:space:]]*//' || true)
  [ -n "$slug" ] && route="$slug"
  route="${route%/}/"
  printf '%-52s %s\n' "$route" "$(title "$f")"
done
echo
echo "# BLOG"
for f in blog/*.md; do
  slug=$(grep -m1 '^slug:' "$f" | sed -E 's/^slug:[[:space:]]*//')
  printf '%-52s %s\n' "/blog/${slug}/" "$(title "$f")"
done
echo
echo "# TAGS (blog/tags.yml)"
grep -E '^[a-z-]+:' blog/tags.yml | tr -d ':'
