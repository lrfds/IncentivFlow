import React from 'react';

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const base = 'glass-panel rounded-[20px] transition-all duration-300';
  const hover = onClick ? 'hover:glass-hover cursor-pointer' : '';
  return onClick 
    ? <button onClick={onClick} className={`${base} ${hover} text-left w-full ${className}`}>{children}</button>
    : <div className={`${base} ${className}`}>{children}</div>;
}
