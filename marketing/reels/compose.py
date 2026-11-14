import os, subprocess, sys, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S = sys.argv[1]; RAW, HF, B, OUT = S+'/raw', S+'/hf', S+'/build', S+'/out'
REPO = '/home/user/monarch-prime-pin'
W, H, FPS = 1080, 1920, 30
PX, PY, PW, PH, R = 195, 150, 690, 1493, 62   # phone screen rect
F = lambda size, weight='Bold': ImageFont.truetype(f'/usr/share/fonts/opentype/inter/InterDisplay-{weight}.otf', size)

def bg():
    im = Image.new('RGB', (W, H), (5, 8, 16)); glow = Image.new('RGB', (W, H), (5, 8, 16)); d = ImageDraw.Draw(glow)
    d.ellipse((-300, -350, 700, 650), fill=(18, 62, 130)); d.ellipse((560, 500, 1400, 1340), fill=(110, 58, 12)); d.ellipse((150, 1350, 950, 2150), fill=(22, 70, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(190)); im = Image.blend(im, glow, 0.85); im.save(B+'/bg.png')
def mask():
    m = Image.new('L', (PW, PH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, PW-1, PH-1), R, fill=255); m.save(B+'/mask.png')
def frame():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); b = 14
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((PX-b-8, PY-b+14, PX+PW+b+8, PY+PH+b+40), R+b, fill=(0, 0, 0, 150)); sh = sh.filter(ImageFilter.GaussianBlur(40))
    ring = Image.new('RGBA', (W, H), (0, 0, 0, 0)); rd = ImageDraw.Draw(ring)
    rd.rounded_rectangle((PX-b, PY-b, PX+PW+b, PY+PH+b), R+b, fill=(24, 30, 42, 255), outline=(120, 140, 170, 255), width=2)
    rd.rounded_rectangle((PX, PY, PX+PW, PY+PH), R, fill=(0, 0, 0, 0))
    hole = Image.new('L', (W, H), 255); ImageDraw.Draw(hole).rounded_rectangle((PX, PY, PX+PW, PY+PH), R, fill=0)
    ring.putalpha(Image.composite(ring.getchannel('A'), Image.new('L', (W, H), 0), hole))
    sh.putalpha(Image.composite(sh.getchannel('A'), Image.new('L', (W, H), 0), hole))
    im = Image.alpha_composite(sh, ring); d = ImageDraw.Draw(im)
    t = 'MONARCH PRIME PIN'; f = F(30, 'SemiBold'); tw = d.textlength(t, font=f) + 16*6
    x = (W - tw) / 2
    for ch in t: d.text((x, 62), ch, font=f, fill=(41, 171, 226, 255)); x += d.textlength(ch, font=f) + 6
    im.save(B+'/frame.png')
def wrap(d, text, font, maxw):
    lines = []
    for para in text.split('\n'):
        cur = ''
        for w in para.split():
            t = (cur + ' ' + w).strip()
            if d.textlength(t, font=font) <= maxw: cur = t
            else: lines.append(cur); cur = w
        lines.append(cur)
    return lines
def caption(name, text, size=66, cy=1790, color=(255, 255, 255), full=False):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = F(size)
    lines = wrap(d, text, f, 960); lh = int(size * 1.18); y = cy - lh * len(lines) // 2
    if full:  # darken band behind text on live footage
        band = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(band).rectangle((0, y-220, W, H), fill=(3, 6, 14, 215)); band = band.filter(ImageFilter.GaussianBlur(110)); im = Image.alpha_composite(im, band); d = ImageDraw.Draw(im)
    for ln in lines:
        x = (W - d.textlength(ln, font=f)) / 2
        d.text((x+2, y+4), ln, font=f, fill=(0, 0, 0, 170)); d.text((x, y), ln, font=f, fill=color + (255,)); y += lh
    p = f'{B}/cap-{name}.png'; im.save(p); return p
def endcard(name, tagline):
    im = Image.open(B+'/bg.png').convert('RGBA'); d = ImageDraw.Draw(im)
    logo = Image.open(REPO+'/assets/logo-symbol.png').convert('RGBA'); logo.thumbnail((420, 420)); im.alpha_composite(logo, ((W-logo.width)//2, 470))
    def line(t, y, f, fill): d.text(((W - d.textlength(t, font=f)) / 2, y), t, font=f, fill=fill)
    line('Monarch Prime', 940, F(96, 'ExtraBold'), (255, 255, 255)); 
    f = F(96, 'ExtraBold'); w1 = d.textlength('Monarch Prime ', font=f)
    im2 = im.copy(); d = ImageDraw.Draw(im); 
    line('Pin', 1050, F(96, 'ExtraBold'), (245, 135, 31))
    line(tagline, 1215, F(50, 'Medium'), (157, 176, 200))
    bw, bh = 640, 124; bx, by = (W-bw)//2, 1370
    d.rounded_rectangle((bx, by, bx+bw, by+bh), 34, fill=(255, 255, 255)); t = 'Free on the App Store'; f = F(48)
    d.text(((W - d.textlength(t, font=f)) / 2, by + 32), t, font=f, fill=(5, 8, 16))
    line('Personal log. Not medical advice.', 1560, F(34, 'Medium'), (108, 128, 155))
    p = f'{B}/end-{name}.png'; im.convert('RGB').save(p); return p
def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-1500:]); sys.exit(1)
ENC = ['-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-an']
def capchain(caps, dur, nin):
    # caps: [(png, t0, t1)] -> extra inputs + filter steps appended to label [v]
    ins, fl = [], ''
    for i, (png, t0, t1) in enumerate(caps):
        ins += ['-loop', '1', '-t', f'{dur}', '-i', png]
        fl += f";[{nin+i}:v]format=rgba,fade=in:st={t0}:d=0.22:alpha=1[c{i}];[v][c{i}]overlay=0:0:enable='between(t,{t0},{t1})'[v]"
    return ins, fl
def seg(reel, i, kind, src, ss, dur, caps, speed=1.0):
    out = f'{B}/{reel}-{i:02d}.mp4'
    if kind == 'app':
        ins = ['-loop', '1', '-t', f'{dur}', '-i', B+'/bg.png', '-ss', f'{ss}', '-t', f'{dur*speed}', '-i', f'{RAW}/{src}.webm', '-loop', '1', '-t', f'{dur}', '-i', B+'/mask.png', '-loop', '1', '-t', f'{dur}', '-i', B+'/frame.png']
        fl = f"[1:v]setpts=PTS/{speed},fps={FPS},scale={PW}:{PH}:flags=lanczos,format=rgba[c];[c][2:v]alphamerge[cm];[0:v][cm]overlay={PX}:'{PY}+18*pow(max(0,1-t/0.45),3)'[x];[x][3:v]overlay=0:0[v]"
        nin = 4
    elif kind == 'broll':
        ins = ['-ss', f'{ss}', '-t', f'{dur}', '-i', f'{HF}/{src}.mp4']
        fl = f"[0:v]setpts=PTS/{speed},fps={FPS},scale={W}:{H}:flags=lanczos,eq=brightness=-0.04:saturation=1.05[v]"; nin = 1
    else:  # end card
        ins = ['-loop', '1', '-t', f'{dur}', '-i', src]
        fl = f"[0:v]fps={FPS},fade=in:st=0:d=0.5[v]"; nin = 1
    cins, cfl = capchain(caps, dur, nin)
    run(['ffmpeg', '-v', 'error', '-y'] + ins + cins + ['-filter_complex', fl + cfl, '-map', '[v]', '-t', f'{dur}'] + ENC + [out]); return out
def build(reel, vo, segs, total):
    parts = []; t = 0
    for i, s in enumerate(segs):
        dur = s['end'] - t
        caps = [(caption(f'{reel}-{i}-{j}', c[0], **s.get('style', {})), c[1] - t, c[2] - t) for j, c in enumerate(s.get('caps', []))]
        parts.append(seg(reel, i, s['kind'], s['src'], s.get('ss', 0), dur, caps, s.get('speed', 1.0))); t = s['end']
    lst = f'{B}/{reel}.txt'; open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    silent = f'{B}/{reel}-silent.mp4'; run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent])
    out = f'{OUT}/{reel}.mp4'
    af = f"[1:a]adelay=250|250,volume=1.5[vo];[2:a]volume=0.20,afade=in:st=0:d=0.6,afade=out:st={total-1.6}:d=1.6[m];[vo][m]amix=inputs=2:duration=longest:normalize=0,atrim=0:{total},alimiter=limit=0.95[a]"
    run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', f'{HF}/{vo}.mp3', '-i', f'{HF}/music.mp3', '-filter_complex', af, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', f'{total}', '-movflags', '+faststart', out])
    print(reel, 'done'); return out

bg(); mask(); frame()
BIG = dict(size=104, cy=1330, full=True); MID = dict(size=76, cy=1500, full=True)
D = 0.25  # voiceover delay
reels = json.load(open(S+'/reels.json'))
only = sys.argv[2] if len(sys.argv) > 2 else None
for name, r in reels.items():
    if only and only != name: continue
    for s in r['segs']:
        if s['kind'] == 'end': s['src'] = endcard(name, s['tagline'])
        if s.get('style') == 'BIG': s['style'] = BIG
        elif s.get('style') == 'MID': s['style'] = MID
    build(name, r['vo'], r['segs'], r['total'])
