import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import MenuItem from '../components/MenuItem';
import { useSupabaseMenu } from '../hooks/useSupabaseMenu';
import { ArrowLeft } from 'lucide-react';

export default function Category() {
  const { id } = useParams();
  const { categories, menuItems, loading } = useSupabaseMenu();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[#ffd54f] font-serif text-2xl tracking-widest">Loading Premium Menu...</div>
      </div>
    );
  }

  const categoryMeta = categories.find(c => c.id === id);
  const items = menuItems.filter(item => item.category_id === id);

  if (!categoryMeta) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="absolute top-8 left-6 md:left-12 z-50">
        <Link 
          to="/" 
          className="group flex items-center gap-3 px-5 py-2.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full text-white/80 hover:text-white hover:bg-black/80 hover:border-white/20 transition-all duration-300 shadow-xl"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-sans tracking-widest uppercase">Menu</span>
        </Link>
      </div>

      <div className="pt-8">
        <Header 
          title={categoryMeta.title.replace(/[\u{1F300}-\u{1F9FF}]/u, '').trim()}
          subtitle={categoryMeta.subtitle} 
        />
      </div>

      <section className="max-w-4xl mx-auto px-4 mt-8">
        {items.length > 0 ? (
          <div className="flex flex-col gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl">
            {/* Table Header for Labeled Categories */}
            {(categoryMeta.primary_label || categoryMeta.secondary_label) && (
              <div className="hidden md:flex items-center gap-5 px-3 py-2 border-b border-white/10 text-white/40 text-[10px] uppercase tracking-[0.2em] font-sans">
                <div className="w-20 shrink-0"></div>
                <div className="flex-1">Item</div>
                <div className="flex flex-col items-end gap-1 px-2 w-32">
                   <div className="flex flex-col items-end">
                      <span>{categoryMeta.primary_label || 'Primary'}</span>
                   </div>
                   {categoryMeta.secondary_label && (
                      <div className="flex flex-col items-end border-t border-white/5 mt-1 pt-1 w-full text-right">
                         <span>{categoryMeta.secondary_label}</span>
                      </div>
                   )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {items.map((item, index) => (
                <MenuItem 
                  key={index}
                  image={item.image}
                  title={item.title}
                  price={item.price}
                  secondaryPrice={item.secondary_price}
                  primaryLabel={categoryMeta.primary_label}
                  secondaryLabel={categoryMeta.secondary_label}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center bg-black/40 backdrop-blur-xl p-16 rounded-3xl border border-white/10 shadow-2xl">
            <p className="text-xl font-serif text-white/60 tracking-wider">Curating exceptional items soon...</p>
          </div>
        )}
      </section>
    </div>
  );
}
