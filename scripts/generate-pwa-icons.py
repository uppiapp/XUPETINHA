"""
Gera os ícones PWA faltantes usando Pillow — cria ícone base do zero se necessário.
"""

from PIL import Image, ImageDraw, ImageFont
import os

ICONS_DIR = "/vercel/share/v0-project/public/icons"
MISSING_SIZES = [72, 96, 128, 144, 152, 384]

os.makedirs(ICONS_DIR, exist_ok=True)

# Criar ícone base 512x512 do zero: fundo preto, letra U branca
SIZE = 512
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
draw = ImageDraw.Draw(img)

# Desenhar um "U" simplificado com formas geométricas
# Duas barras verticais + arco inferior
bar_w = 68
bar_h = 280
bar_top = 110
margin = 120
radius = (SIZE - 2 * margin) // 2

# Barra esquerda
draw.rounded_rectangle(
    [margin, bar_top, margin + bar_w, bar_top + bar_h],
    radius=34, fill=(255, 255, 255, 255)
)
# Barra direita
draw.rounded_rectangle(
    [SIZE - margin - bar_w, bar_top, SIZE - margin, bar_top + bar_h],
    radius=34, fill=(255, 255, 255, 255)
)
# Arco inferior (semicírculo)
arc_top = bar_top + bar_h - radius
arc_box = [margin, arc_top, SIZE - margin, arc_top + 2 * radius]
draw.arc(arc_box, start=0, end=180, fill=(255, 255, 255, 255), width=bar_w)

base_path = os.path.join(ICONS_DIR, "icon-512x512-new.png")
img.save(base_path, "PNG", optimize=True)
print(f"Base icon created: {base_path}")

# Gerar todos os tamanhos faltantes
for size in MISSING_SIZES:
    dest = os.path.join(ICONS_DIR, f"icon-{size}x{size}.png")
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(dest, "PNG", optimize=True)
    print(f"Created: icon-{size}x{size}.png")

print(f"\nDone. {len(MISSING_SIZES)} icons generated.")
