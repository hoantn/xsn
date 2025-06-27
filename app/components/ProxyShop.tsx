"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingCart, Check, Clock, Users, Zap, Star, AlertTriangle, CheckCircle } from "lucide-react"
import { StatusModal } from "@/components/StatusModal"

interface ProxyPlan {
  id: string
  name: string
  description: string
  price: number
  duration_days: number
  max_connections: number
  proxy_type: string
  is_active: boolean
}

interface PurchaseResult {
  success: boolean
  message: string
  data?: {
    order_id: string
    proxy_id: string
    expires_at: string
    proxy_type: string
    max_users: number
    proxy_url?: string
    proxy_server?: string
    proxy_port?: number
    plan_name: string
  }
}

export default function ProxyShop() {
  const [plans, setPlans] = useState<ProxyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalContent, setModalContent] = useState<{
    title: string
    message: string
    type: "success" | "error" | "info"
    details?: { label: string; value: string | number }[]
  } | null>(null)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/proxy-plans")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        setPlans(data.filter((plan) => plan.is_active))
      } else {
        throw new Error("Dữ liệu không hợp lệ từ server")
      }
    } catch (error) {
      console.error("Error fetching plans:", error)
      setError(error instanceof Error ? error.message : "Lỗi không xác định khi tải gói proxy")
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId)
    setError(null)

    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        throw new Error("Vui lòng đăng nhập để mua proxy")
      }

      const response = await fetch("/api/proxy-plans/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: planId }),
      })

      const result: PurchaseResult = await response.json()

      if (result.success && result.data) {
        const details = [
          { label: "Gói đã mua", value: result.data.plan_name },
          { label: "Loại Proxy", value: result.data.proxy_type.toUpperCase() },
          { label: "Số kết nối", value: result.data.max_users === 999 ? "Không giới hạn" : result.data.max_users },
          {
            label: "Ngày hết hạn",
            value: new Date(result.data.expires_at).toLocaleString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          { label: "Mã đơn hàng", value: result.data.order_id.substring(0, 8) + "..." },
        ]

        if (result.data.proxy_server && result.data.proxy_port) {
          details.push({ label: "Server", value: `${result.data.proxy_server}:${result.data.proxy_port}` })
        }

        setModalContent({
          title: "🎉 Mua Proxy Thành Công!",
          message:
            "Proxy của bạn đã được kích hoạt và sẵn sàng sử dụng. Vui lòng kiểm tra tab 'Proxy của tôi' để xem chi tiết và hướng dẫn sử dụng.",
          type: "success",
          details: details,
        })
        setIsModalOpen(true)

        // Reload trang sau 3 giây để cập nhật số dư
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      } else {
        setModalContent({
          title: "❌ Mua Proxy Thất Bại!",
          message: result.message || "Đã xảy ra lỗi không xác định khi mua proxy.",
          type: "error",
        })
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error purchasing:", error)
      const errorMessage = error instanceof Error ? error.message : "Không thể kết nối đến máy chủ"

      setModalContent({
        title: "🔌 Lỗi Kết Nối!",
        message: `${errorMessage}. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.`,
        type: "error",
      })
      setIsModalOpen(true)
    } finally {
      setPurchasing(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

  const getPlanIcon = (planName: string) => {
    if (planName.includes("Premium") || planName.includes("6 Tháng"))
      return <Star className="w-5 h-5 text-yellow-500" />
    if (planName.includes("Tiêu Chuẩn") || planName.includes("3 Tháng"))
      return <Zap className="w-5 h-5 text-blue-500" />
    return <CheckCircle className="w-5 h-5 text-green-500" />
  }

  const getPlanBadge = (planName: string) => {
    if (planName.includes("Premium") || planName.includes("6 Tháng")) {
      return <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">Phổ biến nhất</Badge>
    }
    if (planName.includes("3 Tháng")) {
      return <Badge className="bg-blue-500 text-white">Tiết kiệm</Badge>
    }
    return null
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalContent(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải gói proxy...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={fetchPlans} className="ml-2">
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có gói proxy nào</h3>
        <p className="text-gray-500">Hiện tại chưa có gói proxy nào khả dụng. Vui lòng quay lại sau.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">🛒 Cửa Hàng Proxy</h2>
        <p className="text-gray-600">Chọn gói proxy MTProto chất lượng cao phù hợp với nhu cầu của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className="relative hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-200"
          >
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getPlanIcon(plan.name)}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
              </div>

              {getPlanBadge(plan.name)}

              <div className="text-center mt-4">
                <span className="text-4xl font-bold text-blue-600">{formatPrice(plan.price)}</span>
                <div className="text-sm text-gray-500 mt-1">
                  {plan.duration_days} ngày • {Math.round(plan.price / plan.duration_days).toLocaleString("vi-VN")}{" "}
                  VNĐ/ngày
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center text-sm">{plan.description}</p>

              <div className="space-y-3">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-sm">
                    Thời hạn: <strong>{plan.duration_days} ngày</strong>
                  </span>
                </div>

                <div className="flex items-center">
                  <Users className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-sm">
                    Kết nối:{" "}
                    <strong>
                      {plan.max_connections === 999 ? "Không giới hạn" : `${plan.max_connections} thiết bị`}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-sm">Proxy MTProto chất lượng cao</span>
                </div>

                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-sm">Tốc độ ổn định, độ trễ thấp</span>
                </div>

                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-sm">Hỗ trợ 24/7</span>
                </div>

                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-sm">Kích hoạt ngay lập tức</span>
                </div>
              </div>

              <Button
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3"
                onClick={() => handlePurchase(plan.id)}
                disabled={purchasing === plan.id}
                size="lg"
              >
                {purchasing === plan.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Mua Ngay
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {modalContent && (
        <StatusModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={modalContent.title}
          message={modalContent.message}
          type={modalContent.type}
          details={modalContent.details}
        />
      )}
    </div>
  )
}
