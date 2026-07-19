import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { supabase } from '../lib/supabase'
import { Users, ShoppingCart, Wrench } from 'lucide-react'

export function DashboardPage() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeOrders: 0,
    inProgressInstalls: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [recentInstallations, setRecentInstallations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)

      const [customersRes, ordersRes, installsRes, recentOrdersRes, recentInstallsRes] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending']),
        supabase.from('installation_tracking').select('*', { count: 'exact', head: true }).eq('installation_status', 'in_progress'),
        supabase.from('orders').select('*, customers(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('installation_tracking').select('*, orders(order_number, customers(first_name, last_name))').order('created_at', { ascending: false }).limit(5),
      ])

      setStats({
        totalCustomers: customersRes.count || 0,
        activeOrders: ordersRes.count || 0,
        inProgressInstalls: installsRes.count || 0,
      })

      if (recentOrdersRes.data) setRecentOrders(recentOrdersRes.data)
      if (recentInstallsRes.data) setRecentInstallations(recentInstallsRes.data)

      setIsLoading(false)
    }

    fetchDashboardData()
  }, [])

  const kpis = [
    { name: 'Total Customers', value: stats.totalCustomers.toString(), icon: Users, color: 'text-blue-400' },
    { name: 'Active Orders', value: stats.activeOrders.toString(), icon: ShoppingCart, color: 'text-amber-400' },
    { name: 'In Progress Installs', value: stats.inProgressInstalls.toString(), icon: Wrench, color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-3xl font-bold tracking-tight text-gradient">Dashboard Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Welcome back! Here's what's happening with ShrineSolar today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3">
        {kpis.map((kpi, index) => (
          <Card key={kpi.name} className="relative overflow-hidden group h-32 animate-in fade-in slide-in-from-bottom-4" style={{ animationDuration: `${500 + index * 150}ms` }}>
            <div className="absolute top-2 right-4 opacity-10 group-hover:opacity-30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 text-amber-500">
              <kpi.icon className="h-20 w-20" />
            </div>
            <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-slate-400 group-hover:text-amber-200 transition-colors">{kpi.name}</p>
                <p className="mt-1 text-4xl font-bold text-white group-hover:text-amber-400 transition-colors">
                  {isLoading ? '...' : kpi.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[250px] items-center justify-center text-slate-500">
                <div className="animate-pulse-glow h-8 w-8 rounded-full bg-amber-500" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-lg">
                No orders yet. Create your first order!
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg glass-table-row bg-slate-900/50 border border-white/5">
                    <div>
                      <p className="text-sm font-medium text-white font-mono">{order.order_number}</p>
                      <p className="text-xs text-slate-400">
                        {order.customers ? `${order.customers.first_name} ${order.customers.last_name}` : 'Unknown'}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Installations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[250px] items-center justify-center text-slate-500">
                <div className="animate-pulse-glow h-8 w-8 rounded-full bg-blue-500" />
              </div>
            ) : recentInstallations.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-lg">
                No installations yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentInstallations.map((inst: any) => (
                  <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg glass-table-row bg-slate-900/50 border border-white/5">
                    <div>
                      <p className="text-sm font-medium text-white font-mono">{inst.orders?.order_number || 'N/A'}</p>
                      <p className="text-xs text-slate-400">
                        {inst.orders?.customers ? `${inst.orders.customers.first_name} ${inst.orders.customers.last_name}` : 'Unknown'}
                      </p>
                    </div>
                    <StatusBadge status={inst.installation_status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
