import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { cn } from '../../components/ui/Button'
import { usePermissions } from '../../hooks/usePermissions'
import { useActivity } from '../../contexts/ActivityContext'
import { Search, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Package, CheckCircle, Trash2, Edit2, Upload } from 'lucide-react'

export interface Product {
  id: string
  name: string
  category: string
  description: string | null
  price: number
  stock_quantity: number
  image_url: string | null
  is_active: boolean
  created_at: string
}

type SortKey = 'name' | 'category' | 'price' | 'stock_quantity' | 'is_active' | 'created_at'
type SortDir = 'asc' | 'desc'

export function ProductsListPage() {
  const { canCreateRecords, canEditRecords, canDeleteRecords } = usePermissions()
  const { addActivity } = useActivity()
  
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const perPage = 10

  const fetchData = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from('products').select('*')
    if (error) {
      console.error(error)
    } else if (data) {
      setProducts(data as Product[])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category))
    return ['all', ...Array.from(cats)].sort()
  }, [products])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [products, search, categoryFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      if (typeof av === 'boolean' && typeof bv === 'boolean') return sortDir === 'asc' ? (av === bv ? 0 : av ? -1 : 1) : (av === bv ? 0 : av ? 1 : -1)
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / perPage)
  const paged = sorted.slice((page - 1) * perPage, page * perPage)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-amber-400" /> : <ChevronDown className="h-3 w-3 text-amber-400" />
  }

  const showToast = (message: string) => {
    setToast({ message, visible: true })
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null)
      setTimeout(() => setToast(null), 300)
    }, 3000)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProduct(null)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    
    const productData = {
      name: fd.get('name') as string,
      category: fd.get('category') as string,
      description: fd.get('description') as string,
      price: Number(fd.get('price')),
      stock_quantity: Number(fd.get('stock_quantity')),
      is_active: fd.get('is_active') === 'on',
    }

    if (editingProduct) {
      const { error } = await supabase.from('products').update(productData as any).eq('id', editingProduct.id)
      if (!error) {
        addActivity('edit', 'product', productData.name, `Updated product details`)
        showToast('Product updated successfully')
        fetchData()
        closeModal()
      } else {
        console.error(error)
      }
    } else {
      const { data, error } = await supabase.from('products').insert([productData] as any).select().single()
      if (!error && data) {
        addActivity('add', 'product', productData.name, `Added new product`)
        showToast('Product added successfully')
        fetchData()
        closeModal()
      } else {
        console.error(error)
      }
    }
  }

  const confirmDelete = async () => {
    if (!productToDelete) return
    const { error } = await supabase.from('products').delete().eq('id', productToDelete.id)
    if (!error) {
      addActivity('delete', 'product', productToDelete.name, `Deleted product`)
      showToast('Product deleted successfully')
      fetchData()
    } else {
      console.error(error)
    }
    setProductToDelete(null)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, productId: string) => {
    if (!e.target.files || e.target.files.length === 0) return
    setIsUploading(true)
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `products/${productId}/${fileName}`
    
    const { error: uploadError } = await supabase.storage.from('product_images').upload(filePath, file)
    
    if (!uploadError) {
      const { data } = supabase.storage.from('product_images').getPublicUrl(filePath)
      await supabase.from('products').update({ image_url: data.publicUrl } as any).eq('id', productId)
      showToast('Image uploaded successfully')
      fetchData()
    } else {
      console.error('Error uploading:', uploadError)
      showToast('Error uploading image (bucket might be missing)')
    }
    setIsUploading(false)
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Products</h2>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} products found</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateRecords && (
            <Button onClick={() => setShowModal(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => { setCategoryFilter(c); setPage(1) }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize',
              categoryFilter === c
                ? 'border-amber-500/30 bg-amber-50 text-amber-600'
                : 'border-slate-200 bg-white text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:border-slate-300'
            )}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="h-9 w-full rounded-lg bg-white border border-slate-300 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>

          <div className="overflow-x-auto mobile-scroll">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Image</th>
                  {([
                    { key: 'name' as SortKey, label: 'Name' },
                    { key: 'category' as SortKey, label: 'Category' },
                    { key: 'price' as SortKey, label: 'Price' },
                    { key: 'stock_quantity' as SortKey, label: 'Stock' },
                    { key: 'is_active' as SortKey, label: 'Status' },
                  ] as Array<{ key: SortKey; label: string }>).map((col, i) => (
                    <th key={i} onClick={() => toggleSort(col.key)} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:text-white transition-colors group select-none">
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  {canEditRecords && <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500">Loading products...</td></tr>
                ) : paged.length > 0 ? (
                  paged.map(p => (
                    <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="h-10 w-10 rounded overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 group relative">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-300" />
                          )}
                          <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Upload className="h-4 w-4 text-white" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, p.id)} disabled={isUploading} />
                          </label>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{p.name}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{p.category}</td>
                      <td className="py-3 px-4 font-medium text-emerald-600">{fmt(p.price)}</td>
                      <td className="py-3 px-4">
                        <span className={cn("px-2 py-1 rounded text-xs font-medium", p.stock_quantity > 10 ? "bg-emerald-50 text-emerald-600" : p.stock_quantity > 0 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600")}>
                          {p.stock_quantity} in stock
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("inline-block h-6 px-2 py-0.5 rounded text-xs font-medium capitalize", p.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600")}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canEditRecords && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setEditingProduct(p); setShowModal(true); }} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {canDeleteRecords && (
                              <button onClick={() => setProductToDelete(p)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500"><Package className="h-8 w-8 mx-auto mb-2 opacity-50" />No products found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of {sorted.length}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={cn('h-8 w-8 rounded-lg text-xs font-medium transition-colors', p === page ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:text-slate-900 dark:text-white hover:bg-slate-100')}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white shadow-xl border border-slate-200 rounded-2xl p-6 w-full max-w-lg animate-[fadeIn_0.2s_ease]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
              <button type="button" onClick={closeModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Product Name *" name="name" required defaultValue={editingProduct?.name || ''} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Category *</label>
                  <select name="category" required defaultValue={editingProduct?.category || ''} className="flex h-10 w-full rounded-lg bg-white border border-slate-300 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors">
                    <option value="" disabled>Select...</option>
                    <option value="Solar Panel">Solar Panel</option>
                    <option value="Battery">Battery</option>
                    <option value="Inverter">Inverter</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea name="description" rows={3} defaultValue={editingProduct?.description || ''} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Price (₱) *" name="price" type="number" step="0.01" required defaultValue={editingProduct?.price || ''} />
                <Input label="Stock Quantity *" name="stock_quantity" type="number" required defaultValue={editingProduct?.stock_quantity ?? 0} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="is_active" name="is_active" defaultChecked={editingProduct ? editingProduct.is_active : true} className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4" />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active (Visible on website)</label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                <Button type="submit">Save Product</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProductToDelete(null)} />
          <div className="relative bg-white shadow-xl border border-slate-200 rounded-2xl p-6 w-full max-w-sm animate-[fadeIn_0.15s_ease]">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Product</h3>
              <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete {productToDelete.name}? This action cannot be undone.</p>
              <div className="flex gap-3 w-full">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setProductToDelete(null)}>Cancel</Button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 bg-white shadow-lg border border-slate-200 rounded-xl ${toast.visible ? 'toast-enter' : 'toast-exit'}`}>
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-slate-900">{toast.message}</p>
          <button onClick={() => setToast(prev => prev ? { ...prev, visible: false } : null)} className="p-0.5 text-slate-400 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
