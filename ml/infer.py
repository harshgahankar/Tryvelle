"""Run a trained mini-CatVTON on your laptop (RTX 3050 6 GB is enough).

  python infer.py --person me.jpg --garment shirt.png --attn ckpt/attn-final.safetensors --out result.png

* --garment may be a transparent PNG (e.g. Tryvelle try-on assets); it is
  put on white like the VITON-HD cloth photos.
* The clothing mask is drawn automatically from MediaPipe pose landmarks
  (torso + upper arms). Pass --mask mask.png (white = replace) to override,
  and --save-mask to inspect the automatic one.
* Only the masked area is regenerated; face and background are kept
  pixel-exact.
"""
import argparse
from pathlib import Path

import numpy as np
import torch
from diffusers import DDIMScheduler
from PIL import Image, ImageDraw, ImageFilter

from catvton_mini import BASE, local_base, build_inputs, empty_text_embedding, load_attn, load_unet_vae
from dataset import H, W, to_tensor

ROOT = Path(__file__).resolve().parent
POSE_MODEL = ROOT.parent / "frontend" / "public" / "vendor" / "models" / "pose_landmarker_lite.task"


def fit(img: Image.Image, bg=(255, 255, 255)) -> tuple[Image.Image, tuple]:
    """Letterbox to 384x512 (3:4). Returns image and the paste box for undoing."""
    if img.mode == "RGBA":
        flat = Image.new("RGB", img.size, bg)
        flat.paste(img, mask=img.split()[3])
        img = flat
    img = img.convert("RGB")
    s = min(W / img.width, H / img.height)
    nw, nh = round(img.width * s), round(img.height * s)
    canvas = Image.new("RGB", (W, H), bg)
    box = ((W - nw) // 2, (H - nh) // 2)
    canvas.paste(img.resize((nw, nh), Image.LANCZOS), box)
    return canvas, (box[0], box[1], nw, nh)


def auto_mask(person: Image.Image) -> Image.Image:
    """Upper-body clothing mask from pose landmarks."""
    import mediapipe as mp
    from mediapipe.tasks import python as mpt
    from mediapipe.tasks.python import vision

    opts = vision.PoseLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path=str(POSE_MODEL)), num_poses=1)
    with vision.PoseLandmarker.create_from_options(opts) as lm:
        res = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(person)))
    if not res.pose_landmarks:
        raise SystemExit("No person detected. Use a front-facing photo with shoulders and hips visible, or pass --mask.")
    p = res.pose_landmarks[0]
    pt = lambda i: np.array([p[i].x * W, p[i].y * H])
    ls, rs, le, re, lw, rw, lh, rh, nose = (pt(i) for i in (11, 12, 13, 14, 15, 16, 23, 24, 0))
    span = np.linalg.norm(ls - rs)
    out = lambda a, b, k: a + (a - b) / (np.linalg.norm(a - b) + 1e-6) * span * k  # push a away from b
    # hips may be out of frame: extrapolate down from the shoulders
    if min(p[23].visibility, p[24].visibility) < 0.3:
        down = np.array([0, span * 1.6])
        lh, rh = ls + down, rs + down
    neck = (ls + rs) / 2 + (nose - (ls + rs) / 2) * 0.25
    torso = [out(ls, rs, 0.22) - [0, span * 0.08], neck, out(rs, ls, 0.22) - [0, span * 0.08],
             out(rh, lh, 0.25) + [0, span * 0.25], out(lh, rh, 0.25) + [0, span * 0.25]]
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    d.polygon([tuple(x) for x in torso], fill=255)
    arm_w = int(span * 0.42)
    for s_, e_, w_ in ((ls, le, lw), (rs, re, rw)):
        d.line([tuple(s_), tuple(e_), tuple(e_ + (w_ - e_) * 0.6)], fill=255, width=arm_w, joint="curve")
    return m.filter(ImageFilter.MaxFilter(15))


@torch.no_grad()
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--person", required=True)
    ap.add_argument("--garment", required=True)
    ap.add_argument("--attn", required=True, help="attn-*.safetensors from train.py")
    ap.add_argument("--out", default="result.png")
    ap.add_argument("--mask")
    ap.add_argument("--save-mask", action="store_true")
    ap.add_argument("--steps", type=int, default=30)
    ap.add_argument("--guidance", type=float, default=2.5)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--base", default=BASE)
    args = ap.parse_args()

    dev = "cuda" if torch.cuda.is_available() else "cpu"
    dt = torch.float16 if dev == "cuda" else torch.float32
    if dev == "cpu":
        print("WARNING: no CUDA GPU found — this will take several minutes.")

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    src = Image.open(args.person)
    person_img, box = fit(src)
    cloth_img, _ = fit(Image.open(args.garment))
    mask_img = Image.open(args.mask).convert("L").resize((W, H)) if args.mask else auto_mask(person_img)
    if args.save_mask:
        mask_img.save(Path(args.out).with_suffix(".mask.png"))

    unet, vae = load_unet_vae(args.base, dt, dev)
    n = load_attn(unet, args.attn)
    print(f"loaded {n} attention tensors")
    text = empty_text_embedding(args.base, dev, dt)

    person = to_tensor(person_img)[None].to(dev, dt)
    cloth = to_tensor(cloth_img)[None].to(dev, dt)
    mask = torch.from_numpy((np.asarray(mask_img) > 127).astype(np.float32))[None, None].to(dev, dt)

    _, cond, m = build_inputs(vae, person, cloth, mask)
    _, cond_u, _ = build_inputs(vae, person, torch.zeros_like(cloth), mask)

    sched = DDIMScheduler.from_pretrained(local_base(args.base), subfolder="scheduler")
    sched.set_timesteps(args.steps, device=dev)
    g = torch.Generator(dev).manual_seed(args.seed)
    lat = torch.randn(cond.shape, generator=g, device=dev, dtype=dt) * sched.init_noise_sigma
    emb = text.expand(2, -1, -1)
    for t in sched.timesteps:
        x = torch.cat([torch.cat([lat, m, cond], 1), torch.cat([lat, m, cond_u], 1)])
        eps_c, eps_u = unet(x, t, encoder_hidden_states=emb).sample.chunk(2)
        eps = eps_u + args.guidance * (eps_c - eps_u)
        lat = sched.step(eps, t, lat).prev_sample

    img = vae.decode(lat / vae.config.scaling_factor).sample[0, :, :, :W]
    gen = Image.fromarray(((img.float().clamp(-1, 1) + 1) * 127.5).permute(1, 2, 0).cpu().numpy().astype(np.uint8))

    # keep everything outside the (feathered) mask from the original photo
    soft = mask_img.filter(ImageFilter.GaussianBlur(4))
    result = Image.composite(gen, person_img, soft)
    x, y, w, h = box
    result = result.crop((x, y, x + w, y + h)).resize(src.size, Image.LANCZOS)
    result.save(args.out)
    print("saved", args.out)


if __name__ == "__main__":
    main()
