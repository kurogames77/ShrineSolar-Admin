import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { cn } from '../../components/ui/Button'
import { usePermissions } from '../../hooks/usePermissions'
import { useActivity } from '../../contexts/ActivityContext'
import { Search, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Settings, CheckCircle, Trash2, Edit2, Download, Ban } from 'lucide-react'

export interface MaintenanceRequest {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  address: string | null
  system_details: string | null
  issue_description: string
  status: 'pending' | 'reviewed' | 'scheduled' | 'completed' | 'cancelled'
  preferred_date: string | null
  created_at: string
  updated_at: string
}

type SortKey = 'customer_name' | 'status' | 'created_at' | 'preferred_date'
type SortDir = 'asc' | 'desc'

export function MaintenanceListPage() {
  const { canCreateRecords, canEditRecords, canDeleteRecords } = usePermissions()
  const { addActivity } = useActivity()
  
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  
  const [showModal, setShowModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null)
  
  const [requestToDelete, setRequestToDelete] = useState<MaintenanceRequest | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null)

  const perPage = 10

  const fetchData = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from('maintenance_requests').select('*')
    if (error) {
      console.error(error)
    } else if (data) {
      setRequests(data as MaintenanceRequest[])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const statuses = ['all', 'pending', 'reviewed', 'scheduled', 'completed', 'cancelled']

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return requests.filter(r => {
      const matchSearch = !q || r.customer_name.toLowerCase().includes(q) || r.customer_email.toLowerCase().includes(q) || r.issue_description.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [requests, search, statusFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey]
      if (!av && bv) return sortDir === 'asc' ? -1 : 1
      if (av && !bv) return sortDir === 'asc' ? 1 : -1
      if (!av && !bv) return 0
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
    setEditingRequest(null)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    
    const requestData = {
      customer_name: fd.get('customer_name') as string,
      customer_email: fd.get('customer_email') as string,
      customer_phone: fd.get('customer_phone') as string,
      address: fd.get('address') as string,
      system_details: fd.get('system_details') as string,
      issue_description: fd.get('issue_description') as string,
      status: fd.get('status') as any,
      preferred_date: fd.get('preferred_date') ? (fd.get('preferred_date') as string) : null,
    }

    if (editingRequest) {
      // @ts-ignore
      const { data, error } = await supabase.from('maintenance_requests').update(requestData as any).eq('id', editingRequest.id).select()
      if (error) {
        console.error(error)
        showToast('Failed to update request')
      } else if (!data || data.length === 0) {
        console.error('Update returned 0 rows — RLS policy may be blocking the operation')
        showToast('Update failed — insufficient permissions')
      } else {
        addActivity('edit', 'maintenance', requestData.customer_name, `Updated maintenance request`)
        showToast('Request updated successfully')
        fetchData()
        closeModal()
      }
    } else {
      // @ts-ignore
      const { data, error } = await supabase.from('maintenance_requests').insert([requestData] as any).select().single()
      if (!error && data) {
        addActivity('add', 'maintenance', requestData.customer_name, `Added maintenance request`)
        showToast('Request added successfully')
        fetchData()
        closeModal()
      } else {
        console.error(error)
      }
    }
  }

  const confirmDelete = async () => {
    if (!requestToDelete) return
    const { data, error } = await supabase.from('maintenance_requests').delete().eq('id', requestToDelete.id).select()
    if (error) {
      console.error(error)
      showToast('Failed to delete request')
    } else if (!data || data.length === 0) {
      console.error('Delete returned 0 rows — RLS policy may be blocking the operation')
      showToast('Delete failed — insufficient permissions')
    } else {
      addActivity('delete', 'maintenance', requestToDelete.customer_name, `Deleted maintenance request`)
      showToast('Request deleted successfully')
      fetchData()
    }
    setRequestToDelete(null)
  }

  const quickUpdateStatus = async (request: MaintenanceRequest, newStatus: 'completed' | 'cancelled') => {
    const { data, error } = await supabase.from('maintenance_requests').update({ status: newStatus } as any).eq('id', request.id).select()
    if (error) {
      console.error(error)
      showToast(`Failed to mark as ${newStatus}`)
    } else if (!data || data.length === 0) {
      showToast('Update failed — insufficient permissions')
    } else {
      addActivity('edit', 'maintenance', request.customer_name, `Marked maintenance request as ${newStatus}`)
      showToast(`Request marked as ${newStatus}`)
      fetchData()
    }
  }

  const downloadWord = () => {
    const rowsHtml = sorted.map(r => `
      <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
        <h3>Customer: ${r.customer_name}</h3>
        <p><strong>Email:</strong> ${r.customer_email}<br/>
        <strong>Phone:</strong> ${r.customer_phone || 'N/A'}<br/>
        <strong>Address:</strong> ${r.address || 'N/A'}</p>
        <p><strong>Status:</strong> ${r.status}<br/>
        <strong>System Details:</strong> ${r.system_details || 'N/A'}<br/>
        <strong>Preferred Date:</strong> ${r.preferred_date ? new Date(r.preferred_date).toLocaleDateString() : 'N/A'}<br/>
        <strong>Submitted On:</strong> ${new Date(r.created_at).toLocaleDateString()}</p>
        <p><strong>Issue Description:</strong><br/>${r.issue_description.replace(/\n/g, '<br/>')}</p>
      </div>
    `).join('')

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Maintenance Requests</title></head>
      <body style="font-family: Arial, sans-serif;">
        <h2>Maintenance Requests</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        <hr/>
        ${rowsHtml}
      </body>
      </html>
    `

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `maintenance_requests_${new Date().toISOString().slice(0, 10)}.doc`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Maintenance Requests</h2>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} requests found</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={downloadWord} className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          {canCreateRecords && (
            <Button onClick={() => setShowModal(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize',
              statusFilter === s
                ? 'border-amber-500/30 bg-amber-50 text-amber-600'
                : 'border-slate-200 bg-white text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:border-slate-300'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="h-9 w-full rounded-lg bg-white border border-slate-300 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors" placeholder="Search requests..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>

          <div className="overflow-x-auto mobile-scroll">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200">
                  {([
                    { key: 'customer_name' as SortKey, label: 'Customer' },
                    { key: 'status' as SortKey, label: 'Status' },
                  ] as Array<{ key: SortKey; label: string }>).map((col, i) => (
                    <th key={i} onClick={() => toggleSort(col.key)} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:text-white transition-colors group select-none">
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Details</th>
                  {([
                    { key: 'preferred_date' as SortKey, label: 'Pref. Date' },
                    { key: 'created_at' as SortKey, label: 'Submitted On' },
                  ] as Array<{ key: SortKey; label: string }>).map((col, i) => (
                    <th key={i} onClick={() => toggleSort(col.key)} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:text-white transition-colors group select-none">
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Issue</th>
                  {canEditRecords && <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-slate-500">Loading requests...</td></tr>
                ) : paged.length > 0 ? (
                  paged.map(r => (
                    <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                        {r.customer_name}
                        <div className="text-xs text-slate-500 font-normal">{r.customer_email}</div>
                        {r.address && <div className="text-xs text-slate-400 font-normal mt-0.5">{r.address}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-block h-6 px-2 py-0.5 rounded text-xs font-medium capitalize",
                          r.status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                          r.status === 'scheduled' ? "bg-blue-50 text-blue-600" :
                          r.status === 'cancelled' ? "bg-red-50 text-red-600" :
                          "bg-amber-50 text-amber-600"
                        )}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {r.system_details || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {r.preferred_date ? new Date(r.preferred_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={r.issue_description}>
                        {r.issue_description}
                      </td>
                      {canEditRecords && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.status !== 'completed' && (
                              <button onClick={() => quickUpdateStatus(r, 'completed')} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Mark Completed">
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            {r.status !== 'cancelled' && (
                              <button onClick={() => quickUpdateStatus(r, 'cancelled')} className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Mark Cancelled">
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => { setEditingRequest(r); setShowModal(true); }} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {canDeleteRecords && (
                              <button onClick={() => setRequestToDelete(r)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="py-12 text-center text-slate-500"><Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />No requests found.</td></tr>
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
        <div className="fixed inset-0 z-50 flex items-start pt-[5vh] justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white shadow-xl border border-slate-200 rounded-2xl p-6 w-full max-w-lg animate-[fadeIn_0.2s_ease] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingRequest ? 'Edit Request' : 'New Request'}</h3>
              <button type="button" onClick={closeModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Customer Name *" name="customer_name" required defaultValue={editingRequest?.customer_name || ''} />
                <Input label="Customer Email *" name="customer_email" type="email" required defaultValue={editingRequest?.customer_email || ''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Phone" name="customer_phone" defaultValue={editingRequest?.customer_phone || ''} />
                <Input label="Preferred Date" name="preferred_date" type="date" defaultValue={editingRequest?.preferred_date || ''} />
              </div>
              <Input label="Address" name="address" defaultValue={editingRequest?.address || ''} />
              
              {editingRequest ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Status *</label>
                  <select name="status" required defaultValue={editingRequest.status} className="flex h-10 w-full rounded-lg bg-white border border-slate-300 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors">
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              ) : (
                <input type="hidden" name="status" value="pending" />
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">System Details</label>
                <select name="system_details" defaultValue={editingRequest?.system_details || ''} className="flex h-10 w-full rounded-lg bg-white border border-slate-300 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors">
                  <option value="" disabled>Select system component...</option>
                  <option value="Inverters">Inverters</option>
                  <option value="Accessories & Monitoring">Accessories & Monitoring</option>
                  <option value="Solar Panels">Solar Panels</option>
                  <option value="Energy Storage">Energy Storage</option>
                  <option value="Solar Portable Power Station">Solar Portable Power Station</option>
                  <option value="Wires">Wires</option>
                  <option value="PV Mounting Accessories">PV Mounting Accessories</option>
                  <option value="Breakers & SPD's">Breakers & SPD's</option>
                  <option value="Rapid Shutdown Device">Rapid Shutdown Device</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Issue Description *</label>
                <textarea name="issue_description" rows={3} required defaultValue={editingRequest?.issue_description || ''} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                <Button type="submit">Save Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {requestToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRequestToDelete(null)} />
          <div className="relative bg-white shadow-xl border border-slate-200 rounded-2xl p-6 w-full max-w-sm animate-[fadeIn_0.15s_ease]">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Request</h3>
              <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete the request from {requestToDelete.customer_name}? This action cannot be undone.</p>
              <div className="flex gap-3 w-full">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setRequestToDelete(null)}>Cancel</Button>
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
