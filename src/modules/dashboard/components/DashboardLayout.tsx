import { type ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { LogOut, Menu } from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="md:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-emerald-500">menulife</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
