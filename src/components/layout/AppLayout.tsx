import { useState } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden text-slate-900 relative dark:bg-[#0a0e1a] dark:text-slate-200">
      {/* Background decorations for solar feel */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/0 rounded-full blur-[120px] pointer-events-none dark:animate-pulse-glow dark:bg-amber-500/10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/0 rounded-full blur-[120px] pointer-events-none dark:animate-pulse-glow dark:bg-blue-600/10" style={{ animationDelay: '2s' }} />

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
