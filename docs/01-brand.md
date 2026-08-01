# 01 — Marca e Identidade Visual

## Logo

Arquivo: `public/brand/logo.png`

Logotipo manual, letras grandes e coloridas com traço irregular (estilo infantil/lúdico).
Tagline: **BRECHO INFANTIL**.

Regras:
- Usar sempre sobre fundo claro (branco ou off-white).
- Não distorcer proporções.
- Não recolorir.
- Versão escura do logo (para fundo colorido) a definir com o cliente.

## Paleta extraída do logo

| Role | Hex | HSL (Tailwind) | Uso |
|---|---|---|---|
| Primary (azul) | `#165DA4` | `hsl(210 77% 37%)` | CTAs, links, nav ativa |
| Lime (verde-amarelo) | `#8EB038` | `hsl(76 51% 46%)` | Badges, tags, destaque positivo |
| Coral (vermelho-rosa) | `#EB5E5C` | `hsl(1 78% 64%)` | Alertas, preço riscado, SALE |
| Background | `#FAFAF7` | `hsl(60 20% 98%)` | Fundo de página |
| Surface | `#FFFFFF` | — | Cards, modais |
| Foreground | `#1A1A1A` | `hsl(0 0% 10%)` | Texto principal |
| Muted | `#F4F4F0` | `hsl(60 10% 95%)` | Fundo de campos, placeholders |
| Border | `#E5E5E0` | `hsl(60 8% 89%)` | Divisores, bordas |

### Tokens Tailwind (globals.css)

```css
:root {
  --background: 60 20% 98%;
  --foreground: 0 0% 10%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 10%;
  --primary: 210 77% 37%;
  --primary-foreground: 0 0% 100%;
  --secondary: 76 51% 46%;
  --secondary-foreground: 0 0% 100%;
  --destructive: 1 78% 64%;
  --destructive-foreground: 0 0% 100%;
  --muted: 60 10% 95%;
  --muted-foreground: 0 0% 45%;
  --accent: 76 51% 46%;
  --accent-foreground: 0 0% 100%;
  --border: 60 8% 89%;
  --input: 60 8% 89%;
  --ring: 210 77% 37%;
  --radius: 0.75rem;
}
```

## Tipografia

| Papel | Fonte | Peso |
|---|---|---|
| Display / headings | `Nunito` (Google Fonts) | 700, 800 |
| Corpo / UI | `Inter` | 400, 500 |

Nunito é arredondada e acolhedora — combina com o traço lúdico do logo sem ser infantil
demais. Inter mantém legibilidade em tamanhos pequenos.

## Voz e tom

- **Alegre e direto**: sem jargões corporativos.
- **Próximo**: "você", não "o cliente". Segunda pessoa.
- **Sustentável sem pregar**: mencionar o aspecto consciente de forma sutil, não missionário.
- **Pais ocupados**: copy curto, CTA claro, zero fricção.

Exemplos de copy corretos:
- "Peça única — corre antes que acabe!"
- "Escolha o tamanho e finalize em segundos."
- "Seu pedido está sendo separado com carinho."

Exemplos de copy a evitar:
- "Bem-vindo ao nosso portal de e-commerce infantil" ❌
- "Clique aqui para adicionar ao carrinho de compras" ❌ (botão já diz isso)
- Copy em inglês no UI público ❌

## Anti-padrões visuais

| Evitar | Por quê |
|---|---|
| Gradientes pesados e sombras grossas | Remete a template genérico de 2015 |
| Roxo / paleta Nuvemshop padrão | Sem identidade; parece qualquer brechó |
| Cards com bordas grossas e fundo cinza-escuro | Frio, corporativo |
| CTA em cor diferente do primary | Confunde hierarquia |
| Fonte serifada em tamanho pequeno | Legibilidade ruim em mobile |
| Imagens com watermark ou fundo sujo | Passa descuido para peças premium |

## Estilo de produto

As fotos hoje vêm do WhatsApp/Instagram — qualidade variável.
A UI deve ter `object-fit: cover` e aspect ratio fixo (`aspect-[3/4]`) para normalizar
fotos verticais de celular, que é o formato padrão do acervo.
