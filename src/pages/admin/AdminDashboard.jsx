import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Trash2, Edit2, Plus, Image as ImageIcon, LogOut, ArrowUp, ArrowDown } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('items'); // 'categories' or 'items'
  
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  
  // Form States
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ title: '', price: '', secondary_price: '', category_id: '', imageFile: null });
  
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({ id: '', title: '', subtitle: '', imageFile: null });
  
  const [uploadError, setUploadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin');
    } else {
      fetchData();
    }
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from('categories').select('*').order('category_order', { ascending: true, nullsFirst: true });
    
    // Normalize categories to guarantee unique sequential values.
    if (catData) {
      const normalizedCats = catData.map((c, idx) => ({ ...c, category_order: c.category_order !== null && c.category_order !== 0 ? c.category_order : idx }));
      setCategories(normalizedCats);
    }
    
    // Order menu_items natively by item_order and normalize them per-category.
    const { data: itemData } = await supabase.from('menu_items').select('*').order('item_order', { ascending: true, nullsFirst: true });
    
    if (itemData && catData) {
      // Group items by category to ensure sequential item_order per category
      let normalizedItems = [];
      catData.forEach(cat => {
        const items = itemData.filter(i => i.category_id === cat.id);
        const fixedItems = items.map((item, idx) => ({
          ...item,
          item_order: item.item_order !== null && item.item_order !== 0 ? item.item_order : idx
        }));
        normalizedItems = [...normalizedItems, ...fixedItems];
      });
      setMenuItems(normalizedItems);
    }
    
    setUnsavedChanges(false);
    setLoading(false);
  };
  
  const cancelOrderChanges = () => {
    fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const cleanupAsset = async (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('supabase.co')) return;
    const pathParts = imageUrl.split('/assets/');
    if (pathParts.length > 1) {
      const filePath = pathParts[1];
      await supabase.storage.from('assets').remove([filePath]);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5MB");
      throw new Error("File too large");
    }

    const uniquePath = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
    const { data, error } = await supabase.storage.from('assets').upload(uniquePath, file);
    if (error) {
      setUploadError("Failed to upload: Make sure RLS is allowing anonymous uploads.");
      throw error;
    }
    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(uniquePath);
    return publicUrl;
  };

  // --- ITEM CRUD ---
  const saveItem = async (e) => {
    e.preventDefault();
    setUploadError('');
    let finalImageUrl = editingItem?.image || null;
    
    try {
      if (itemForm.imageFile) {
        if (editingItem && editingItem.image) await cleanupAsset(editingItem.image);
        finalImageUrl = await uploadImage(itemForm.imageFile);
      }
      
      const payload = {
        title: itemForm.title,
        price: itemForm.price,
        secondary_price: itemForm.secondary_price,
        category_id: itemForm.category_id,
        image: finalImageUrl
      };

      if (editingItem) {
        await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
      } else {
        // Find highest order in this category
        const itemsInCat = menuItems.filter(i => i.category_id === itemForm.category_id);
        const maxOrder = itemsInCat.reduce((max, item) => Math.max(max, item.item_order || 0), -1);
        payload.item_order = maxOrder + 1;
        
        await supabase.from('menu_items').insert([payload]);
      }
      
      setEditingItem(null);
      setItemForm({ title: '', price: '', secondary_price: '', category_id: '', imageFile: null });
      fetchData();
    } catch (err) {}
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete ${item.title}?`)) return;
    if (item.image) await cleanupAsset(item.image);
    await supabase.from('menu_items').delete().eq('id', item.id);
    fetchData();
  };

  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSavingOrders, setIsSavingOrders] = useState(false);

  const moveItem = (item, direction) => {
    setMenuItems(prevList => {
      // 1. Deep copy
      const newList = prevList.map(i => ({...i}));
      
      // 2. Extract and sort items in this category based on current item_order
      const itemsInCat = newList.filter(i => i.category_id === item.category_id);
      itemsInCat.sort((a, b) => (a.item_order || 0) - (b.item_order || 0));
      
      const currentIndex = itemsInCat.findIndex(i => i.id === item.id);
      
      // 3. Swap physically in the subset array
      if (direction === 'up' && currentIndex > 0) {
        const temp = itemsInCat[currentIndex - 1];
        itemsInCat[currentIndex - 1] = itemsInCat[currentIndex];
        itemsInCat[currentIndex] = temp;
      } else if (direction === 'down' && currentIndex < itemsInCat.length - 1) {
        const temp = itemsInCat[currentIndex + 1];
        itemsInCat[currentIndex + 1] = itemsInCat[currentIndex];
        itemsInCat[currentIndex] = temp;
      } else {
        return prevList;
      }

      // 4. Force sequential index on the new physical order (1 to N, or 0 to N-1)
      itemsInCat.forEach((catItem, index) => {
        catItem.item_order = index;
      });
      
      setUnsavedChanges(true);
      
      // 5. Re-integrate back into the main list so React updates
      const otherItems = newList.filter(i => i.category_id !== item.category_id);
      const combinedList = [...otherItems, ...itemsInCat];
      
      return combinedList.sort((a, b) => (a.item_order || 0) - (b.item_order || 0));
    });
  };

  // --- CATEGORY CRUD ---
  const saveCategory = async (e) => {
    e.preventDefault();
    setUploadError('');
    let finalImageUrl = editingCategory?.image || null;
    
    try {
      if (catForm.imageFile) {
        if (editingCategory && editingCategory.image) await cleanupAsset(editingCategory.image);
        finalImageUrl = await uploadImage(catForm.imageFile);
      }
      
      const payload = {
        id: catForm.id,
        title: catForm.title,
        subtitle: catForm.subtitle,
        image: finalImageUrl
      };

      if (editingCategory) {
        await supabase.from('categories').update(payload).eq('id', editingCategory.id);
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.category_order || 0), -1);
        payload.category_order = maxOrder + 1;
        await supabase.from('categories').insert([payload]);
      }
      
      setEditingCategory(null);
      setCatForm({ id: '', title: '', subtitle: '', imageFile: null });
      fetchData();
    } catch (err) {}
  };

  const deleteCategory = async (cat) => {
    if (!window.confirm(`Delete category ${cat.title}? All items in it will also be deleted!`)) return;
    if (cat.image) await cleanupAsset(cat.image);
    // Note: Items might CASCADE delete based on schema, but we should cleanup their assets.
    const itemsInCat = menuItems.filter(i => i.category_id === cat.id);
    for (const i of itemsInCat) { if (i.image) await cleanupAsset(i.image); }
    
    await supabase.from('categories').delete().eq('id', cat.id);
    fetchData();
  };

  const moveCategory = (cat, direction) => {
    setCategories(prevList => {
      // 1. Deep copy and sort
      const newList = prevList.map(c => ({...c}));
      newList.sort((a, b) => (a.category_order || 0) - (b.category_order || 0));
      
      const currentIndex = newList.findIndex(c => c.id === cat.id);
      
      // 2. Physical array swap
      if (direction === 'up' && currentIndex > 0) {
        const temp = newList[currentIndex - 1];
        newList[currentIndex - 1] = newList[currentIndex];
        newList[currentIndex] = temp;
      } else if (direction === 'down' && currentIndex < newList.length - 1) {
        const temp = newList[currentIndex + 1];
        newList[currentIndex + 1] = newList[currentIndex];
        newList[currentIndex] = temp;
      } else {
        return prevList;
      }

      // 3. Force sequential update
      newList.forEach((c, index) => {
        c.category_order = index;
      });
      
      setUnsavedChanges(true);
      return newList;
    });
  };

  const saveOrderChanges = async () => {
    setIsSavingOrders(true);
    
    // Process categories updates
    const catPromises = categories.map(c => 
      supabase.from('categories').update({ category_order: c.category_order }).eq('id', c.id)
    );
    // Process items updates
    const itemPromises = menuItems.map(i => 
      supabase.from('menu_items').update({ item_order: i.item_order }).eq('id', i.id)
    );
    
    await Promise.all([...catPromises, ...itemPromises]);
    
    setUnsavedChanges(false);
    setIsSavingOrders(false);
    // Optionally refetch to ensure perfect sync
    fetchData();
  };

  if (loading) return <div className="text-center mt-20 text-[#ffd54f]">Loading Admin...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white/10 border border-white/10 rounded-3xl p-6 sticky top-8">
            <h2 className="text-[#ffd54f] font-serif text-2xl font-bold mb-8">Admin Panel</h2>
            <div className="space-y-3 font-medium">
              <button 
                onClick={() => setActiveTab('items')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeTab === 'items' ? 'bg-[#ffd54f] text-black' : 'hover:bg-white/5'}`}
              >
                Menu Items
              </button>
              <button 
                onClick={() => setActiveTab('categories')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeTab === 'categories' ? 'bg-[#ffd54f] text-black' : 'hover:bg-white/5'}`}
              >
                Categories
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all mt-10 flex items-center gap-2"
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden">
          {uploadError && (
            <div className="bg-red-500/20 text-red-200 p-4 rounded-xl mb-6">
              {uploadError}
            </div>
          )}

          {activeTab === 'items' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-serif">Manage Items</h3>
                <button 
                  onClick={() => { setEditingItem(null); setItemForm({ title: '', price: '', secondary_price: '', category_id: categories[0]?.id || '', imageFile: null }); }}
                  className="bg-[#ffd54f] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                  <Plus size={18} /> Add Item
                </button>
              </div>

              {/* ITEM FORM */}
              <form onSubmit={saveItem} className="bg-black/40 p-6 rounded-2xl border border-white/10 mb-10 space-y-4">
                <h4 className="font-serif text-[#ffd54f] mb-4">{editingItem ? 'Edit Item' : 'New Item'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Title (e.g. Veg Maggie)" required value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} className="bg-white/5 border border-white/20 p-3 rounded-lg" />
                  <select required value={itemForm.category_id} onChange={e => setItemForm({...itemForm, category_id: e.target.value})} className="bg-[#111] border border-white/20 p-3 rounded-lg">
                    <option value="" disabled>Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <input type="text" placeholder="Primary Price (e.g. 50)" required value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} className="bg-white/5 border border-white/20 p-3 rounded-lg" />
                  <input type="text" placeholder="Secondary Price (Optional, e.g. 40)" value={itemForm.secondary_price} onChange={e => setItemForm({...itemForm, secondary_price: e.target.value})} className="bg-white/5 border border-white/20 p-3 rounded-lg" />
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm text-white/50 mb-2">Image (Max 5MB)</label>
                    <input type="file" accept="image/*" onChange={e => setItemForm({...itemForm, imageFile: e.target.files[0]})} className="w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#ffd54f] file:text-black hover:file:bg-[#ffcc80]"/>
                  </div>
                </div>
                <button type="submit" className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold">Save Item</button>
              </form>

              {/* ITEM LIST GROUPED BY CATEGORY */}
              <div>
                {categories.map((cat) => {
                  const itemsInCat = menuItems.filter(i => i.category_id === cat.id);
                  if (itemsInCat.length === 0) return null;

                  return (
                    <div key={cat.id} className="mb-10 animate-fade-in">
                      <h4 className="font-serif text-[#ffd54f] text-xl md:text-2xl mb-4 pb-2 border-b border-white/10 flex items-center gap-3">
                        {cat.image && <img src={cat.image} alt={cat.title} className="w-8 h-8 rounded-md object-cover border border-[#ffd54f]/30" />}
                        {cat.title}
                      </h4>
                      <div className="space-y-3">
                        {itemsInCat.map((item, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === itemsInCat.length - 1;

                          return (
                            <div key={item.id} className="flex items-center justify-between bg-black/40 border border-white/5 p-4 rounded-xl">
                              <div className="flex items-center gap-4">
                                {item.image ? <img src={item.image} alt={item.title} className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 bg-white/5 rounded flex items-center justify-center"><ImageIcon size={20} className="text-white/20"/></div>}
                                <div>
                                  <div className="font-bold flex items-center gap-2">
                                    {item.title}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col md:flex-row items-center gap-3">
                                <div className="text-[#ffd54f] font-medium mr-4">₹{item.price}</div>
                                <div className="flex items-center gap-1 bg-white/5 rounded-lg mr-2 p-1">
                                  <button onClick={() => moveItem(item, 'up')} disabled={isFirst} className={`p-1.5 rounded disabled:opacity-30 ${isFirst ? '' : 'hover:bg-white/20'}`}><ArrowUp size={16}/></button>
                                  <button onClick={() => moveItem(item, 'down')} disabled={isLast} className={`p-1.5 rounded disabled:opacity-30 ${isLast ? '' : 'hover:bg-white/20'}`}><ArrowDown size={16}/></button>
                                </div>
                                <button onClick={() => { setEditingItem(item); setItemForm({ title: item.title, price: item.price, secondary_price: item.secondary_price || '', category_id: item.category_id, imageFile: null }); window.scrollTo(0, 0); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"><Edit2 size={16}/></button>
                                <button onClick={() => deleteItem(item)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg"><Trash2 size={16}/></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-serif">Manage Categories</h3>
                <button 
                  onClick={() => { setEditingCategory(null); setCatForm({ id: '', title: '', subtitle: '', imageFile: null }); }}
                  className="bg-[#ffd54f] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                  <Plus size={18} /> Add Category
                </button>
              </div>

              {/* CATEGORY FORM */}
              <form onSubmit={saveCategory} className="bg-black/40 p-6 rounded-2xl border border-white/10 mb-10 space-y-4">
                <h4 className="font-serif text-[#ffd54f] mb-4">{editingCategory ? 'Edit Category' : 'New Category'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="ID (e.g. tea_coffee)" required disabled={!!editingCategory} value={catForm.id} onChange={e => setCatForm({...catForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} className="bg-white/5 border border-white/20 p-3 rounded-lg disabled:opacity-50" />
                  <input type="text" placeholder="Title (e.g. ☕ Tea&Coffee)" required value={catForm.title} onChange={e => setCatForm({...catForm, title: e.target.value})} className="bg-white/5 border border-white/20 p-3 rounded-lg" />
                  <input type="text" placeholder="Subtitle" value={catForm.subtitle} onChange={e => setCatForm({...catForm, subtitle: e.target.value})} className="bg-white/5 border border-white/20 p-3 rounded-lg md:col-span-2" />
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm text-white/50 mb-2">Category Image (Max 5MB)</label>
                    <input type="file" accept="image/*" onChange={e => setCatForm({...catForm, imageFile: e.target.files[0]})} className="w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#ffd54f] file:text-black hover:file:bg-[#ffcc80]"/>
                  </div>
                </div>
                <button type="submit" className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold">Save Category</button>
              </form>

              {/* CATEGORY LIST */}
              <div className="space-y-3">
                {categories.map((cat, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === categories.length - 1;

                  return (
                    <div key={cat.id} className="flex items-center justify-between bg-black/40 border border-white/5 p-4 rounded-xl">
                      <div className="flex items-center gap-4">
                        {cat.image ? <img src={cat.image} alt={cat.title} className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 bg-white/5 rounded flex items-center justify-center"><ImageIcon size={20} className="text-white/20"/></div>}
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {cat.title}
                          </div>
                          <div className="text-sm text-white/50">{cat.id}</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-center gap-3">
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg mr-2 p-1">
                          <button onClick={() => moveCategory(cat, 'up')} disabled={isFirst} className={`p-1.5 rounded disabled:opacity-30 ${isFirst ? '' : 'hover:bg-white/20'}`}><ArrowUp size={16}/></button>
                          <button onClick={() => moveCategory(cat, 'down')} disabled={isLast} className={`p-1.5 rounded disabled:opacity-30 ${isLast ? '' : 'hover:bg-white/20'}`}><ArrowDown size={16}/></button>
                        </div>
                        <button onClick={() => { setEditingCategory(cat); setCatForm({ id: cat.id, title: cat.title, subtitle: cat.subtitle || '', imageFile: null }); window.scrollTo(0, 0); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"><Edit2 size={16}/></button>
                        <button onClick={() => deleteCategory(cat)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {unsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-[#ffd54f]/30 flex justify-center items-center z-50 animate-fade-in shadow-[0_-10px_40px_rgba(255,213,79,0.1)]">
          <div className="flex items-center gap-6 max-w-6xl w-full px-6 justify-between">
            <span className="text-[#ffd54f] font-serif font-bold text-lg hidden md:block">Unsaved Order Changes</span>
            <span className="text-[#ffd54f] font-serif font-bold text-lg md:hidden">Unsaved Changes</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={cancelOrderChanges}
                disabled={isSavingOrders}
                className="bg-white/10 hover:bg-white/20 text-white px-4 md:px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={saveOrderChanges}
                disabled={isSavingOrders}
                className="bg-[#ffd54f] hover:bg-[#ffca28] text-black px-4 md:px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSavingOrders ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
