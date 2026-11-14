"""Mini-CatVTON: our own re-implementation of the idea in
"CatVTON: Concatenation Is All You Need for Virtual Try-On with Diffusion
Models" (Chong et al., ICLR 2025, arXiv:2407.15886).

Idea:
  * Base: Stable Diffusion 1.5 *inpainting* UNet (9 input channels:
    noisy latent 4 + mask 1 + masked-image latent 4). Licence: OpenRAIL-M.
  * Put the masked person and the garment side by side (concat on width),
    so plain self-attention can copy garment detail into the person half.
  * No text: a fixed empty-prompt embedding is used.
  * Train only the self-attention layers ("attn1") — ~10% of the UNet.
"""
import os
from pathlib import Path

# Keep downloaded models next to the code (D: drive), not in the C: user cache.
# Set HF_HOME yourself to override.
os.environ.setdefault("HF_HOME", str(Path(__file__).resolve().parent / ".cache" / "hf"))

import torch  # noqa: E402
import torch.nn.functional as F  # noqa: E402
from diffusers import AutoencoderKL, UNet2DConditionModel  # noqa: E402
from safetensors.torch import load_file, save_file  # noqa: E402

BASE = "stable-diffusion-v1-5/stable-diffusion-inpainting"


def cat_w(a, b):
    return torch.cat([a, b], dim=-1)


_FILES = ["*.json", "*.txt", "unet/*.fp16.safetensors", "vae/*.fp16.safetensors", "text_encoder/*.fp16.safetensors"]


def local_base(base=BASE) -> str:
    """Download only the fp16 files we need (once, ~2 GB), return the local folder.
    Loading from a folder avoids any further network calls."""
    if Path(base).is_dir():
        return base
    from huggingface_hub import snapshot_download
    return snapshot_download(base, allow_patterns=_FILES)


def load_unet_vae(base=BASE, dtype=torch.float32, device="cuda"):
    root = local_base(base)
    # fp16 files halve the download; weights are cast to `dtype` on load.
    unet = UNet2DConditionModel.from_pretrained(root, subfolder="unet", variant="fp16", torch_dtype=dtype).to(device)
    vae = AutoencoderKL.from_pretrained(root, subfolder="vae", variant="fp16", torch_dtype=dtype).to(device)
    vae.requires_grad_(False)
    return unet, vae


@torch.no_grad()
def empty_text_embedding(base=BASE, device="cuda", dtype=torch.float32):
    """Encode "" once, then drop the text encoder to save memory."""
    from transformers import CLIPTextModel, CLIPTokenizer
    root = Path(local_base(base))
    tok = CLIPTokenizer.from_pretrained(root / "tokenizer")
    enc = CLIPTextModel.from_pretrained(root / "text_encoder", variant="fp16", use_safetensors=True).float().to(device)
    ids = tok([""], padding="max_length", max_length=tok.model_max_length, return_tensors="pt").input_ids.to(device)
    emb = enc(ids)[0].to(dtype)
    del enc
    torch.cuda.empty_cache()
    return emb  # 1x77x768


def attn_params(unet):
    unet.requires_grad_(False)
    params = []
    for name, p in unet.named_parameters():
        if ".attn1." in name:
            p.requires_grad_(True)
            params.append(p)
    return params


def save_attn(unet, path):
    sd = {k: v.detach().to(torch.float16).cpu().contiguous() for k, v in unet.state_dict().items() if ".attn1." in k}
    save_file(sd, str(path))


def load_attn(unet, path):
    sd = load_file(str(path))
    missing = [k for k in sd if k not in unet.state_dict()]
    if missing:
        raise ValueError(f"checkpoint keys not in UNet, e.g. {missing[:3]}")
    unet.load_state_dict(sd, strict=False)
    return len(sd)


def encode(vae, x, sample=True):
    d = vae.encode(x.to(vae.dtype)).latent_dist
    z = d.sample() if sample else d.mode()
    return z * vae.config.scaling_factor


def build_inputs(vae, person, cloth, mask, drop_cloth=None):
    """Returns (target_latent, cond_latent, mask_latent).
    drop_cloth: optional bool tensor (B,) — zero the garment for CFG training."""
    masked = person * (1 - mask)
    cond_cloth = cloth
    if drop_cloth is not None and drop_cloth.any():
        cond_cloth = torch.where(drop_cloth[:, None, None, None], torch.zeros_like(cloth), cloth)
    target = encode(vae, cat_w(person, cloth), sample=True)
    cond = encode(vae, cat_w(masked, cond_cloth), sample=False)
    m = F.interpolate(cat_w(mask, torch.zeros_like(mask)), size=target.shape[-2:], mode="nearest")
    return target, cond, m
