import React from 'react';

export default function MenuItem({ image, title, price, secondaryPrice }) {
  return (
    <div className="group flex items-center gap-5 p-3 rounded-xl hover:bg-white/10 transition-colors duration-400 border-b border-white/5 last:border-b-0">
      <div className="overflow-hidden rounded-lg w-20 h-20 shrink-0 shadow-lg border border-white/10">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      
      <div className="flex-1">
        <strong className="block text-lg font-serif font-medium tracking-wide">{title}</strong>
      </div>
      
      <div className="flex flex-col items-end gap-1 px-2 font-sans tracking-wider">
        {secondaryPrice ? (
          <div className="flex flex-col items-end text-sm">
             <span className="text-[#ffd54f] font-semibold">₹{price}</span>
             <span className="text-white/70 font-medium text-xs">Double ₹{secondaryPrice}</span>
          </div>
        ) : (
          <span className="text-[#ffd54f] font-semibold text-lg">₹{price}</span>
        )}
      </div>
    </div>
  );
}
