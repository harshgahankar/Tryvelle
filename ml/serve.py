"""Run the try-on model on this PC (RTX 3050). Keeps the model loaded so each
photo takes ~10-30 s. Listens on 127.0.0.1 only; the Tryvelle backend calls it.

  .venv/Scripts/python serve.py            # port 8001
  .venv/Scripts/python serve.py --port 8001 --attn ckpt/attn-final.safetensors

API: see api.py. For the cloud version see modal_app.py.
"""
import argparse
from pathlib import Path

import uvicorn

from api import create_app
from infer import TryOn


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8001)
    ap.add_argument("--attn", default=str(here / "ckpt" / "attn-final.safetensors"))
    args = ap.parse_args()
    model = TryOn(args.attn)
    print(f"try-on model ready on http://127.0.0.1:{args.port}")
    uvicorn.run(create_app(lambda: model), host="127.0.0.1", port=args.port, access_log=False)


if __name__ == "__main__":
    main()
