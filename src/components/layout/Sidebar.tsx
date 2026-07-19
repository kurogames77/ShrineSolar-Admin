import { useState } from 'react'
import { NavLink } from 'react-router'
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Wrench, 
  Activity,
  LogOut,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

import { cn } from '../ui/Button'

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { signOut, profile } = useAuth()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Installations', href: '/installations', icon: Wrench },
    { name: 'Activity Log', href: '/activity-log', icon: Activity },
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform flex flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:w-64 dark:bg-[#0a0e1a]/95 dark:backdrop-blur-md dark:border-white/5",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-slate-200 dark:border-white/5 overflow-hidden">
          <div className="flex items-center w-full pr-2">
            <img src="/banner.png" alt="Shrine Solar" className="h-16 w-full object-contain scale-110 origin-left dark-invert" />
          </div>
          <button 
            className="lg:hidden text-slate-500 hover:text-slate-900 shrink-0 transition-colors dark:text-slate-400 dark:hover:text-white dark:hover-glow"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <nav className="flex-1 space-y-1 px-3">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) => cn(
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 relative overflow-hidden",
                    isActive 
                      ? "bg-amber-50 text-amber-600 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-transparent dark:text-amber-400 dark:border-l-2 dark:border-amber-400 dark:shadow-[inset_4px_0_10px_rgba(245,158,11,0.1)]" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200 dark:hover:translate-x-1"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon
                    className={cn("mr-3 h-5 w-5 flex-shrink-0 transition-colors")}
                    aria-hidden="true"
                  />
                  {item.name}
                </NavLink>
              ))}
            </div>


          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 mb-4 px-2 cursor-pointer transition-colors p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover-glow dark:hover:bg-white/5">
            <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden dark:bg-slate-800 dark:border-white/10">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-slate-500 font-medium dark:text-slate-400">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate dark:text-slate-200">
                {profile?.full_name || 'Admin User'}
              </p>
              <p className="text-xs text-amber-600 capitalize truncate">
                {profile?.role?.replace('_', ' ') || 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </button>
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 dark:bg-slate-950/80">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200 dark:glass-card dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] dark:border dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 mb-2 dark:text-white">Sign Out</h3>
            <p className="text-slate-500 mb-6 dark:text-slate-400">Are you sure you want to sign out of your account?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false)
                  signOut()
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
