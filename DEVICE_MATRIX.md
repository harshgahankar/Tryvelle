# Device test matrix — fill one row per run (M1 acceptance gate)

Copy this row per device. Pass = tracking locks in good light, guides readable,
stale overlay hides on tracking loss, camera light stops on every close path.

| Date | Device + OS | Browser + version | Viewport / orient. | Cam res | Light | FPS | Inference ms | Deny/no-cam/busy | Partial torso | Move | Route exit | BG/resume | Notes | Pass? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| _eg_ | Laptop Win11 | Chrome 131 | 1280×720 land | 720p | daylight |  |  |  |  |  |  |  |  |  |
| _eg_ | Android phone | Chrome mobile | 390×844 port | 720p | indoor |  |  |  |  |  |  |  | stand suggested |  |

Also verify in network inspection per run: no frame/landmark leaves the browser.
