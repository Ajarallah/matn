"""Shape «متن» with HarfBuzz and emit an outlined SVG path.

Outlining rather than shipping the font: Thmanyah permits use but forbids
redistribution, and a logo is normally drawn as paths anyway.
"""
import json, os, subprocess, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

FONT = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1
                          else "~/Library/Fonts/thmanyahserifdisplay-Bold.otf")
HEIGHT = float(sys.argv[2]) if len(sys.argv) > 2 else 100.0
# meem, teh, noon. Pass codepoints, not bytes: hb-shape chokes on raw Arabic
# under this shell's locale.
CPS = "645,62A,646"

shaped = json.loads(subprocess.run(
    ["hb-shape", "--output-format=json", f"--unicodes={CPS}", FONT],
    capture_output=True, text=True, check=True).stdout)
print(f"# shaped: {[g['g'] for g in shaped]}", file=sys.stderr)

font = TTFont(FONT)
gs = font.getGlyphSet()
upem = font["head"].unitsPerEm
print(f"# upem={upem}", file=sys.stderr)

# HarfBuzz already returns visual order for RTL — advance left to right through
# the buffer as given; reversing it would scramble the cursive joins.
rec = RecordingPen()
pen_x = 0.0
for g in shaped:
    one = RecordingPen()
    gs[g["g"]].draw(one)
    one.replay(TransformPen(rec, Transform(1, 0, 0, 1,
                                           pen_x + g.get("dx", 0), g.get("dy", 0))))
    pen_x += g["ax"]

bounds = BoundsPen(gs)
rec.replay(bounds)
x0, y0, x1, y1 = bounds.bounds
print(f"# ink bounds: {bounds.bounds}", file=sys.stderr)

# Normalise by MEASURED ink, not upem/ascender, so the mark optically fills its
# box. The final noon descends below the baseline, so y0 is not a round number.
scale = HEIGHT / (y1 - y0)
out = SVGPathPen(gs, ntos=lambda v: repr(round(v, 2)))
rec.replay(TransformPen(out, Transform(scale, 0, 0, -scale, -x0 * scale, y1 * scale)))
path = out.getCommands()
w = (x1 - x0) * scale
print(f"# viewBox 0 0 {round(w,2)} {HEIGHT}  (aspect {round(w/HEIGHT,4)})", file=sys.stderr)
print(f"# path chars: {len(path)}", file=sys.stderr)
print(json.dumps({"viewBox": f"0 0 {round(w,2)} {round(HEIGHT,2)}",
                  "aspect": round(w/HEIGHT, 4), "d": path}))
