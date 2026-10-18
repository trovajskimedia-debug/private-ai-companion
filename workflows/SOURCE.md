# Z-Image-Turbo workflow provenance

Source: https://github.com/Comfy-Org/workflow_templates/blob/59a3b48bf369c5a15f29a1308bae3e279fa15505/templates/image_z_image_turbo.json

Upstream file SHA-256: `baaf937ff071970cc6b1e2fa0093a4dd664a4cc734d38adc4c7810e535c1f1d3`. MIT license: see COMFY-LICENSE.txt.

The public UI workflow is the unmodified upstream file. The API JSON flattens its single subgraph, preserves original node IDs/connections and widget values, and connects the original SaveImage node to the original VAEDecode output. The frontend-only sampler control_after_generate widget is omitted. No inference or model weights are bundled.

The application imports this JSON as a selectable template; it does not assume these node IDs when binding prompts, models, seed or image size. Every configured graph is validated against the connected server object_info before queuing. The default 512×768 app setting overrides the template’s 1024×1024 size to reduce GPU memory use. Local GPU execution still needs to be tested on the installed models.
