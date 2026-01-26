import { Sidebar } from "@/components/sidebar"
import { FormulariosPendentesAlert } from "@/components/formularios/FormulariosPendentesAlert"

// Desabilita prerendering para todas as páginas do dashboard
// Necessário porque os componentes @base-ui não suportam serialização de handlers durante SSG
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          <FormulariosPendentesAlert />
          {children}
        </div>
      </main>
    </div>
  )
}
