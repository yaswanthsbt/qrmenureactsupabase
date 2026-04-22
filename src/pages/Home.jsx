import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import MenuItem from '../components/MenuItem';
import { useSupabaseMenu } from '../hooks/useSupabaseMenu';
import { Search, X, Loader2, Share2, MapPin } from 'lucide-react';
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Viya Puri Cafe',
        text: 'Check out our delicious menu at Viya Puri Cafe!',
        url: window.location.href,
      });
    } else {
      alert('Share functionality not supported on this browser');
    }
  };

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
      <Header title="VIYA PURI CAFE" />
      
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
            className="w-full pl-12 pr-12 py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full outline-none text-white font-sans text-lg placeholder-white/30 hover:border-white/30 focus:border-white/50 transition-colors"
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
                    {cat.title.replace(/[^\x00-\x7F]/g, "").trim()}
                  </h2>
                  <div className="w-8 h-0.5 bg-[#ffd54f] mx-auto scale-0 group-hover:scale-100 transition-transform duration-500 delay-100" />
                </div>
              </Link>
            ))}

            {/* Game Link */}
            <Link
              to="/game"
              className="group relative overflow-hidden rounded-xl aspect-[4/5] bg-gradient-to-br from-[#ffd54f]/80 to-[#ff9800]/80 border border-[#ffd54f]/30 transition-all duration-500 hover:scale-[1.02] hover:border-[#ffd54f]/50 shadow-2xl flex flex-col items-center justify-center"
            >
              <div className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-500 delay-75"></div>
              <h2 className="font-serif text-xl md:text-2xl font-bold tracking-wide text-black drop-shadow-sm mb-1">
                Play Memory
              </h2>
              <div className="text-black/80 text-sm font-medium mt-2">Test your memory</div>
            </Link>
          </div>
        )}
      </main>

      {/* Footer Section */}
      <footer className="w-full max-w-6xl px-6 mt-16 pt-12 border-t border-white/10">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center mb-8">
            <p className="text-[#ffd54f] font-medium">Free Home Delivery above 300 /-</p>
            <p className="text-white/70 text-sm mt-1">Lalitha pet,Chowdavaram</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Catering Services */}
            <div className="flex flex-col items-center md:items-start space-y-3">
              <h3 className="font-serif text-lg md:text-xl font-bold tracking-wide text-white">Our Services</h3>
              <p className="text-white/70 text-sm leading-relaxed text-center md:text-left">
                Small gatherings to big celebrations, we will provide our services <br/>
                <span className="text-[#ffd54f] font-medium">( Marriages, Functions, Kitty Parties )</span>
              </p>
            </div>

            {/* Location Button */}
            <div className="flex flex-col items-center space-y-3">
              <h3 className="font-serif text-lg md:text-xl font-bold tracking-wide text-white">Location</h3>
              <a
                href="https://www.google.com/maps/place/Viya+Puri+Cafe/@16.2501361,80.3303253,17.51z/data=!4m6!3m5!1s0x3a4a77003291e9c9:0xcca16bf8f5470940!8m2!3d16.2501546!4d80.3322699!16s%2Fg%2F11x8wbx1z9?entry=ttu&g_ep=EgoyMDI2MDQxNS4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-[#ffd54f]/20 border border-[#ffd54f]/50 rounded-full text-[#ffd54f] font-medium hover:bg-[#ffd54f]/30 transition-all duration-300 hover:border-[#ffd54f]/80"
              >
                <MapPin size={18} />
                <span>View Location</span>
              </a>
            </div>

            {/* Order Timing & Share */}
            <div className="flex flex-col items-center md:items-end space-y-3">
              <h3 className="font-serif text-lg md:text-xl font-bold tracking-wide text-white">Timing</h3>
              <div className="space-y-3 w-full flex flex-col items-center md:items-end">
                <p className="text-white/70 text-sm font-medium"> It takes 15 min per order</p>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-3 bg-[#ff9800]/20 border border-[#ff9800]/50 rounded-full text-[#ff9800] font-medium hover:bg-[#ff9800]/30 transition-all duration-300 hover:border-[#ff9800]/80"
                >
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-center text-white/50 text-xs font-sans tracking-wide">
               2026 Viya Puri Cafe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
