"""Extract existing ink by local paper estimation, without generating glyphs."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
root=Path(__file__).resolve().parents[1]/'public/images/search'
im=Image.open(root/'lantingxu-original.jpg').convert('RGB')
# A low-resolution local maximum estimates uneven aged paper; original pixels
# retain full resolution and geometry throughout extraction.
paper=im.resize((1128,370)).filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.GaussianBlur(9)).resize(im.size,Image.Resampling.BICUBIC)
rgb=np.asarray(im,dtype=float);bg=np.maximum(np.asarray(paper,dtype=float),1)
density=np.clip(1-rgb/bg,0,1).max(axis=2)
alpha=np.clip((density-.17)/.67,0,1)
# Continuous alpha preserves soft edges and variations; no binary tracing.
alpha=alpha**1.25
foreground=np.clip((rgb-bg*(1-alpha[:,:,None]))/np.maximum(alpha[:,:,None],.001),0,255)
out=np.dstack([foreground,alpha*255]).astype('uint8')
result=Image.fromarray(out,'RGBA');result.save(root/'lantingxu-ink.webp',lossless=True,method=6)
preview=Image.new('RGBA',im.size,'#FAF8F3');preview.alpha_composite(result);preview.convert('RGB').resize((1600,525)).save(root/'lantingxu-proof.jpg',quality=90)
print(im.size,(root/'lantingxu-ink.webp').stat().st_size)
