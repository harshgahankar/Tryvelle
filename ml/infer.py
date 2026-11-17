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
from PIL import Image, ImageDraw, ImageFilter, ImageOps

from catvton_mini import BASE, build_inputs, cat_w, empty_text_embedding, encode, load_attn, load_unet_vae, local_base
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


def detect_pose(img: Image.Image):
    """MediaPipe pose landmarks (normalised 0-1) of the first person, or None."""
    import mediapipe as mp
    from mediapipe.tasks import python as mpt
    from mediapipe.tasks.python import vision

    opts = vision.PoseLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path=str(POSE_MODEL)), num_poses=1)
    with vision.PoseLandmarker.create_from_options(opts) as lm:
        res = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img.convert("RGB"))))
    return res.pose_landmarks[0] if res.pose_landmarks else None


def person_crop(img: Image.Image):
    """3:4 box around head-to-thighs of the person, so a small person in a big photo
    fills the 384x512 model input. Returns None when cropping would not help."""
    p = detect_pose(img)
    if p is None:
        return None
    pt = lambda i: np.array([p[i].x * img.width, p[i].y * img.height])
    sh, hip, nose = (pt(11) + pt(12)) / 2, (pt(23) + pt(24)) / 2, pt(0)
    torso = max(hip[1] - sh[1], np.linalg.norm(pt(11) - pt(12)) * 1.2)
    h = torso * 2.6  # head above, torso, and the hem of a long kurti below the hips
    w = h * W / H
    w = max(w, np.ptp([pt(i)[0] for i in (11, 12, 13, 14, 15, 16)]) * 1.4)
    h = w * H / W
    cx, top = sh[0], nose[1] - torso * 0.55
    x0 = int(np.clip(cx - w / 2, 0, max(img.width - w, 0)))
    y0 = int(np.clip(top, 0, max(img.height - h, 0)))
    box = (x0, y0, int(min(x0 + w, img.width)), int(min(y0 + h, img.height)))
    if (box[2] - box[0]) * (box[3] - box[1]) > 0.8 * img.width * img.height:
        return None
    return box


def auto_mask(person: Image.Image) -> Image.Image:
    """Upper-body clothing mask from pose landmarks."""
    p = detect_pose(person)
    if p is None:
        raise SystemExit("No person detected. Use a front-facing photo with shoulders and hips visible, or pass --mask.")
    pt = lambda i: np.array([p[i].x * W, p[i].y * H])
    ls, rs, le, re, lw, rw, lh, rh, nose = (pt(i) for i in (11, 12, 13, 14, 15, 16, 23, 24, 0))
    span = np.linalg.norm(ls - rs)
    out = lambda a, b, k: a + (a - b) / (np.linalg.norm(a - b) + 1e-6) * span * k  # push a away from b
    # hips may be out of frame: extrapolate down from the shoulders
    if min(p[23].visibility, p[24].visibility) < 0.3:
        down = np.array([0, span * 1.6])
        lh, rh = ls + down, rs + down
    # Generous mask: leftover old clothing (collar, hem, cuffs) leaks its colour into the result.
    mid = (ls + rs) / 2
    up = nose - mid
    collar_l = ls + (mid - ls) * 0.55 + up * 0.55  # high-neck collars sit well above the shoulders
    collar_r = rs + (mid - rs) * 0.55 + up * 0.55
    torso = [out(ls, rs, 0.3) - [0, span * 0.1], collar_l, collar_r, out(rs, ls, 0.3) - [0, span * 0.1],
             out(rh, lh, 0.35) + [0, span * 0.6], out(lh, rh, 0.35) + [0, span * 0.6]]
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    d.polygon([tuple(x) for x in torso], fill=255)
    arm_w = int(span * 0.5)
    for s_, e_, w_ in ((ls, le, lw), (rs, re, rw)):
        d.line([tuple(s_), tuple(e_), tuple(w_)], fill=255, width=arm_w, joint="curve")
    m = m.filter(ImageFilter.MaxFilter(15))
    # Never repaint the face (a raised hand or high collar can pull the mask over it).
    # Oval from the face landmarks (eyes, ears, mouth), padded and reaching down to the chin.
    face = np.array([pt(i) for i in range(11)])
    fw = max(np.ptp(face[:, 0]), span * 0.35)
    cx, top = face[:, 0].mean(), face[:, 1].min()
    chin = max(face[9:11, 1].max(), nose[1]) + fw * 0.45
    ImageDraw.Draw(m).ellipse([cx - fw * 0.7, top - fw * 0.6, cx + fw * 0.7, chin], fill=0)
    return m


class TryOn:
    """Loads the model once; call run() for each photo (used by infer.py and serve.py)."""

    def __init__(self, attn, base=BASE):
        self.dev = "cuda" if torch.cuda.is_available() else "cpu"
        self.dt = torch.float16 if self.dev == "cuda" else torch.float32
        if self.dev == "cpu":
            print("WARNING: no CUDA GPU found — this will take several minutes per image.")
        self.unet, self.vae = load_unet_vae(base, self.dt, self.dev)
        print(f"loaded {load_attn(self.unet, attn)} attention tensors")
        self.text = empty_text_embedding(base, self.dev, self.dt)
        self.sched = DDIMScheduler.from_pretrained(local_base(base), subfolder="scheduler")

    @torch.no_grad()
    def run(self, full: Image.Image, garment: Image.Image, mask_img=None, steps=30, guidance=2.5, seed=42):
        """full: person photo (any size). Returns (result at full size, mask used)."""
        full = ImageOps.exif_transpose(full).convert("RGB")
        crop = None if mask_img is not None else person_crop(full)
        src = full.crop(crop) if crop else full
        person_img, box = fit(src)
        cloth_img, _ = fit(garment)
        mask_img = mask_img.convert("L").resize((W, H)) if mask_img is not None else auto_mask(person_img)

        dev, dt, vae, sched = self.dev, self.dt, self.vae, self.sched
        person = to_tensor(person_img)[None].to(dev, dt)
        cloth = to_tensor(cloth_img)[None].to(dev, dt)
        mask = torch.from_numpy((np.asarray(mask_img) > 127).astype(np.float32))[None, None].to(dev, dt)

        _, cond, m = build_inputs(vae, person, cloth, mask)
        _, cond_u, _ = build_inputs(vae, person, torch.zeros_like(cloth), mask)

        sched.set_timesteps(steps, device=dev)
        g = torch.Generator(dev).manual_seed(seed)
        lat = torch.randn(cond.shape, generator=g, device=dev, dtype=dt) * sched.init_noise_sigma
        emb = self.text.expand(2, -1, -1)
        # Training only scored the person half; the garment half of the noisy input was always
        # the real garment latent plus noise. Recreate that at every step so attention can read it.
        half = lat.shape[-1] // 2
        clean = encode(vae, cat_w(person, cloth), sample=False)
        g_noise = torch.randn(clean.shape, generator=g, device=dev, dtype=dt)
        for t in sched.timesteps:
            lat[..., half:] = sched.add_noise(clean, g_noise, t.reshape(1))[..., half:]
            x = torch.cat([torch.cat([lat, m, cond], 1), torch.cat([lat, m, cond_u], 1)])
            eps_c, eps_u = self.unet(x, t, encoder_hidden_states=emb).sample.chunk(2)
            eps = eps_u + guidance * (eps_c - eps_u)
            lat = sched.step(eps, t, lat).prev_sample

        img = vae.decode(lat / vae.config.scaling_factor).sample[0, :, :, :W]
        gen = Image.fromarray(((img.float().clamp(-1, 1) + 1) * 127.5).permute(1, 2, 0).cpu().numpy().astype(np.uint8))

        # keep everything outside the (feathered) mask from the original photo
        soft = mask_img.filter(ImageFilter.GaussianBlur(4))
        result = Image.composite(gen, person_img, soft)
        x, y, w, h = box
        result = result.crop((x, y, x + w, y + h)).resize(src.size, Image.LANCZOS)
        if crop:
            full.paste(result, crop[:2])
            result = full
        return result, mask_img


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

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    model = TryOn(args.attn, args.base)
    result, mask_img = model.run(Image.open(args.person), Image.open(args.garment),
                                 Image.open(args.mask) if args.mask else None,
                                 args.steps, args.guidance, args.seed)
    if args.save_mask:
        mask_img.save(Path(args.out).with_suffix(".mask.png"))
    result.save(args.out)
    print("saved", args.out)


if __name__ == "__main__":
    main()
