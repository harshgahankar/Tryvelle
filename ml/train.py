"""Fine-tune mini-CatVTON on VITON-HD. Designed for one 16 GB GPU
(Kaggle / Colab T4) with fp16 + gradient checkpointing.

  python train.py --data /kaggle/working/viton --out /kaggle/working/ckpt --steps 8000

Resume: rerun the same command; it picks up <out>/last.pt.
"""
import argparse
import math
import random
import time
from pathlib import Path

import torch
import torch.nn.functional as F
from diffusers import DDPMScheduler
from torch.utils.data import DataLoader

from catvton_mini import BASE, local_base, attn_params, build_inputs, empty_text_embedding, load_unet_vae, save_attn
from dataset import VitonHDPairs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--steps", type=int, default=8000)
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--accum", type=int, default=2, help="gradient accumulation")
    ap.add_argument("--lr", type=float, default=1e-5)
    ap.add_argument("--save-every", type=int, default=500)
    ap.add_argument("--cfg-drop", type=float, default=0.1, help="prob. of hiding the garment (enables guidance)")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--limit", type=int, default=0, help="use only N pairs (smoke tests)")
    ap.add_argument("--base", default=BASE)
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    random.seed(args.seed)
    dev = "cuda"
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    ds = VitonHDPairs(args.data, "train", augment=True)
    if args.limit:
        ds.items = ds.items[: args.limit]
    dl = DataLoader(ds, batch_size=args.batch, shuffle=True, num_workers=args.workers, drop_last=True, pin_memory=True, persistent_workers=args.workers > 0)

    unet, vae = load_unet_vae(args.base, torch.float32, dev)
    vae.to(torch.float16)
    unet.enable_gradient_checkpointing()
    unet.train()
    params = attn_params(unet)
    print(f"trainable params: {sum(p.numel() for p in params) / 1e6:.1f}M of {sum(p.numel() for p in unet.parameters()) / 1e6:.0f}M")

    text = empty_text_embedding(args.base, dev)
    sched = DDPMScheduler.from_pretrained(local_base(args.base), subfolder="scheduler")
    opt = torch.optim.AdamW(params, lr=args.lr, weight_decay=1e-2)
    scaler = torch.amp.GradScaler("cuda")

    step = 0
    last = out / "last.pt"
    if last.exists():
        ck = torch.load(last, map_location="cpu")
        unet.load_state_dict(ck["attn"], strict=False)
        opt.load_state_dict(ck["opt"])
        scaler.load_state_dict(ck["scaler"])
        step = ck["step"]
        print(f"resumed at step {step}")

    def checkpoint(tag):
        save_attn(unet, out / f"attn-{tag}.safetensors")
        torch.save({"attn": {k: v for k, v in unet.state_dict().items() if ".attn1." in k},
                    "opt": opt.state_dict(), "scaler": scaler.state_dict(), "step": step}, last)

    t0 = time.time()
    ema = None
    it = iter(dl)
    while step < args.steps:
        opt.zero_grad(set_to_none=True)
        for _ in range(args.accum):
            try:
                b = next(it)
            except StopIteration:
                it = iter(dl)
                b = next(it)
            person = b["person"].to(dev, non_blocking=True)
            cloth = b["cloth"].to(dev, non_blocking=True)
            mask = b["mask"].to(dev, non_blocking=True)
            bs = person.shape[0]
            drop = torch.rand(bs, device=dev) < args.cfg_drop
            with torch.no_grad():
                target, cond, m = build_inputs(vae, person.half(), cloth.half(), mask.half(), drop)
            target, cond, m = target.float(), cond.float(), m.float()
            noise = torch.randn_like(target)
            t = torch.randint(0, sched.config.num_train_timesteps, (bs,), device=dev).long()
            noisy = sched.add_noise(target, noise, t)
            inp = torch.cat([noisy, m, cond], dim=1)
            with torch.autocast("cuda", dtype=torch.float16):
                pred = unet(inp, t, encoder_hidden_states=text.expand(bs, -1, -1)).sample
            half = target.shape[-1] // 2  # loss only on the person half
            loss = F.mse_loss(pred[..., :half].float(), noise[..., :half])
            scaler.scale(loss / args.accum).backward()
        scaler.unscale_(opt)
        torch.nn.utils.clip_grad_norm_(params, 1.0)
        scaler.step(opt)
        scaler.update()
        step += 1
        lv = loss.item()
        ema = lv if ema is None or math.isnan(ema) else 0.98 * ema + 0.02 * lv
        if step % 25 == 0:
            el = time.time() - t0
            print(f"step {step}/{args.steps}  loss {ema:.4f}  {el / 60:.1f} min  mem {torch.cuda.max_memory_allocated() / 2**30:.1f} GB", flush=True)
        if step % args.save_every == 0:
            checkpoint(step)
    checkpoint("final")
    print("done:", out / "attn-final.safetensors")


if __name__ == "__main__":
    main()
