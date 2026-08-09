"""
service.dynamic — the Dynamic Movement Analysis pipeline.

Layer 1 (this package's layer1_spine) is position-agnostic infrastructure: decode a
clip, run VIDEO-mode pose, select the primary subject, and emit a per-frame series of
image + world landmarks with monotonic timestamps and honest per-region confidence.

It deliberately does NOT read the ruleset, compute any measurement, or produce any
verdict. Those are Layer 2 (phase detection) and Layer 3 (ruleset resolution), built on
top of the series this layer produces.
"""
