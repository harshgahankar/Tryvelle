"""Host the try-on model on Modal (serverless GPU, pay per second, sleeps when idle).

One-time setup, from the ml/ folder:
  pip install modal
  python -m modal setup                                   # log in (opens the browser)
  python -m modal secret create tryvelle-tryon TRYON_SECRET=<long random string>
Deploy (re-run after changing the model code or weights):
  python -m modal deploy modal_app.py
It prints a URL like https://<you>--tryvelle-tryon-model-web.modal.run
Put that in Render as TRYON_MODEL_URL and the same secret as TRYON_SECRET.
"""
from pathlib import Path

import modal

HERE = Path(__file__).resolve().parent
BASE = "stable-diffusion-v1-5/stable-diffusion-inpainting"
FILES = ["*.json", "*.txt", "unet/*.fp16.safetensors", "vae/*.fp16.safetensors", "text_encoder/*.fp16.safetensors"]


def download_base():
    """Runs once at image build: bakes the ~2 GB base model into the image (no download per start)."""
    from huggingface_hub import snapshot_download
    snapshot_download(BASE, allow_patterns=FILES)


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0")  # mediapipe / opencv runtime libs
    .pip_install("torch==2.5.1", "torchvision==0.20.1", index_url="https://download.pytorch.org/whl/cu121")
    .pip_install(
        "diffusers==0.32.2", "transformers==4.48.3", "accelerate==1.3.0", "huggingface_hub>=0.26,<1.0",
        "safetensors>=0.4", "pillow>=10", "numpy<2", "mediapipe==0.10.21",
        "fastapi[standard]==0.115.12", "python-multipart",
    )
    .env({"HF_HOME": "/hf"})
    .run_function(download_base)
    # Code + trained weights (~100 MB) + pose model. Must be the last step.
    .add_local_dir(HERE, "/root/ml", ignore=["*.jpg", "*.jpeg", "*.png", ".venv", ".cache", "out", "data", "__pycache__"])
)

app = modal.App("tryvelle-tryon", image=image)


@app.cls(
    gpu="T4",                      # 16 GB, the cheapest GPU; plenty for SD 1.5 at 512x384
    secrets=[modal.Secret.from_name("tryvelle-tryon")],
    scaledown_window=120,          # stay warm 2 min after a request, then sleep (no cost)
    max_containers=1,              # one GPU at most: caps the bill
    timeout=300,
)
class Model:
    @modal.enter()
    def load(self):
        import sys
        sys.path.insert(0, "/root/ml")
        from infer import TryOn
        self.model = TryOn("/root/ml/ckpt/attn-final.safetensors")

    @modal.asgi_app()
    def web(self):
        import sys
        sys.path.insert(0, "/root/ml")
        from api import create_app
        return create_app(lambda: self.model)
