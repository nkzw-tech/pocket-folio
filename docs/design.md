# Visual design

The binder shares its visual language with the local `cpojer-blog` and
`nakazawa-tech` projects: Salesforce Sans, neutral dark surfaces, bold headings and tabs,
and blue interactions. Titles use solid colors, never gradients or fades. The font files in
`public/fonts/salesforce` come from `cpojer-blog/public/fonts/salesforce`.

Core color and font tokens live in `src/styles.css`. Prefer these tokens over new
component-specific grays. Card artwork supplies the color in the catalog. Cards, Sets, and set details reserve the same heading and filter space so the first row stays aligned. Set detail headings are unboxed to keep attention on the cards.

Use `corner-shape: squircle` together with generous border radii (18–24px for
controls, 32–36px for cards, 42px for dialogs). Borders should be faint at rest,
with clear blue keyboard focus. Keep touch targets spacious and metadata compact.

Preserve card foil, pointer tilt, and binder page gestures. On touch screens, horizontal strokes over cards move their foil while vertical swipes scroll. In the physical binder, use page margins or arrows to turn pages; card taps still open details. Small control feedback
uses fast transitions; all motion respects reduced-motion preferences. Avoid
adding overlays to card scans or heavy animation to catalog navigation.
