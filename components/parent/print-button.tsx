'use client';
export function PrintButton() {
  return (
    <button className="print-hide" onClick={() => window.print()}>
      Skriv ut diplom
    </button>
  );
}
