"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { trpc } from "@/utils/trpc"

const ALLOWED_EMAIL = "isabelaururahy@live.com"

export default function ReceitasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { data, isLoading } = useQuery(trpc.me.queryOptions())
  
  const userEmail = data?.user?.email
  const hasAccess = userEmail === ALLOWED_EMAIL
  
  useEffect(() => {
    if (!isLoading && !hasAccess) {
      router.replace("/dashboard")
    }
  }, [isLoading, hasAccess, router])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }
  
  if (!hasAccess) {
    return null
  }
  
  return <>{children}</>
}
