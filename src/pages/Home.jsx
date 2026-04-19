import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MenuItem from '../components/MenuItem';
import { useSupabaseMenu } from '../hooks/useSupabaseMenu';
import { Search, X, Loader2 } from 'lucide-react';
import { fuzzyMatchWordJumble } from '../utils/fuzzySearch';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const { categories, menuItems, loading } = useSupabaseMenu();

  // Collect all items perfectly filtered by search query
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const results = [];
    
    // Search both category titles and item titles using Levenshtein distance 
    // and tokenization to support "word order jumble" and minor typos.
    menuItems.forEach(item => {
      const category = categories.find(c => c.id === item.category_id);
      
      const categoryNameMatches = category && fuzzyMatchWordJumble(searchQuery, category.title);
      const itemNameMatches = fuzzyMatchWordJumble(searchQuery, item.title);
      
      if (categoryNameMatches || itemNameMatches) {
        results.push(item);
      }
    });
    
    return results;
  }, [searchQuery, categories, menuItems]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-[#ffd54f]">
        <Loader2 className="w-12 h-12 animate-spin mb-6" style={{ animationDuration: '0.5s' }} />
        <div className="font-sans font-medium text-sm tracking-[0.4em] uppercase text-white/50">Initializing</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center pb-12">
      <Header 
        title="VIYA PURI CAFE" 
        subtitle={<>Free Home Delivery above ₹ 300 /-<br/><p>Lalitha pet,Chowdavaram</p></>}
      />
      
      <main className="w-full max-w-6xl px-6">

        
        <div className="max-w-2xl mx-auto mb-10 relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/50 group-focus-within:text-[#ffd54f] transition-colors">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Search our menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full outline-none text-white font-sans text-lg placeholder-white/30 hover:border-white/30 focus:border-[#ffd54f] focus:bg-black/60 transition-all shadow-xl"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {searchQuery.trim() !== '' ? (
          /* Search Results Display */
          <div className="max-w-4xl mx-auto">
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-black/40 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl animate-fade-in">
                {searchResults.map((item, idx) => (
                  <MenuItem
                    key={idx}
                    image={item.image}
                    title={item.title}
                    price={item.price}
                    secondaryPrice={item.secondary_price}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center bg-black/40 backdrop-blur-xl p-16 rounded-3xl border border-white/10 shadow-2xl">
                <p className="text-xl font-serif text-white/60 tracking-wider">No exquisite dishes found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        ) : (
          /* Default Category Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.id}`}
                className="group relative overflow-hidden rounded-xl aspect-[4/5] bg-black/40 border border-white/10 transition-all duration-500 hover:scale-[1.02] hover:border-white/30 shadow-2xl"
              >
                {/* Background Image */}
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-80 "
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-black/80 to-white/10" />
                )}

                {/* Dark Overlay for better text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Text Content */}
                <div className="absolute bottom-0 left-0 w-full p-5 text-center transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <h2 className="font-serif text-xl md:text-2xl font-bold tracking-wide text-white drop-shadow-lg mb-1">
                    {cat.title.replace(/[\u{1F300}-\u{1F9FF}]/u, '').trim()}
                  </h2>
                  <div className="w-8 h-0.5 bg-[#ffd54f] mx-auto scale-0 group-hover:scale-100 transition-transform duration-500 delay-100" />
                </div>
              </Link>
            ))}

            {/* Game Link */}
            <Link
              to="/game"
              className="group relative overflow-hidden rounded-xl aspect-[4/5] bg-gradient-to-br from-[#ffd54f]/80 to-[#ff9800]/80 border border-[#ffd54f]/30 transition-all duration-500 hover:scale-[1.02] hover:border-white/50 shadow-2xl flex flex-col items-center justify-center p-4 text-center"
            >
              <div className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-500 delay-75">🎮</div>
              <h2 className="font-serif text-xl md:text-2xl font-bold tracking-wide text-black drop-shadow-sm mb-1">
                Play Memory
              </h2>
              <div className="text-black/80 text-sm font-medium mt-2">Test your memory</div>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
