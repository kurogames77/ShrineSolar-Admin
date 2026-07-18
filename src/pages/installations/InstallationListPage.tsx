import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button, cn } from '../../components/ui/Button'
import { usePermissions } from '../../hooks/usePermissions'
import { useActivity } from '../../contexts/ActivityContext'
import { Search, Wrench, ClipboardCheck, HardHat, Eye, Pause, CheckCircle2, ChevronLeft, ChevronRight, Download, X } from 'lucide-react'

interface Installation {
  id: string
  order_number: string
  customer_name: string
  installation_status: 'scheduled' | 'site_survey' | 'in_progress' | 'completed' | 'on_hold'
  scheduled_date: string
  completion_date: string | null
}


const statusTabs = ['all', 'scheduled', 'site_survey', 'in_progress', 'completed', 'on_hold'] as const

const pipelineConfig = [
  { key: 'scheduled', label: 'Scheduled', icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'site_survey', label: 'Site Survey', icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { key: 'in_progress', label: 'In Progress', icon: HardHat, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'on_hold', label: 'On Hold', icon: Pause, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
]

export function InstallationListPage() {
  const { canEditRecords } = usePermissions()
  const { addActivity } = useActivity()
  const [installations, setInstallations] = useState<Installation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [rescheduleModal, setRescheduleModal] = useState<{isOpen: boolean, instId: string | null}>({ isOpen: false, instId: null })
  const [newDate, setNewDate] = useState('')
  const perPage = 10

  const fetchData = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('installation_tracking')
      .select(`
        *,
        orders (
          order_number,
          customers (first_name, last_name)
        )
      `)

    if (error) {
      console.error(error)
    } else if (data) {
      const formatted = data.map((d: any) => ({
        id: d.id,
        order_number: d.orders?.order_number || 'Unknown',
        customer_name: d.orders?.customers ? `${d.orders.customers.first_name} ${d.orders.customers.last_name}` : 'Unknown',
        installation_status: d.installation_status,
        scheduled_date: d.scheduled_date,
        completion_date: d.completion_date,
      }))
      setInstallations(formatted)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    installations.forEach(i => { c[i.installation_status] = (c[i.installation_status] || 0) + 1 })
    return c
  }, [installations])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const filteredList = installations.filter(i => {
      const matchSearch = !q || i.order_number.toLowerCase().includes(q) || i.customer_name.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || i.installation_status === statusFilter
      return matchSearch && matchStatus
    })

    const orderWeight: Record<string, number> = { scheduled: 1, site_survey: 2, in_progress: 3, completed: 4, on_hold: 5 }
    return filteredList.sort((a, b) => {
      const wA = orderWeight[a.installation_status] || 99
      const wB = orderWeight[b.installation_status] || 99
      return wA - wB
    })
  }, [installations, search, statusFilter])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'reschedule') {
      setRescheduleModal({ isOpen: true, instId: id })
      return
    }
    const inst = installations.find(i => i.id === id)
    const updateData: any = { installation_status: newStatus }
    if (newStatus === 'completed') {
      updateData.completion_date = new Date().toISOString().split('T')[0]
    }

    const { error } = await (supabase.from('installation_tracking') as any).update(updateData).eq('id', id)
    
    if (!error) {
      if (inst) {
        addActivity(newStatus, 'installation', inst.order_number, `Changed status from ${inst.installation_status.replace('_', ' ')} to ${newStatus.replace('_', ' ')} for ${inst.customer_name}`)
      }
      setInstallations(prev => prev.map(i => i.id === id ? { ...i, installation_status: newStatus as Installation['installation_status'], completion_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : i.completion_date } : i))
    } else {
      console.error(error)
    }
  }

  const submitReschedule = async () => {
    if (rescheduleModal.instId && newDate) {
      const inst = installations.find(i => i.id === rescheduleModal.instId)
      
      const { error } = await (supabase.from('installation_tracking') as any).update({ scheduled_date: newDate, installation_status: 'scheduled' }).eq('id', rescheduleModal.instId)

      if (!error) {
        if (inst) {
          addActivity('reschedule', 'installation', inst.order_number, `Rescheduled installation for ${inst.customer_name} to ${newDate}`)
        }
        setInstallations(prev => prev.map(i => i.id === rescheduleModal.instId ? { ...i, scheduled_date: newDate, installation_status: 'scheduled' } : i))
      } else {
        console.error(error)
      }
    }
    setRescheduleModal({ isOpen: false, instId: null })
    setNewDate('')
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const downloadCompletedInstallations = () => {
    const completed = installations.filter(i => i.installation_status === 'completed')
    if (completed.length === 0) return
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Completed Installations Report</title>
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
      <h1>Shrine Solar — Completed Installations Report</h1>
      <p class="subtitle">Generated on ${today} &bull; ${completed.length} record(s)</p>
      <table>
        <tr><th>Order #</th><th>Customer</th><th>Scheduled Date</th><th>Completion Date</th></tr>
        ${completed.map(i => `<tr><td>${i.order_number}</td><td>${i.customer_name}</td><td>${i.scheduled_date}</td><td>${i.completion_date || ''}</td></tr>`).join('')}
      </table>
      <p class="footer">This report was automatically generated by Shrine Solar Admin.</p>
      </body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `completed_installations_${new Date().toISOString().split('T')[0]}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Installations</h2>
          <p className="text-sm text-slate-500 mt-1">Track installation pipeline.</p>
        </div>
        <Button variant="secondary" onClick={downloadCompletedInstallations} className="shrink-0">
          <Download className="h-4 w-4 mr-2" />
          Download Completed
        </Button>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {pipelineConfig.map(p => (
          <Card key={p.key} className={cn('hover:border-slate-300 transition-colors cursor-pointer', statusFilter === p.key ? 'border-amber-500 bg-amber-50' : 'bg-white')} onClick={() => { setStatusFilter(statusFilter === p.key ? 'all' : p.key); setPage(1) }}>
            <CardContent className="p-4 text-center">
              <div className={cn('flex items-center justify-center mx-auto mb-2')}>
                <p.icon className={cn('h-6 w-6', p.color)} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{counts[p.key] || 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{p.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize', statusFilter === s ? 'border-amber-500/30 bg-amber-50 text-amber-600' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300')}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="h-9 w-full rounded-lg bg-white border border-slate-300 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors" placeholder="Search by order # or customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order #</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Schedule</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</th>
                  {canEditRecords && <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-500">Loading installations...</td></tr>
                ) : paged.length > 0 ? (
                  paged.map(inst => (
                    <tr key={inst.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-amber-600 font-medium">{inst.order_number}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{inst.customer_name}</td>
                      <td className="py-3 px-4"><StatusBadge status={inst.installation_status} /></td>
                      <td className="py-3 px-4 text-slate-600">{fmtDate(inst.scheduled_date)}</td>
                      <td className="py-3 px-4 text-slate-500">{fmtDate(inst.completion_date)}</td>
                      {canEditRecords && (
                        <td className="py-3 px-4 text-right">
                          {inst.installation_status === 'completed' ? (
                            <span className="inline-block h-7 px-3 py-1 rounded text-xs font-medium capitalize bg-emerald-50 text-emerald-600">
                              Completed
                            </span>
                          ) : (
                            <select value={inst.installation_status} onChange={(e) => handleStatusChange(inst.id, e.target.value)} className="h-7 rounded bg-white border border-slate-300 px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors capitalize">
                              {inst.installation_status === 'scheduled' && <option value="scheduled" hidden>Scheduled</option>}
                              {inst.installation_status === 'site_survey' && <option value="site_survey" hidden>Site Survey</option>}
                              {inst.installation_status === 'in_progress' && <option value="in_progress" hidden>In Progress</option>}
                              {inst.installation_status === 'on_hold' && <option value="on_hold" hidden>On Hold</option>}
                              <option value="reschedule">Reschedule</option>
                              <option value="site_survey">Site Survey</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="on_hold">On Hold</option>
                            </select>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-500"><Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />No installations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}</p>
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

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-[slideIn_0.2s_ease]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Reschedule Installation</h3>
              <button onClick={() => setRescheduleModal({ isOpen: false, instId: null })} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Date</label>
                <input 
                  type="date" 
                  value={newDate} 
                  onChange={e => setNewDate(e.target.value)} 
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setRescheduleModal({ isOpen: false, instId: null })}>Cancel</Button>
              <Button onClick={submitReschedule} disabled={!newDate}>Confirm Reschedule</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
