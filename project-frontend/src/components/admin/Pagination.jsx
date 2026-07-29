import React from 'react';

export default function Pagination({ currentPage, lastPage, onPageChange }) {
  // Always show the component to provide visual feedback
  const lp = Math.max(1, lastPage || 1);
  const cp = Math.max(1, currentPage || 1);

  const pages = [];
  // Calculate which page numbers to show (e.g. max 5 buttons)
  let startPage = Math.max(1, cp - 2);
  let endPage = Math.min(lp, cp + 2);

  if (endPage - startPage < 4) {
    if (startPage === 1) endPage = Math.min(lp, startPage + 4);
    else if (endPage === lp) startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex justify-center items-center gap-1.5 mt-5 mb-3">
      <button
        disabled={cp === 1}
        onClick={() => onPageChange(cp - 1)}
        className="px-2 py-0.5 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition hover:cursor-pointer text-sm"
      >
        <i className="fas fa-chevron-left text-xs"></i>
      </button>

      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-2 py-0.5 border rounded hover:bg-gray-100 transition hover:cursor-pointer text-sm"
          >
            1
          </button>
          {startPage > 2 && <span className="px-1.5 text-gray-500 text-sm">...</span>}
        </>
      )}

      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-2 py-0.5 border rounded transition hover:cursor-pointer text-sm ${
            cp === page ? 'bg-primary text-white border-primary font-bold' : 'hover:bg-gray-100'
          }`}
        >
          {page}
        </button>
      ))}

      {endPage < lp && (
        <>
          {endPage < lp - 1 && <span className="px-1.5 text-gray-500 text-sm">...</span>}
          <button
            onClick={() => onPageChange(lp)}
            className="px-2 py-0.5 border rounded hover:bg-gray-100 transition hover:cursor-pointer text-sm"
          >
            {lp}
          </button>
        </>
      )}

      <button
        disabled={cp === lp}
        onClick={() => onPageChange(cp + 1)}
        className="px-2 py-0.5 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition hover:cursor-pointer text-sm"
      >
        <i className="fas fa-chevron-right text-xs"></i>
      </button>
    </div>
  );
}
