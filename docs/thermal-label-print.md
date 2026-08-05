# Impressão térmica de etiquetas

Guia operacional (PT-BR) para imprimir etiquetas de peça na Repeti Petit quando a
impressora térmica estiver conectada. O software do MVP **já** gera a etiqueta
no navegador e um PDF de fallback — não é necessário driver nativo no app.

Referências de produto: D73 / D81 (`docs/09-decisions.md`), rotas admin
`/admin/produto/[id]/etiqueta` e `/admin/produto/[id]/label.pdf`.

## O que a etiqueta contém

- Nome da loja (`NEXT_PUBLIC_STORE_NAME` / marca **Repeti Petit**)
- QR Code (Passport URL com `staff_code` `RP-…`)
- Código `RP-…` em texto
- Nome da peça (uma linha) e tamanho

**Não** inclui preço (D73). A peça precisa estar **ativada** (com `staff_code`)
antes de imprimir.

## Fluxo no Admin

1. Entre em **Admin → Produtos**.
2. Abra a peça (ou ative-a se ainda não tiver código RP).
3. Use **Imprimir etiqueta** / **Reimprimir** — abre
   `/admin/produto/[id]/etiqueta`.
4. Confira o preview na tela.
5. Clique em **Imprimir** (diálogo do navegador → escolha a térmica).
6. Se a térmica falhar ou não estiver disponível, clique em **Baixar PDF**
   (`/admin/produto/[id]/label.pdf`) e imprima o arquivo pelo driver do SO
   ou por outro computador.

## Tamanho da etiqueta

O layout de impressão está calibrado para **58 mm × 40 mm** (`@page` em
`app/globals.css`; PDF usa a mesma proporção).

No driver / preferências da impressora:

| Ajuste | Valor sugerido |
|---|---|
| Largura do papel / mídia | 58 mm |
| Altura / gap | 40 mm (ou “gap” equivalente da bobina) |
| Orientação | Retrato |
| Escala | 100% (sem “ajustar à página”) |
| Margens | Mínimas / nenhuma |

Se a etiqueta sair cortada: reduza margens no diálogo de impressão do
navegador e confirme que o tamanho customizado 58×40 mm está selecionado
(Chrome: **Mais configurações → Tamanho do papel**).

## Drivers e opções de hardware

O app **não** embute driver USB/Bluetooth. Use uma destas opções (documentar
o que a loja escolher; não precisa instalar QZ Tray no MVP):

1. **Driver do fabricante (recomendado no balcão)**  
   Instale o driver Windows/macOS da marca (Elgin, Brother, Zebra, etc.),
   conecte USB (ou rede), e selecione a impressora no diálogo **Imprimir**
   do Chrome/Edge/Safari.

2. **Impressão genérica ESC/POS / “Generic / Text Only”**  
   Algumas térmicas de 58 mm aparecem como impressora genérica. Funciona se o
   SO escalar o job de página 58×40 mm corretamente — valide com uma peça de
   teste.

3. **PDF + fila do sistema**  
   Baixe o PDF e imprima pelo Preview (macOS) ou leitor PDF (Windows),
   apontando para a térmica. Útil quando o navegador não lista a impressora.

4. **QZ Tray / bridge nativo (fora do MVP)**  
   Só se no futuro a loja quiser impressão silenciosa sem diálogo do
   navegador. **Não** está implementado neste repositório — ver escopo do
   issue #101.

## Checklist rápido (primeira configuração)

- [ ] Impressora ligada, com bobina 58 mm, gap ~40 mm
- [ ] Driver instalado e impressora visível no SO
- [ ] Peça de teste ativada (código `RP-…` gerado)
- [ ] Admin → etiqueta → **Imprimir** → selecionar a térmica → escala 100%
- [ ] QR legível no celular; texto `RP-…` nítido
- [ ] Se falhar: **Baixar PDF** e repetir pelo leitor do SO

## Solução de problemas

| Sintoma | O que tentar |
|---|---|
| Página em A4 em branco / etiqueta minúscula | Forçar papel 58×40 mm; desligar “ajustar à página” |
| Só controles do admin saem na folha | Atualizar a página; o CSS esconde `.label-print-controls` no `@media print` |
| “Peça sem código RP” | Ativar a peça no admin antes de imprimir |
| QR não abre Passport | Conferir `NEXT_PUBLIC_SITE_URL` (D16 / D81); SN-11 pode 404 até o Passport estar no ar — o QR ainda deve apontar para a URL correta |
| Nome da loja errado na etiqueta | Usar `Repeti Petit` em `NEXT_PUBLIC_STORE_NAME` (ver `.env.example` e D93) |

## Relacionado

- Setup geral: [`docs/07-setup.md`](07-setup.md)
- Soft launch: [`docs/11-soft-launch.md`](11-soft-launch.md)
- Decisões D73 / D81 / D93 / D94: [`docs/09-decisions.md`](09-decisions.md)
