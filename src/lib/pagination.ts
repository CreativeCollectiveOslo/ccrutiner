/**
 * Build a compact pagination range with ellipses.
 * Example (current=13, total=20): [1, '...', 12, 13, 14, '...', 20]
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  siblings: number = 1,
): (number | "ellipsis")[] {
  const totalNumbers = siblings * 2 + 5; // first, last, current, 2 ellipsis slots, siblings
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(currentPage - siblings, 1);
  const rightSibling = Math.min(currentPage + siblings, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  const range: (number | "ellipsis")[] = [1];
  if (showLeftEllipsis) range.push("ellipsis");
  else for (let i = 2; i < leftSibling; i++) range.push(i);

  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i !== 1 && i !== totalPages) range.push(i);
  }

  if (showRightEllipsis) range.push("ellipsis");
  else for (let i = rightSibling + 1; i < totalPages; i++) range.push(i);

  range.push(totalPages);
  return range;
}
