# Mini-CatVTON — AI try-on photo (college project)

Our own small re-implementation of the idea from **CatVTON** (Chong et al., ICLR 2025,
arXiv:2407.15886): put the masked person and the garment side by side, and fine-tune
only the self-attention layers of **Stable Diffusion 1.5 inpainting**.

| Piece | Where it runs | Licence |
|---|---|---|
| Base model `stable-diffusion-v1-5/stable-diffusion-inpainting` | downloaded automatically (~2 GB) | CreativeML OpenRAIL-M |
| Dataset **VITON-HD** (11,647 training pairs) | you download it | **CC BY-NC 4.0 — non-commercial only** |
| Training (`train.py`) | free **Kaggle** GPU (T4 16 GB) | — |
| Running it (`infer.py`) | your laptop (RTX 3050 6 GB) | — |

> ⚠️ Anything trained on VITON-HD is **non-commercial**. Fine for the college project and demo,
> not for selling to real customers. Cite the VITON-HD and CatVTON papers in your report.

Everything (models, pip cache, checkpoints) is stored inside `ml/` on the D: drive.
`catvton_mini.py` sets `HF_HOME=ml/.cache/hf` automatically.

---

## 1. Laptop setup (once)

Your system Python already has PyTorch 2.9 + CUDA, so the venv reuses it.

```bash
cd D:/HARSH/projects/tryon/ml
```

```bash
python -m venv --system-site-packages .venv
```

```bash
PIP_CACHE_DIR=.cache/pip .venv/Scripts/python -m pip install -r requirements.txt
```

Check the GPU is visible:

```bash
.venv/Scripts/python -c "import torch; print(torch.cuda.get_device_name(0))"
```

## 2. Train on Kaggle (free GPU)

Your 6 GB laptop GPU can run the model but is too small to train it at full size.
Kaggle gives ~30 free GPU hours a week.

1. Sign in at kaggle.com → **Settings → Phone verification** (needed for GPUs).
2. **Create → New Notebook**. In the right panel: **Accelerator → GPU T4 x2**, **Internet → On**.
3. Upload the four files `dataset.py`, `catvton_mini.py`, `train.py`, `requirements.txt`:
   **Add Input → Upload → New Dataset** (name it `mini-catvton-code`).
4. Paste these cells and run them one by one:

```python
# Cell 1 — code + libraries
!cp /kaggle/input/mini-catvton-code/*.py /kaggle/input/mini-catvton-code/requirements.txt /kaggle/working/
%cd /kaggle/working
!pip install -q diffusers==0.32.2 transformers==4.48.3 accelerate==1.3.0 "huggingface_hub<1.0" gdown
```

```python
# Cell 2 — VITON-HD (~4.5 GB) from the authors' Google Drive link
!gdown 1tLx8LRp-sxDp0EcYmYoV_vXdSc-jJ79w -O viton.zip
!unzip -q viton.zip -d viton && rm viton.zip
!ls viton   # expect: test  test_pairs.txt  train  train_pairs.txt
```

If `gdown` says the file is over quota, download the zip from
https://github.com/shadow2496/VITON-HD (Dataset section) on your PC, upload it as a
private Kaggle dataset, and `unzip /kaggle/input/<name>/*.zip -d viton` instead.
If the zip unpacks into a sub-folder, point `--data` at the folder that contains `train_pairs.txt`.

```python
# Cell 3 — quick check: 20 steps (~1 min)
!python train.py --data viton --out ckpt --steps 20 --save-every 20 --limit 64
```

```python
# Cell 4 — real training. ~8000 steps ≈ 6–9 h on a T4. Saves every 500 steps.
!rm -rf ckpt && python train.py --data viton --out ckpt --steps 8000
```

Kaggle stops a session after 12 h. To keep checkpoints, use **Save Version → Save & Run All
(commit)**, or download `ckpt/attn-XXXX.safetensors` (~100 MB each) from the Output panel.
To **resume**, put `ckpt/last.pt` back in `ckpt/` and run the same Cell 4 command without `rm -rf`.

Watch the `loss` value: it should fall from ~0.1–0.2 and level off. Try a checkpoint early (step 1000–2000)
so you know the whole pipeline works before spending all your GPU hours.

## 3. Run it on your laptop

Copy the checkpoint you want to `ml/ckpt/attn-final.safetensors`, then:

```bash
.venv/Scripts/python infer.py --person me.jpg --garment "../backend/media/sample/Green Checked Full Sleeves Shirt/green-checked-full-sleeve-shirt-png.png" --attn ckpt/attn-final.safetensors --out out/me-green.png --save-mask
```

- `--save-mask` also writes `out/me-green.mask.png`. White = the area that gets replaced. If it is wrong,
  paint your own in any editor and pass `--mask my-mask.png`.
- `--steps 30` (quality vs speed), `--guidance 2.5` (higher = sticks closer to the garment), `--seed` for variations.
- Use a front-facing photo, standing, with shoulders and hips visible and plain light.

## Tips & known limits

- **VITON-HD contains only women in tops.** Kurtis/tops on women will work best; men's shirts will be
  weaker. For a better men's result, add your own paired photos (person wearing shirt + flat shirt photo)
  in the same folder layout and train further from your checkpoint.
- 512×384 output — the model is a lot smaller than commercial services. Faces and background are
  kept exactly from your photo; only the clothing area is generated.
- `--limit` and `--steps` are your friends while testing.

## Files

- `dataset.py` — VITON-HD loader; builds the clothing mask from `image` vs `agnostic-v3.2`.
- `catvton_mini.py` — model loading, side-by-side inputs, save/load of the trained attention weights.
- `train.py` — fp16 + gradient checkpointing; trains 49.6 M of 860 M UNet parameters.
- `infer.py` — pose-based auto mask (MediaPipe), DDIM sampling with classifier-free guidance.
