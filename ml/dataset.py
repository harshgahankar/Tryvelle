"""VITON-HD loader for mini-CatVTON training.

Expected layout (the official zip unpacks to this):
  <root>/train_pairs.txt            "00000_00.jpg 00000_00.jpg" per line
  <root>/train/image/*.jpg          person photo
  <root>/train/agnostic-v3.2/*.jpg  same photo with clothing area greyed out
  <root>/train/cloth/*.jpg          flat garment photo
  (test_* the same)

The inpainting mask is recovered from image vs agnostic difference, so we
don't need the parsing maps. Dataset licence: CC BY-NC 4.0 (non-commercial).
"""
import random
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torch.utils.data import Dataset

H, W = 512, 384


def to_tensor(img: Image.Image) -> torch.Tensor:
    """PIL RGB -> float tensor in [-1, 1], shape 3xHxW."""
    a = np.asarray(img.convert("RGB"), dtype=np.float32) / 127.5 - 1.0
    return torch.from_numpy(a).permute(2, 0, 1).contiguous()


def mask_from_agnostic(person: torch.Tensor, agnostic: torch.Tensor, thresh: float = 0.12) -> torch.Tensor:
    """1 where the agnostic image differs from the person (the clothing area)."""
    diff = (person - agnostic).abs().mean(0, keepdim=True)
    m = (diff > thresh).float()
    # close small holes, then drop speckles
    m = -F.max_pool2d(-F.max_pool2d(m[None], 9, 1, 4), 9, 1, 4)[0]
    return m


def dilate(mask: torch.Tensor, px: int) -> torch.Tensor:
    if px <= 0:
        return mask
    k = px * 2 + 1
    return F.max_pool2d(mask[None], k, 1, px)[0]


class VitonHDPairs(Dataset):
    def __init__(self, root, split="train", augment=True, size=(H, W)):
        self.root = Path(root)
        self.split = split
        self.augment = augment
        self.h, self.w = size
        lines = (self.root / f"{split}_pairs.txt").read_text().split("\n")
        # Training is always "paired": person is wearing the given cloth.
        self.items = [ln.split()[0] for ln in lines if ln.strip()]

    def __len__(self):
        return len(self.items)

    def _load(self, sub, name):
        img = Image.open(self.root / self.split / sub / name).convert("RGB")
        return img.resize((self.w, self.h), Image.BICUBIC)

    def __getitem__(self, i):
        name = self.items[i]
        person = to_tensor(self._load("image", name))
        agnostic = to_tensor(self._load("agnostic-v3.2", name))
        cloth = to_tensor(self._load("cloth", name))
        mask = mask_from_agnostic(person, agnostic)
        if self.augment:
            # Inference masks come from rough pose polygons, so train on
            # sloppier, larger masks too.
            mask = dilate(mask, random.randint(0, 12))
            if random.random() < 0.5:
                person, cloth, mask = person.flip(-1), cloth.flip(-1), mask.flip(-1)
        return {"person": person, "cloth": cloth, "mask": mask, "name": name}
