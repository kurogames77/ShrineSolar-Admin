import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { cn } from '../../components/ui/Button'
import { usePermissions } from '../../hooks/usePermissions'
import { useActivity } from '../../contexts/ActivityContext'
import { Search, UserPlus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2, X, Users } from 'lucide-react'

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address?: string
  orders: number
  created_at: string
}


type SortKey = keyof Customer
type SortDir = 'asc' | 'desc'

export function CustomerListPage() {
  const { canCreateRecords, canEditRecords, canDeleteRecords } = usePermissions()
  const { addActivity } = useActivity()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const perPage = 10

  const fetchCustomers = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*, orders(count)')

    if (error) {
      console.error('Error fetching customers:', error)
    } else if (data) {
      const formatted = data.map((d: any) => ({
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        email: d.email,
        phone: d.phone || '',
        address: d.address_line1 || '',
        orders: d.orders?.[0]?.count || 0,
        created_at: d.created_at,
      }))
      setCustomers(formatted)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return customers.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.orders.toString().includes(q)
    )
  }, [customers, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
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

  const handleDelete = (id: string) => {
    setCustomerToDelete(id)
  }

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    
    const cust = customers.find(c => c.id === customerToDelete)
    const { error } = await supabase.from('customers').delete().eq('id', customerToDelete)
    
    if (error) {
      console.error('Error deleting customer:', error)
      setErrorPopup('Error deleting customer: ' + error.message)
      setCustomerToDelete(null)
      return
    }

    if (cust) {
      addActivity('delete', 'customer', `${cust.first_name} ${cust.last_name}`, 'Removed customer record')
    }
    setCustomers(prev => prev.filter(c => c.id !== customerToDelete))
    setCustomerToDelete(null)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    
    let email = fd.get('email') as string
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      // If they didn't include it, append it. Or if they put @yahoo.com, we could reject it.
      // But let's just force @gmail.com
      const username = email.split('@')[0]
      email = `${username}@gmail.com`
    }

    const barangay = fd.get('barangay') as string
    const city = fd.get('city') as string
    const combinedAddress = [barangay, city].filter(Boolean).join(', ')
    
    const customerData = {
      first_name: fd.get('firstName') as string,
      last_name: fd.get('lastName') as string,
      email: email,
      phone: fd.get('phone') as string,
      address_line1: combinedAddress,
    }
    
    if (editingCustomer) {
      const { error } = await (supabase.from('customers') as any)
        .update(customerData)
        .eq('id', editingCustomer.id)

      if (!error) {
        addActivity('update', 'customer', `${customerData.first_name} ${customerData.last_name}`, 'Updated customer details')
        fetchCustomers()
        setShowModal(false)
        setEditingCustomer(null)
      } else {
        console.error(error)
        setErrorPopup('Error updating customer: ' + error.message)
      }
    } else {
      const { error } = await supabase
        .from('customers')
        .insert([customerData] as any)

      if (!error) {
        addActivity('create', 'customer', `${customerData.first_name} ${customerData.last_name}`, 'Created new customer')
        fetchCustomers()
        setShowModal(false)
        setEditingCustomer(null)
      } else {
        console.error(error)
        setErrorPopup('Error adding customer: ' + (error.message === 'duplicate key value violates unique constraint "customers_email_key"' ? 'Email address already exists.' : error.message))
      }
    }
  }

  const handleOpenAddModal = () => {
    setEditingCustomer(null)
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Customers</h2>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} total customers</p>
        </div>
        {canCreateRecords && (
          <Button onClick={handleOpenAddModal} className="shrink-0">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                className="h-9 w-full rounded-lg bg-white border border-slate-200 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
                placeholder="Search by name, email, phone, or orders..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>

          <div className="overflow-x-auto mobile-scroll">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800">
                  {[
                    { key: 'first_name' as SortKey, label: 'Name' },
                    { key: 'email' as SortKey, label: 'Email' },
                    { key: 'phone' as SortKey, label: 'Phone' },
                    { key: 'address' as SortKey, label: 'Address' },
                    { key: 'orders' as SortKey, label: 'Orders' },
                    { key: 'created_at' as SortKey, label: 'Date Added' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-800 transition-colors group select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  {(canEditRecords || canDeleteRecords) && (
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Loading customers...
                    </td>
                  </tr>
                ) : paged.length > 0 ? (
                  paged.map(c => (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-medium text-slate-700 border border-slate-200">
                            {c.first_name[0]}{c.last_name[0]}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{c.first_name} {c.last_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{c.email}</td>
                      <td className="py-3 px-4 text-slate-700">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-700 max-w-[200px] break-words whitespace-normal">{c.address || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center justify-center h-6 min-w-[24px] rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold px-2">
                          {c.orders}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      {(canEditRecords || canDeleteRecords) && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEditRecords && (
                              <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDeleteRecords && (
                              <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={cn('h-8 w-8 rounded-lg text-xs font-medium transition-colors', p === page ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-slate-900 dark:text-white hover:bg-white/5')}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditingCustomer(null); }} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-lg animate-[fadeIn_0.2s_ease] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => { setShowModal(false); setEditingCustomer(null); }} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-white hover:bg-white/5"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" name="firstName" defaultValue={editingCustomer?.first_name} required />
                <Input label="Last Name" name="lastName" defaultValue={editingCustomer?.last_name} required />
              </div>
              <Input label="Email" name="email" type="email" defaultValue={editingCustomer?.email} placeholder="username@gmail.com" required />
              <Input label="Phone" name="phone" defaultValue={editingCustomer?.phone} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Barangay" name="barangay" defaultValue={editingCustomer?.address?.split(', ')[0] || ''} />
                <Input label="City" name="city" defaultValue={editingCustomer?.address?.split(', ')[1] || (editingCustomer?.address && !editingCustomer?.address?.includes(', ') ? editingCustomer?.address : '')} />
              </div>
              
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setEditingCustomer(null); }}>Cancel</Button>
                <Button type="submit">{editingCustomer ? 'Save Changes' : 'Add Customer'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCustomerToDelete(null)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-sm animate-[fadeIn_0.2s_ease]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Customer</h3>
              <button onClick={() => setCustomerToDelete(null)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-white hover:bg-white/5"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Are you sure you want to delete this customer? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => setCustomerToDelete(null)}>Cancel</Button>
              <Button type="button" className="bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
      {/* Error Popup Modal */}
      {errorPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setErrorPopup(null)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-sm animate-[fadeIn_0.2s_ease]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-500">Error</h3>
              <button onClick={() => setErrorPopup(null)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-white hover:bg-white/5"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{errorPopup}</p>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setErrorPopup(null)}>OK</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
