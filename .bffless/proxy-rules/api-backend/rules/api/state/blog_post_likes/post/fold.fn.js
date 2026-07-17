/**
 * Fold an array of like rows into a map keyed by slug.
 * Each entry = { liked: true, slug, variant, liked_at }.
 */
function handler({ steps }) {
  var rows = steps.query || [];
  var map = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || !row.slug) continue;
    map[row.slug] = {
      liked: true,
      slug: row.slug,
      variant: row.variant || null,
      liked_at: row.created_at || row.createdAt || null
    };
  }
  return map;
}
