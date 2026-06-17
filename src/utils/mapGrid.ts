/**
 * Compute evenly-spaced grid positions for N nodes arranged in a row-major
 * grid. Each position is the centre of a cell, expressed as a percentage of
 * the canvas dimensions (0–100).
 *
 * Vertical spacing uses rows+1 divisions so there is equal padding above the
 * first row and below the last row.
 */
export function gridPositions(
  count: number,
  cols = 4,
): ReadonlyArray<{ xPercent: number; yPercent: number }> {
  if (count === 0) return [];
  const rows = Math.ceil(count / cols);
  const colStep = 100 / cols;
  const rowStep = 100 / (rows + 1);

  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      xPercent: Math.round(colStep * (col + 0.5)),
      yPercent: Math.round(rowStep * (row + 1)),
    };
  });
}
