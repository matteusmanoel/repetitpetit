/**
 * Sinal "Peça única" acima da dobra (docs/05-ux-direction.md).
 */
export function UniquePieceNotice() {
  return (
    <p
      role="status"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
    >
      Atenção: peça única! Quando acabar, acabou.
    </p>
  );
}
