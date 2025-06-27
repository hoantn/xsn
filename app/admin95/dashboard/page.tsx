"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/app/components/AuthProvider"
import { useSupabaseProxies } from "@/app/hooks/useSupabaseProxies"
import { Home, RefreshCw, Server, Database, User, Activity } from "lucide-react"
import Link from "next/link"
import SystemInfo from "@/app/components/SystemInfo"

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth()
  const { proxies, loading, refreshProxies } = useSupabaseProxies()
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const fetchSystemStatus = async () => {
    try {
      setStatusLoading(true)
      const response = await fetch("/api/system/status")
      const data = await response.json()
      setSystemStatus(data)
    } catch (error) {
      console.error("Error fetching system status:", error)
    } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchSystemStatus()
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>Bạn không có quyền truy cập trang này</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSystemStatus} disabled={statusLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${statusLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/admin95">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Quản lý Proxy
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tổng số Proxy</p>
                <p className="text-3xl font-bold">{proxies.length}</p>
              </div>
              <Database className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Proxy hoạt động</p>
                <p className="text-3xl font-bold">{proxies.filter((p) => p.is_active).length}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Trạng thái hệ thống</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <p className="font-medium">Online</p>
                </div>
              </div>
              <Server className="w-8 h-8 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SystemInfo />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Thông tin người dùng
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {user && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">{user.role}</Badge>
                  <span className="font-medium">{user.username}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>User ID: {user.id}</p>
                  <p>Full Name: {user.fullName || user.username}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
