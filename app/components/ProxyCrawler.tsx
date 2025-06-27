"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Globe,
  Zap,
  ExternalLink,
  Database,
  Shield,
} from "lucide-react"
import { useAuth } from "./AuthProvider"

interface CrawlResult {
  success: boolean
  message: string
  proxies: any[]
  total?: number
  valid?: number
}

export default function ProxyCrawler({ onProxiesFound }: { onProxiesFound?: (proxies: any[]) => void }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CrawlResult | null>(null)
  const [customUrl, setCustomUrl] = useState("")
  const [customText, setCustomText] = useState("")
  const [foundProxies, setFoundProxies] = useState<any[]>([])

  // Proxy type selection
  const [enabledTypes, setEnabledTypes] = useState<string[]>(["mtproto", "socks5"])

  const defaultSources = [
    {
      name: "MTProto.xyz - MTProto API",
      url: "https://mtpro.xyz/api/?type=mtproto",
      description: "API MTProto proxy từ mtpro.xyz (chỉ IP address)",
      icon: <Zap className="w-4 h-4" />,
      type: "MTProto",
      key: "mtproto",
    },
    {
      name: "MTProto.xyz - SOCKS5 API",
      url: "https://mtpro.xyz/api/?type=socks",
      description: "API SOCKS5 proxy từ mtpro.xyz (IP address)",
      icon: <Globe className="w-4 h-4" />,
      type: "SOCKS5",
      key: "socks5",
    },
  ]

  const handleTypeToggle = (type: string, checked: boolean) => {
    if (checked) {
      setEnabledTypes((prev) => [...prev, type])
    } else {
      setEnabledTypes((prev) => prev.filter((t) => t !== type))
    }
  }

  const handleCrawlAll = async () => {
    if (enabledTypes.length === 0) {
      setResult({
        success: false,
        message: "❌ Vui lòng chọn ít nhất một loại proxy để crawl.",
        proxies: [],
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      console.log("🚀 Starting selective MTProto.xyz API crawl...")

      const response = await fetch("/api/proxy/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          validateBeforeAdd: true,
          enabledTypes: enabledTypes,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success && data.proxies && data.proxies.length > 0) {
        setFoundProxies(data.proxies)
        onProxiesFound?.(data.proxies)
      } else if (data.success && (!data.proxies || data.proxies.length === 0)) {
        setResult({
          success: false,
          message: "❌ Không tìm thấy proxy nào từ API với các loại đã chọn. Vui lòng thử lại sau.",
          proxies: [],
        })
      }
    } catch (error) {
      console.error("Crawl error:", error)
      setResult({
        success: false,
        message: "Lỗi kết nối: " + (error instanceof Error ? error.message : "Unknown error"),
        proxies: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCrawlCustomUrl = async () => {
    if (!customUrl.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/proxy/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: [{ url: customUrl, name: "Custom URL" }],
          validateBeforeAdd: true,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success && data.proxies && data.proxies.length > 0) {
        setFoundProxies(data.proxies)
        onProxiesFound?.(data.proxies)
      }
    } catch (error) {
      console.error("Custom crawl error:", error)
      setResult({
        success: false,
        message: "Lỗi khi crawl từ URL: " + (error instanceof Error ? error.message : "Unknown error"),
        proxies: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleParseText = async () => {
    if (!customText.trim()) return

    setLoading(true)
    setResult(null)

    try {
      // Parse text locally using the crawler
      const response = await fetch("/api/proxy/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: customText }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success && data.proxies.length > 0) {
        setFoundProxies(data.proxies)
        onProxiesFound?.(data.proxies)
      }
    } catch (error) {
      console.error("Parse text error:", error)
      setResult({
        success: false,
        message: "Lỗi khi parse text: " + (error instanceof Error ? error.message : "Unknown error"),
        proxies: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddToDatabase = async () => {
    if (foundProxies.length === 0) return

    setLoading(true)

    try {
      const response = await fetch("/api/proxy/crawl", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxies: foundProxies,
          userId: user?.id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          message: `✅ ${data.message}`,
          proxies: [],
        })
        setFoundProxies([])
      } else {
        setResult({
          success: false,
          message: "❌ " + data.error,
          proxies: [],
        })
      }
    } catch (error) {
      console.error("Add to database error:", error)
      setResult({
        success: false,
        message: "Lỗi khi thêm vào database: " + (error instanceof Error ? error.message : "Unknown error"),
        proxies: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLoadDemoProxies = async () => {
    // Import crawler để lấy demo data
    const { proxyCrawler } = await import("@/lib/proxy-crawler")
    const demoProxies = proxyCrawler.generateDemoProxies()

    setFoundProxies(demoProxies)
    setResult({
      success: true,
      message: `Loaded ${demoProxies.length} demo proxies (chỉ để test UI, không từ API)`,
      proxies: demoProxies,
      total: demoProxies.length,
      valid: demoProxies.length,
    })
  }

  return (
    <Card>
      {/* API Info */}
      <Alert className="mb-4 bg-blue-50 border-blue-200">
        <AlertDescription className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>
            <strong>MTProto IP-Only:</strong> Chỉ crawl MTProto proxy có IP address (không hostname). SOCKS5 chấp nhận
            cả IP và hostname.
            <a
              href="https://mtpro.xyz/api-overview"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              Xem API docs <ExternalLink className="w-3 h-3" />
            </a>
          </span>
        </AlertDescription>
      </Alert>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Selective API Crawler (IP-Only MTProto)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api">Selective API</TabsTrigger>
            <TabsTrigger value="custom">Custom URL</TabsTrigger>
            <TabsTrigger value="text">Parse Text</TabsTrigger>
            <TabsTrigger value="demo">Demo (UI Test)</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">Chọn loại proxy cần crawl:</h3>
                <div className="grid gap-3">
                  {defaultSources.map((source, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Checkbox
                        id={source.key}
                        checked={enabledTypes.includes(source.key)}
                        onCheckedChange={(checked) => handleTypeToggle(source.key, checked as boolean)}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {source.icon}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{source.name}</div>
                          <div className="text-xs text-gray-500">{source.description}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {source.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-700">
                  ✅ MTProto: CHỈ IP address (hostname bị từ chối). SOCKS5: IP + hostname đều được chấp nhận.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleCrawlAll}
                disabled={loading || enabledTypes.length === 0}
                className="w-full bg-[#229ED9] hover:bg-[#1a7db8]"
              >
                {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {loading
                  ? "Đang crawl từ API..."
                  : `Crawl ${enabledTypes.length > 0 ? enabledTypes.map((t) => t.toUpperCase()).join(" + ") : "Proxy"} từ API`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom-url">URL nguồn proxy:</Label>
                <Input
                  id="custom-url"
                  placeholder="https://mtpro.xyz/api/?type=mtproto hoặc https://mtpro.xyz/api/?type=socks"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Nhập URL API hoặc danh sách proxy thực</p>
              </div>

              <Button onClick={handleCrawlCustomUrl} disabled={loading || !customUrl.trim()} className="w-full">
                {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                <Search className="w-4 h-4 mr-2" />
                Crawl từ URL
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom-text">Text chứa proxy:</Label>
                <Textarea
                  id="custom-text"
                  placeholder={`Dán text chứa proxy thực, ví dụ:
tg://proxy?server=1.2.3.4&port=443&secret=abcd1234...
hoặc JSON từ API:
{"host":"1.2.3.4","port":443,"secret":"ee...","country":"FI"}
hoặc
{"ip":"1.1.1.1","port":1080,"country":"US"}

Lưu ý: MTProto chỉ chấp nhận IP address!`}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={8}
                />
              </div>

              <Button onClick={handleParseText} disabled={loading || !customText.trim()} className="w-full">
                {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Parse Real Proxy từ Text
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="demo" className="space-y-4">
            <div className="space-y-4">
              <Alert className="bg-orange-50 border-orange-200">
                <AlertDescription className="text-orange-700">
                  ⚠️ <strong>Chỉ để test UI:</strong> Demo data này KHÔNG được sử dụng trong crawl thực. Chỉ dùng để test
                  giao diện.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h3 className="font-medium">Demo Data (UI Test Only):</h3>
                <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs space-y-1">
                  <div className="text-blue-600">MTProto: 149.154.175.50:443:ee1b1a9c... (IP only)</div>
                  <div className="text-green-600">SOCKS5: 1.1.1.1:1080 (IP)</div>
                </div>
              </div>

              <Button
                onClick={handleLoadDemoProxies}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Load Demo Data (UI Test Only)
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Results */}
        {result && (
          <Alert className={`mt-4 ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <AlertDescription className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{result.message}</span>
              {result.total && result.valid && (
                <Badge variant="outline" className="ml-2">
                  {result.valid}/{result.total} hợp lệ
                </Badge>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Found Proxies */}
        {foundProxies.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Proxy tìm thấy ({foundProxies.length}):</h3>
              <Button
                onClick={handleAddToDatabase}
                disabled={loading}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                <Plus className="w-4 h-4 mr-2" />
                Thêm vào Database
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {foundProxies.slice(0, 10).map((proxy, index) => (
                <div key={index} className="p-3 border-b last:border-b-0 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-mono">
                      {proxy.server}:{proxy.port}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {proxy.type?.toUpperCase() || "Unknown"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${proxy.source === "Demo Data" ? "bg-orange-100 text-orange-700" : ""}`}
                      >
                        {proxy.source}
                      </Badge>
                      {proxy.type === "mtproto" && (
                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                          IP-Only
                        </Badge>
                      )}
                    </div>
                  </div>
                  {proxy.secret && (
                    <div className="text-xs text-gray-500 mt-1">Secret: {proxy.secret?.substring(0, 16)}...</div>
                  )}
                  <div className="text-xs text-gray-600 mt-1">{proxy.description}</div>
                </div>
              ))}
              {foundProxies.length > 10 && (
                <div className="p-3 text-center text-sm text-gray-500">
                  ... và {foundProxies.length - 10} proxy khác
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
