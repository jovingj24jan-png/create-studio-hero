# Create Studio — hero + story

The first two sections of the Create Studio clone
(https://jovingj24jan-png.github.io/create-studio-site/): the hero and the
"we listen / we imagine / we create / beautiful things" story. Open
`index.html` directly or serve the folder; everything is local.

```
index.html
css/style.css            fonts are inlined, so it also works from file://
js/main.js               hero entrance, hero video, story scroll, header
js/motion.min.js         the animation library the clone already used
assets/img/hero.jpg      the original photo (source only, not loaded)
assets/img/hero-*.webp   hero.jpg resized for the page (jpg fallbacks too)
assets/video/            bg_flowergirl.mp4 (hero), story.mp4, showreel.mp4
```

## How the hero loads

1. First paint: a 312-byte blurred copy of hero.jpg, inlined in the CSS.
2. The resized hero.jpg (26 KB on phones, 67 KB on desktop) sharpens in and
   the entrance animation plays over it.
3. Only after the page has fully loaded does `bg_flowergirl.mp4` start
   downloading.
4. It plays once the browser says it can run to the end without stalling (or
   the whole file has arrived), then fades in over the photo across 1.2s.

If the video is slow, fails, autoplay is blocked, or the visitor asked for
reduced motion or data saving, hero.jpg simply stays. The story and showreel
videos wait until the hero video is ready, so they never compete with it.

To regenerate the resized images after replacing hero.jpg, export it at
828px and 1586px wide as WebP and JPEG with the same names.
