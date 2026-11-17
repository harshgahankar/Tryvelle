"""Local try-on model service. Keeps the model loaded so each photo takes ~10-30 s
instead of reloading every time. Only listens on 127.0.0.1; the Tryvelle backend
calls it, browsers never do.

  .venv/Scripts/python serve.py            # port 8001
  .venv/Scripts/python serve.py --port 8001 --attn ckpt/attn-final.safetensors

POST /tryon?garment=<path to garment PNG>   body: the person photo (JPEG/PNG bytes)
  -> 200 image/png (result)  |  422 text (e.g. no person found)  |  4xx/5xx text
GET  /health -> "ok"
Photos are processed in memory and never written to disk.
"""
import argparse
import io
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from PIL import Image, UnidentifiedImageError

from infer import TryOn

MAX_BYTES = 15 * 1024 * 1024
MAX_SIDE = 2048  # downscale huge phone photos first; the model works at 512x384 anyway


class Handler(BaseHTTPRequestHandler):
    model: TryOn = None
    lock = threading.Lock()  # one GPU job at a time
    garment_root: Path = None

    def _send(self, code, body: bytes, ctype="text/plain; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == "/health":
            return self._send(200, b"ok")
        self._send(404, b"not found")

    def do_POST(self):
        url = urlparse(self.path)
        if url.path != "/tryon":
            return self._send(404, b"not found")
        garment = parse_qs(url.query).get("garment", [""])[0]
        gpath = (self.garment_root / garment).resolve()
        if not garment or self.garment_root not in gpath.parents or not gpath.is_file():
            return self._send(400, b"unknown garment")
        n = int(self.headers.get("Content-Length") or 0)
        if not 0 < n <= MAX_BYTES:
            return self._send(413, b"photo missing or larger than 15 MB")
        try:
            person = Image.open(io.BytesIO(self.rfile.read(n)))
            person.load()
        except (UnidentifiedImageError, OSError):
            return self._send(415, b"not an image")
        person.thumbnail((MAX_SIDE, MAX_SIDE))
        try:
            with self.lock:
                result, _ = self.model.run(person, Image.open(gpath))
        except SystemExit as e:  # auto_mask: no person detected
            return self._send(422, str(e).encode())
        buf = io.BytesIO()
        result.save(buf, "JPEG", quality=92)
        self._send(200, buf.getvalue(), "image/jpeg")

    def log_message(self, fmt, *args):  # no request details (photos are private)
        pass


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8001)
    ap.add_argument("--attn", default=str(here / "ckpt" / "attn-final.safetensors"))
    ap.add_argument("--garments", default=str(here.parent / "backend" / "media"),
                    help="garment paths are resolved inside this folder")
    args = ap.parse_args()
    Handler.garment_root = Path(args.garments).resolve()
    Handler.model = TryOn(args.attn)
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"try-on model ready on http://127.0.0.1:{args.port}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
