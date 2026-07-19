import { useState, useEffect } from 'react'
import { Menu, Bell, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'order' | 'delivery' | 'system'
}

const initialNotifications: Notification[] = []

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)

  useEffect(() => {
    const fetchRecentOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, customers(first_name, last_name)')
        .order('order_date', { ascending: false })
        .limit(10)
        
      if (data) {
        const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]')
        const notifs = data.map((d: any) => ({
          id: d.id,
          title: 'New Order Received',
          message: `Order #${d.order_number} from ${d.customers ? d.customers.first_name + ' ' + d.customers.last_name : 'Unknown'}`,
          time: new Date(d.order_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
          read: readIds.includes(d.id),
          type: 'order' as const
        }))
        setNotifications(notifs)
      }
    }
    
    fetchRecentOrders()

    const subscription = supabase
      .channel('orders_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const fetchDetails = async () => {
           const { data } = await supabase.from('orders').select('*, customers(first_name, last_name)').eq('id', payload.new.id).single()
           if (data) {
             const d = data as any;
             const newNotif = {
                id: d.id,
                title: 'New Order Received',
                message: `Order #${d.order_number} from ${d.customers ? d.customers.first_name + ' ' + d.customers.last_name : 'Unknown'}`,
                time: new Date(d.order_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                read: false,
                type: 'order' as const
             }
             setNotifications(prev => {
                if (prev.some(n => n.id === newNotif.id)) return prev;
                return [newNotif, ...prev];
             })
           }
        }
        fetchDetails()
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]')
    if (!readIds.includes(id)) {
      localStorage.setItem('read_notifications', JSON.stringify([...readIds, id]))
    }
  }
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    const allIds = notifications.map(n => n.id)
    const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]')
    const combined = Array.from(new Set([...readIds, ...allIds]))
    localStorage.setItem('read_notifications', JSON.stringify(combined))
  }


  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-400 hover:text-white lg:hidden hover-glow"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-slate-800 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">

          <div className="relative">
            <button 
              type="button" 
              onClick={() => setShowNotifs(!showNotifs)}
              className={`-m-2.5 p-2.5 transition-colors relative hover-glow ${showNotifs ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
              )}
            </button>
            
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl glass-card border border-white/5 shadow-2xl z-50 overflow-hidden animate-[fadeIn_0.15s_ease]">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                    <h3 className="font-semibold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs font-medium text-amber-600 hover:text-amber-500 transition-colors">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">No notifications</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {notifications.map(n => (
                          <div key={n.id} className={`p-4 transition-colors hover:bg-slate-800/50 ${!n.read ? 'bg-amber-900/10' : ''}`}>
                            <div className="flex gap-3">
                              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-transparent'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${!n.read ? 'text-white' : 'text-slate-400'}`}>{n.title}</p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-wider">{n.time}</p>
                              </div>
                              {!n.read && (
                                <button onClick={() => markAsRead(n.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors self-start" title="Mark as read">
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t border-white/5 bg-slate-900/50">
                    <button className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors" onClick={() => setShowNotifs(false)}>
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
