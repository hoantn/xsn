"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  History,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CalendarIcon,
  Search,
  Filter,
  Settings,
  Loader2,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog" // Added for adjustment modal

interface Transaction {
  id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string
  status: string
  created_at: string
  user: {
    id: string
    username: string
    full_name: string | null
  }
  created_by_user?: {
    id: string
    username: string
    full_name: string | null
  }
  metadata?: any
}

interface AdminTransactionSummary {
  total_transactions: number
  total_deposits: number
  total_purchases: number
  total_adjustments: number
  total_refunds: number
  total_volume: number // Changed from total_balance_impact to total_volume for consistency
}

interface AdminTransactionStatsProps {
  token: string
}

export default function AdminTransactionStats({ token }: AdminTransactionStatsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<AdminTransactionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null) // Added success state
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [userIdFilter, setUserIdFilter] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit, setLimit] = useState(10)
  const [stats, setStats] = useState<AdminTransactionSummary | null>(null)

  // Adjustment modal states
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [adjustmentForm, setAdjustmentForm] = useState({
    userId: "",
    amount: "",
    description: "",
    type: "admin_adjustment",
  })
  const [adjustmentLoading, setAdjustmentLoading] = useState(false)

  const fetchTransactions = useCallback(
    async (page = 1, currentLimit = 10, type = "all", status = "all", userId = "", startDt?: Date, endDt?: Date) => {
      if (!token) {
        setError("Token không hợp lệ. Vui lòng đăng nhập lại.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      console.log(
        `[AdminTransactionStats] Fetching: page=${page}, limit=${currentLimit}, type=${type}, status=${status}, userId=${userId}, startDate=${startDt}, endDate=${endDt}`,
      )

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: currentLimit.toString(),
        })

        if (type !== "all") params.append("type", type)
        if (status !== "all") params.append("status", status)
        if (userId) params.append("userId", userId)
        if (startDt) params.append("startDate", startDt.toISOString())
        if (endDt) params.append("endDate", endDt.toISOString())

        const response = await fetch(`/api/admin/transactions?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `Lỗi ${response.status}` }))
          throw new Error(errorData.error || `Lỗi ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[AdminTransactionStats] Data received:", data)

        if (!data.success) {
          throw new Error(data.error || "Không thể tải dữ liệu giao dịch")
        }

        setTransactions(data.data || [])
        setStats(data.stats)
        setTotalPages(data.pagination?.totalPages || 1)
        setCurrentPage(data.pagination?.page || 1)
        setLimit(data.pagination?.limit || 10)
      } catch (err) {
        console.error("[AdminTransactionStats] Fetch error:", err)
        setError(err instanceof Error ? err.message : "Lỗi không xác định")
        setTransactions([])
        setStats(null) // Clear stats on error
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    fetchTransactions(currentPage, limit, typeFilter, statusFilter, userIdFilter, startDate, endDate)
  }, [currentPage, limit, typeFilter, statusFilter, userIdFilter, startDate, endDate, fetchTransactions])

  const handleRefresh = () => {
    fetchTransactions(currentPage, limit, typeFilter, statusFilter, userIdFilter, startDate, endDate)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage)
    }
  }

  const handleLimitChange = (newLimit: string) => {
    const parsedLimit = Number.parseInt(newLimit)
    setLimit(parsedLimit)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setTypeFilter("all")
    setStatusFilter("all")
    setUserIdFilter("")
    setStartDate(undefined)
    setEndDate(undefined)
    setCurrentPage(1)
  }

  const handleAdjustment = async () => {
    if (!adjustmentForm.userId || !adjustmentForm.amount || !adjustmentForm.description) {
      setError("Vui lòng điền đầy đủ thông tin")
      return
    }

    setAdjustmentLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/transactions/adjustment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adjustmentForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Không thể tạo giao dịch điều chỉnh")
      }

      setSuccess(data.message)
      setShowAdjustmentModal(false)
      setAdjustmentForm({
        userId: "",
        amount: "",
        description: "",
        type: "admin_adjustment",
      })

      // Refresh transactions
      fetchTransactions(currentPage, limit, typeFilter, statusFilter, userIdFilter, startDate, endDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định")
    } finally {
      setAdjustmentLoading(false)
    }
  }

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <TrendingUp className="w-5 h-5 text-green-600" />
    } else if (amount < 0) {
      return <TrendingDown className="w-5 h-5 text-red-600" />
    }
    return <DollarSign className="w-5 h-5 text-gray-600" />
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      deposit: "Nạp tiền",
      proxy_purchase: "Mua proxy",
      admin_adjustment: "Điều chỉnh",
      refund: "Hoàn tiền",
      initial_balance: "Số dư ban đầu",
    }
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getStatusBadge = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }
    const statusLabels: { [key: string]: string } = {
      completed: "Hoàn thành",
      pending: "Đang xử lý",
      failed: "Thất bại",
      cancelled: "Đã hủy",
    }
    return (
      <Badge className={statusClasses[status] || "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}>
        {statusLabels[status] || status}
      </Badge>
    )
  }

  const formatAmount = (transaction: Transaction) => {
    const absAmount = Math.abs(transaction.amount)
    let sign = ""
    let colorClass = ""

    if (transaction.type === "refund") {
      sign = "+" // Refunds are typically positive for the user
      colorClass = "text-yellow-600" // Yellow for refunds
    } else if (transaction.amount > 0) {
      sign = "+"
      colorClass = "text-green-600" // Green for positive
    } else if (transaction.amount < 0) {
      sign = "-"
      colorClass = "text-red-600" // Red for negative
    } else {
      // For zero-impact transactions (e.g., some admin adjustments that don't change balance)
      sign = ""
      colorClass = "text-gray-700" // Black/gray for no change
    }

    return (
      <span className={`font-semibold ${colorClass}`}>
        {sign}
        {absAmount.toLocaleString("vi-VN")} VNĐ
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch (e) {
      return dateString
    }
  }

  const getBorderClass = (transaction: Transaction) => {
    if (transaction.type === "refund") {
      return "border-l-4 border-yellow-500"
    }
    if (transaction.amount > 0) {
      return "border-l-4 border-green-500"
    }
    if (transaction.amount < 0) {
      return "border-l-4 border-red-500"
    }
    return "border-l-4 border-gray-400" // Default for other types or zero amount
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng giao dịch</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_transactions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng nạp</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{stats.total_deposits.toLocaleString("vi-VN")} VNĐ
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng chi tiêu</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{stats.total_purchases.toLocaleString("vi-VN")} VNĐ
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Điều chỉnh</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_adjustments > 0 ? "+" : ""}
                {stats.total_adjustments.toLocaleString("vi-VN")} VNĐ
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng hoàn tiền</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">+{stats.total_refunds.toLocaleString("vi-VN")} VNĐ</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <History className="w-6 h-6" />
              Quản lý giao dịch
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Làm mới
              </Button>
              <Button onClick={handleClearFilters} variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Xóa bộ lọc
              </Button>
              <Dialog open={showAdjustmentModal} onOpenChange={setShowAdjustmentModal}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Điều chỉnh số dư
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Điều chỉnh số dư người dùng</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="userId">User ID</Label>
                      <Input
                        id="userId"
                        value={adjustmentForm.userId}
                        onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, userId: e.target.value }))}
                        placeholder="Nhập User ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Số tiền (VNĐ)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={adjustmentForm.amount}
                        onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Số dương để cộng, số âm để trừ"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Mô tả</Label>
                      <Input
                        id="description"
                        value={adjustmentForm.description}
                        onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Lý do điều chỉnh"
                      />
                    </div>
                    <Button onClick={handleAdjustment} disabled={adjustmentLoading} className="w-full">
                      {adjustmentLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Settings className="w-4 h-4 mr-2" />
                      )}
                      Thực hiện điều chỉnh
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="user-id-filter" className="sr-only">
                Lọc theo User ID
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-id-filter"
                  placeholder="Lọc theo User ID"
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type-filter" className="sr-only">
                Lọc theo loại
              </Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger id="type-filter" className="w-full">
                  <SelectValue placeholder="Loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="deposit">Nạp tiền</SelectItem>
                  <SelectItem value="proxy_purchase">Mua proxy</SelectItem>
                  <SelectItem value="admin_adjustment">Điều chỉnh</SelectItem>
                  <SelectItem value="refund">Hoàn tiền</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter" className="sr-only">
                Lọc theo trạng thái
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger id="status-filter" className="w-full">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="pending">Đang xử lý</SelectItem>
                  <SelectItem value="failed">Thất bại</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit-select" className="sr-only">
                Số mục mỗi trang
              </Label>
              <Select value={limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger id="limit-select" className="w-full">
                  <SelectValue placeholder="Mục/trang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / trang</SelectItem>
                  <SelectItem value="20">20 / trang</SelectItem>
                  <SelectItem value="50">50 / trang</SelectItem>
                  <SelectItem value="100">100 / trang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-full flex flex-col sm:flex-row gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Từ ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={2023}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Đến ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={2023}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-600">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              Đang tải dữ liệu...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Không tìm thấy giao dịch</h3>
              <p className="text-gray-500">Không có giao dịch nào phù hợp với bộ lọc của bạn.</p>
              <Button onClick={handleClearFilters} variant="outline" className="mt-4">
                Xóa bộ lọc và thử lại
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Người dùng</TableHead>
                      <TableHead className="w-[150px]">Loại</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="text-right w-[150px]">Số tiền</TableHead>
                      <TableHead className="text-right w-[150px]">Số dư sau</TableHead>
                      <TableHead className="w-[120px]">Trạng thái</TableHead>
                      <TableHead className="w-[100px]">Người tạo</TableHead>
                      <TableHead className="w-[180px]">Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} className={getBorderClass(transaction)}>
                        <TableCell className="font-medium">
                          {/* Display username and full_name */}
                          <div>
                            <p className="font-medium">{transaction.user?.username}</p>
                            {transaction.user?.full_name && (
                              <p className="text-sm text-gray-600">{transaction.user.full_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.type, transaction.amount)}
                            <span className="font-medium">{getTransactionTypeLabel(transaction.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={transaction.description}>
                            {transaction.description || "Không có mô tả"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(transaction)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {transaction.balance_after.toLocaleString("vi-VN")} VNĐ
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {transaction.created_by_user ? (
                            <span className="text-sm">{transaction.created_by_user.username}</span>
                          ) : (
                            <span className="text-sm text-gray-500">Hệ thống</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{formatDate(transaction.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Trang {currentPage} / {totalPages} (Tổng: {summary?.total_transactions || 0} giao dịch)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                      variant="outline"
                      size="sm"
                    >
                      Trước
                    </Button>
                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                      variant="outline"
                      size="sm"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
