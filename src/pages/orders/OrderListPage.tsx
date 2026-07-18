import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { cn } from '../../components/ui/Button'
import { usePermissions } from '../../hooks/usePermissions'
import { useActivity } from '../../contexts/ActivityContext'
import { Search, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, ShoppingCart, Download } from 'lucide-react'

interface Order {
  id: string
  order_number: string
  customer_name: string
  product_details: string
  size_or_qty: number
  total_amount: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  order_date: string
}


const statusTabs = ['all', 'pending', 'completed', 'cancelled'] as const

type SortKey = 'order_number' | 'customer_name' | 'size_or_qty' | 'total_amount' | 'status' | 'order_date'
type SortDir = 'asc' | 'desc'

export function OrderListPage() {
  const { canCreateRecords, canEditRecords } = usePermissions()
  const { addActivity } = useActivity()
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<{id: string, name: string}[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [orderCategory, setOrderCategory] = useState('')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [price, setPrice] = useState<number | ''>('')
  const [amount, setAmount] = useState<number | ''>('')
  const perPage = 10

  useEffect(() => {
    if (quantity !== '' && price !== '') {
      setAmount(Number((quantity * price).toFixed(2)))
    }
  }, [quantity, price])

  const closeModal = () => {
    setShowModal(false)
    setOrderCategory('')
    setQuantity('')
    setPrice('')
    setAmount('')
  }

  const fetchData = async () => {
    setIsLoading(true)
    const [ordersRes, customersRes] = await Promise.all([
      supabase.from('orders').select('*, customers(first_name, last_name)'),
      supabase.from('customers').select('id, first_name, last_name')
    ])

    if (ordersRes.data) {
      const formatted = ordersRes.data.map((d: any) => ({
        id: d.id,
        order_number: d.order_number,
        customer_name: d.customers ? `${d.customers.first_name} ${d.customers.last_name}` : 'Unknown',
        product_details: d.product_details || '',
        size_or_qty: d.size_or_qty || 0,
        total_amount: d.total_amount || 0,
        status: d.status,
        order_date: d.order_date,
      }))
      setOrders(formatted)
    }

    if (customersRes.data) {
      setCustomers((customersRes.data as any[]).map((c: any) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })))
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter(o => {
      const matchSearch = !q || o.order_number.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q) || o.product_details.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [orders, search, statusFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === 'status') {
        const orderWeight: Record<string, number> = { pending: 1, completed: 2, cancelled: 3 }
        const wA = orderWeight[a.status] || 99
        const wB = orderWeight[b.status] || 99
        if (wA !== wB) return sortDir === 'asc' ? wA - wB : wB - wA
      }
      const av = a[sortKey]; const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
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

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1 })
    return c
  }, [orders])

  const handleStatusChange = async (id: string, newStatus: Order['status']) => {
    const order = orders.find(o => o.id === id)
    const { error } = await (supabase.from('orders') as any).update({ status: newStatus }).eq('id', id)
    
    if (!error) {
      if (order) {
        addActivity(newStatus, 'order', order.order_number, `Changed status from ${order.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')} for ${order.customer_name}`)
      }

        if (newStatus === 'completed') {
          const { data: existing } = await supabase.from('installation_tracking').select('id').eq('order_id', id).maybeSingle()
          if (!existing) {
            const { data: latestInstalls } = await supabase
              .from('installation_tracking')
              .select('scheduled_date')
              .order('scheduled_date', { ascending: false })
              .limit(1)

            let nextDate = new Date()
            nextDate.setDate(nextDate.getDate() + 1)
            
            let year = nextDate.getFullYear()
            let month = String(nextDate.getMonth() + 1).padStart(2, '0')
            let day = String(nextDate.getDate()).padStart(2, '0')
            let formattedDate = `${year}-${month}-${day}`

            if (latestInstalls && latestInstalls.length > 0 && (latestInstalls[0] as any).scheduled_date) {
              const [lYear, lMonth, lDay] = (latestInstalls[0] as any).scheduled_date.split('-').map(Number)
              const latestDate = new Date(lYear, lMonth - 1, lDay)
              latestDate.setDate(latestDate.getDate() + 1)
              
              if (latestDate > nextDate) {
                year = latestDate.getFullYear()
                month = String(latestDate.getMonth() + 1).padStart(2, '0')
                day = String(latestDate.getDate()).padStart(2, '0')
                formattedDate = `${year}-${month}-${day}`
              }
            }

            await supabase.from('installation_tracking').insert([{ order_id: id, scheduled_date: formattedDate }] as any)
          }
        }

      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    } else {
      console.error(error)
    }
  }

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    
    if (!orderCategory) return;
    
    const customerId = fd.get('customerId') as string
    const customer = customers.find(c => c.id === customerId)

    let productType = ''
    let sizeOrQty = 0
    let qty = fd.get('quantity')
    let qtyStr = qty ? ` (x${qty})` : ''

    if (orderCategory === 'Solar Panel') {
      productType = `${fd.get('product_details')}${qtyStr}`
      sizeOrQty = Number(fd.get('systemSize'))
    } else if (orderCategory === 'Inverter') {
      productType = `Inverter: ${fd.get('inverterModel')}${qtyStr}`
      sizeOrQty = Number(fd.get('inverterCapacity'))
    } else if (orderCategory === 'Battery') {
      productType = `Battery: ${fd.get('batteryModel')}${qtyStr}`
      sizeOrQty = Number(fd.get('capacity'))
    } else {
      productType = `Accessory: ${fd.get('itemDescription')}`
      sizeOrQty = Number(fd.get('quantity'))
    }

    const orderData = {
      customer_id: customerId,
      order_category: orderCategory,
      product_details: productType,
      size_or_qty: sizeOrQty,
      total_amount: Number(fd.get('amount')),
      status: 'pending' as const,
    }

    const { data, error } = await supabase.from('orders').insert([orderData] as any).select().single()

    if (!error && data) {
      addActivity('pending', 'order', (data as any).order_number, `New order created for ${customer?.name}`)
      fetchData()
      closeModal()
    } else {
      console.error(error)
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(n)

  const downloadCompletedOrders = () => {
    const completed = orders.filter(o => o.status === 'completed')
    if (completed.length === 0) return
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Completed Orders Report</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; padding: 20px; }
        h1 { color: #1e293b; font-size: 22px; margin-bottom: 4px; }
        .subtitle { color: #64748b; font-size: 12px; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th { background-color: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left; }
        td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
        tr:nth-child(even) td { background-color: #f8fafc; }
        .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; }
      </style></head><body>
      <h1>Shrine Solar — Completed Orders Report</h1>
      <p class="subtitle">Generated on ${today} &bull; ${completed.length} record(s)</p>
      <table>
        <tr><th>Order #</th><th>Customer</th><th>Product</th><th>Size/Qty</th><th>Amount</th><th>Order Date</th></tr>
        ${completed.map(o => `<tr><td>${o.order_number}</td><td>${o.customer_name}</td><td>${o.product_details}</td><td>${o.size_or_qty}</td><td>${fmt(o.total_amount)}</td><td>${o.order_date}</td></tr>`).join('')}
      </table>
      <p class="footer">This report was automatically generated by Shrine Solar Admin.</p>
      </body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `completed_orders_${new Date().toISOString().split('T')[0]}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h2>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} orders found</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={downloadCompletedOrders} className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Download Completed
          </Button>
          {canCreateRecords && (
            <Button onClick={() => setShowModal(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize',
              statusFilter === s
                ? 'border-amber-500/30 bg-amber-50 text-amber-600'
                : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')} ({statusCounts[s] || 0})
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="h-9 w-full rounded-lg bg-white border border-slate-300 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors" placeholder="Search by order #, customer, or panel..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200">
                  {([
                    { key: 'order_number' as SortKey, label: 'Order #' },
                    { key: 'customer_name' as SortKey, label: 'Customer' },
                    { key: 'customer_name' as SortKey, label: 'Product Details', sortable: false },
                    { key: 'size_or_qty' as SortKey, label: 'Size / Qty' },
                    { key: 'total_amount' as SortKey, label: 'Amount' },
                    { key: 'status' as SortKey, label: 'Status' },
                    { key: 'order_date' as SortKey, label: 'Order Date' },
                  ] as Array<{ key: SortKey; label: string; sortable?: boolean }>).map((col, i) => (
                    <th key={i} onClick={() => col.sortable !== false && toggleSort(col.key)} className={cn("text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider group select-none", col.sortable !== false && 'cursor-pointer hover:text-slate-900 transition-colors')}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable !== false && <SortIcon col={col.key} />}
                      </div>
                    </th>
                  ))}
                  {canEditRecords && <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-slate-500">Loading orders...</td></tr>
                ) : paged.length > 0 ? (
                  paged.map(o => (
                    <tr key={o.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-amber-600 font-medium">{o.order_number}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{o.customer_name}</td>
                      <td className="py-3 px-4 text-slate-600">{o.product_details}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {o.size_or_qty} {o.product_details.startsWith('Battery') ? 'kWh' : o.product_details.startsWith('Accessory') ? 'pcs' : 'kW'}
                      </td>
                      <td className="py-3 px-4 text-emerald-600 font-semibold">{fmt(o.total_amount)}</td>
                      <td className="py-3 px-4"><StatusBadge status={o.status} /></td>
                      <td className="py-3 px-4 text-slate-500">{new Date(o.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      {canEditRecords && (
                        <td className="py-3 px-4 text-right">
                          {o.status === 'completed' || o.status === 'cancelled' ? (
                            <span className={`inline-block h-7 px-3 py-1 rounded text-xs font-medium capitalize ${o.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {o.status}
                            </span>
                          ) : (
                            <select
                              defaultValue=""
                              onChange={(e) => handleStatusChange(o.id, e.target.value as Order['status'])}
                              className="h-7 rounded bg-white border border-slate-300 px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors capitalize"
                            >
                              <option value="" disabled>Select Action</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="py-12 text-center text-slate-500"><ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />No orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of {sorted.length}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={cn('h-8 w-8 rounded-lg text-xs font-medium transition-colors', p === page ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white shadow-xl border border-slate-200 rounded-2xl p-6 w-full max-w-lg animate-[fadeIn_0.2s_ease] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Create New Order</h3>
              <button type="button" onClick={closeModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Customer <span className="text-red-500">*</span></label>
                <select name="customerId" className="flex h-10 w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" required defaultValue="">
                  <option value="" disabled>Select a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Order Category <span className="text-red-500">*</span></label>
                <select 
                  name="orderCategory" 
                  value={orderCategory}
                  onChange={(e) => { setOrderCategory(e.target.value); setQuantity(''); setPrice(''); setAmount(''); }}
                  className="flex h-10 w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                  required
                >
                  <option value="" disabled>Select a category...</option>
                  <option value="Solar Panel">Solar Panel</option>
                  <option value="Battery">Battery</option>
                  <option value="Inverter">Inverter</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              {orderCategory === 'Solar Panel' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Panel Type</label>
                    <select name="product_details" className="flex h-10 w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors">
                      <option>Trina Solar Vertex S</option>
                      <option>Trina Solar Vertex N</option>
                      <option>Canadian Solar HiKu7</option>
                      <option>Canadian Solar TOPBiHiKu7</option>
                      <option>LONGi Hi-MO 6</option>
                      <option>LONGi Hi-MO 7</option>
                      <option>JA Solar DeepBlue 4.0</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="System Size (kW)" name="systemSize" type="number" step="0.1" required />
                    <Input label="Quantity" name="quantity" type="number" required value={quantity} onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Price per Unit (₱)" name="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')} />
                    <Input label="Total Amount (₱)" name="amount" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                </>
              )}

              {orderCategory === 'Battery' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Battery Model <span className="text-red-500">*</span></label>
                    <select name="batteryModel" className="flex h-10 w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" required>
                      <option value="Tesla Powerwall 2">Tesla Powerwall 2</option>
                      <option value="Enphase IQ Battery 10">Enphase IQ Battery 10</option>
                      <option value="LG RESU10H">LG RESU10H</option>
                      <option value="BYD Battery-Box Premium">BYD Battery-Box Premium</option>
                      <option value="Pylontech US3000C">Pylontech US3000C</option>
                      <option value="Huawei LUNA2000">Huawei LUNA2000</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Capacity (kWh)" name="capacity" type="number" step="0.1" required />
                    <Input label="Quantity" name="quantity" type="number" required value={quantity} onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Price per Unit (₱)" name="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')} />
                    <Input label="Total Amount (₱)" name="amount" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                </>
              )}

              {orderCategory === 'Inverter' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Inverter Model <span className="text-red-500">*</span></label>
                    <select name="inverterModel" className="flex h-10 w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" required>
                      <option value="SolarEdge Energy Hub">SolarEdge Energy Hub</option>
                      <option value="Enphase IQ8 Microinverter">Enphase IQ8 Microinverter</option>
                      <option value="Fronius Primo">Fronius Primo</option>
                      <option value="SMA Sunny Boy">SMA Sunny Boy</option>
                      <option value="Growatt MIN">Growatt MIN</option>
                      <option value="GoodWe DNS">GoodWe DNS</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Capacity (kW)" name="inverterCapacity" type="number" step="0.1" required />
                    <Input label="Quantity" name="quantity" type="number" required value={quantity} onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Price per Unit (₱)" name="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')} />
                    <Input label="Total Amount (₱)" name="amount" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                </>
              )}

              {orderCategory === 'Accessories' && (
                <>
                  <Input label="Item Description" name="itemDescription" required />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Quantity" name="quantity" type="number" required value={quantity} onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Price per Unit (₱)" name="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')} />
                    <Input label="Total Amount (₱)" name="amount" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setOrderCategory(''); }}>Cancel</Button>
                <Button type="submit" disabled={!orderCategory}>Create Order</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
