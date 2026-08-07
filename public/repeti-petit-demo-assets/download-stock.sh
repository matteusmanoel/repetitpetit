#!/usr/bin/env bash
# ============================================================
# download-stock.sh — Repeti Petit: substituir placeholders
# por fotos reais de stock (Unsplash Free License)
#
# USO:
#   chmod +x download-stock.sh
#   ./download-stock.sh
#
# Requer: curl, python3, Pillow (pip install Pillow)
# ============================================================

set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

BASE="https://images.unsplash.com"

# Função: baixar, crop e exportar WEBP
fetch_webp() {
  local url="$1"
  local output="$2"
  local width="$3"
  local height="$4"
  local quality="${5:-85}"
  
  echo "↓ $output"
  # macOS mktemp: template must end in XXXXXX; avoid colliding with a literal
  # leftover named /tmp/repeti_XXXXXX.jpg from a previous failed run.
  tmp=$(mktemp "${TMPDIR:-/tmp}/repeti.XXXXXX")
  curl -fsSL "$url" -o "$tmp"
  
  python3 - "$tmp" "$output" "$width" "$height" "$quality" << 'PYEOF'
import sys
from PIL import Image

src, dst, w, h, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
img = Image.open(src).convert('RGB')

# Crop inteligente: centraliza mantendo proporção
iw, ih = img.size
target_ratio = w / h
current_ratio = iw / ih

if current_ratio > target_ratio:
    # Mais largo: crop nas laterais
    new_w = int(ih * target_ratio)
    x0 = (iw - new_w) // 2
    img = img.crop((x0, 0, x0 + new_w, ih))
else:
    # Mais alto: crop no topo/baixo (manter topo para banners)
    new_h = int(iw / target_ratio)
    img = img.crop((0, 0, iw, new_h))

img = img.resize((w, h), Image.LANCZOS)
img.save(dst, 'WEBP', quality=q, method=4)
print(f"  → {dst}: {__import__('os').path.getsize(dst)//1024}KB")
PYEOF
  rm -f "$tmp"
}

echo "=========================================="
echo " Repeti Petit — Download de stock (Unsplash)"
echo "=========================================="
echo ""

# IDs Unsplash verificados (HTTP 200). IDs truncados do curador original
# (ex.: photo-1567677938-…) retornavam 404 e quebravam o script com set -e.

# ── BANNERS ────────────────────────────────────────────────────────────────
echo "── Banners ──"
# Flat-lay / peças coloridas
fetch_webp "${BASE}/photo-1519689680058-324335c77eba?w=2000&q=90&fit=crop" \
  "banner-01.webp" 1920 1080 88
# Rack / loja de roupa (atmosfera desapego)
fetch_webp "${BASE}/photo-1441984904996-e0b6ba687e04?w=2000&q=90&fit=crop" \
  "banner-02.webp" 1920 1080 88

# ── CATEGORIAS ─────────────────────────────────────────────────────────────
echo ""
echo "── Categorias ──"
fetch_webp "${BASE}/photo-1518831959646-742c3a14ebf7?w=1000&q=88" "cat-vestidos.webp" 800 800 85
fetch_webp "${BASE}/photo-1471286174890-9c112ffca5b4?w=1000&q=88" "cat-conjuntos.webp" 800 800 85
fetch_webp "${BASE}/photo-1622290291468-a28f7a7dc6a8?w=1000&q=88" "cat-blusas.webp" 800 800 85
fetch_webp "${BASE}/photo-1574180566232-aaad1b5b8450?w=1000&q=88" "cat-casacos.webp" 800 800 85
fetch_webp "${BASE}/photo-1544441893-675973e31985?w=1000&q=88" "cat-calcas.webp" 800 800 85
fetch_webp "${BASE}/photo-1519052537078-e6302a4968d4?w=1000&q=88" "cat-calcados.webp" 800 800 85
fetch_webp "${BASE}/photo-1558618666-fcd25c85cd64?w=1000&q=88" "cat-acessorios.webp" 800 800 85

# ── PRODUTOS (3:4) ─────────────────────────────────────────────────────────
echo ""
echo "── Produtos ──"
fetch_webp "${BASE}/photo-1515488042361-ee00e0ddd4e4?w=1200&q=88" "prod-01.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1503454537195-1dcabb73ffb9?w=1200&q=88" "prod-02.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1519238263530-99bdd11df2ea?w=1200&q=88" "prod-03.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1555252333-9f8e92e65df9?w=1200&q=88" "prod-04.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1522771739844-6a9f6d5f14af?w=1200&q=88" "prod-05.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1566576912321-d58ddd7a6088?w=1200&q=88" "prod-06.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1596461404969-9ae70f2830c1?w=1200&q=88" "prod-07.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1476703993599-0035a21b17a9?w=1200&q=88" "prod-08.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1544776193-352d25ca82cd?w=1200&q=88" "prod-09.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1542291026-7eec264c27ff?w=1200&q=88" "prod-10.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1553062407-98eeb64c6a62?w=1200&q=88" "prod-11.webp" 1200 1600 88
fetch_webp "${BASE}/photo-1585487000160-6ebcfceb0d03?w=1200&q=88" "prod-12.webp" 1200 1600 88

echo ""
echo "✓ Download concluído: $(ls *.webp | wc -l) arquivos"
echo "  Verifique os pesos — alvo: banners 150-400KB, cats 80-200KB, prods 100-250KB"
echo "  Se algum ficou abaixo, rode: python3 -c \"from PIL import Image; Image.open('X.webp').save('X.webp', 'WEBP', quality=92)\""
