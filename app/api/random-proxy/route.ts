import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const proxyType = searchParams.get("type") // 'mtproto', 'socks5', or null/undefined

    console.log(`[API] Request for proxy type: ${proxyType}`)

    // Chỉ lấy proxy công khai miễn phí (crawled proxies)
    let query = supabase
      .from("proxies")
      .select("*")
      .eq("is_active", true)
      .is("user_id", null) // Proxy không thuộc tài khoản nào (crawled)
      .eq("visibility", "public") // Chỉ lấy proxy công khai

    if (proxyType && proxyType !== "random") {
      // If a specific type is requested (e.g., 'mtproto', 'socks5')
      query = query.eq("type", proxyType)
      console.log(`[API] Filtering by specific type: ${proxyType}`)
    } else {
      console.log("[API] Selecting random proxy from all public types.")
    }

    const { data: proxies, error } = await query

    if (error) {
      console.error("Lỗi khi truy vấn proxy công khai:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Không thể lấy danh sách proxy công khai",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log(`[API] Found ${proxies?.length || 0} proxies matching criteria.`)
    if (proxies && proxies.length > 0) {
      console.log("[API] Sample proxy data:", proxies[0])
    }

    if (!proxies || proxies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Không tìm thấy proxy ${proxyType || "công khai"} nào đang hoạt động`,
          suggestion: "Hãy chạy crawl để lấy proxy mới từ MTProto.xyz",
        },
        { status: 404 },
      )
    }

    // Chọn ngẫu nhiên một proxy từ danh sách
    const randomIndex = Math.floor(Math.random() * proxies.length)
    const randomProxy = proxies[randomIndex]

    // Cập nhật last_used_at
    await supabase.from("proxies").update({ last_used_at: new Date().toISOString() }).eq("id", randomProxy.id)
    console.log(`[API] Updated last_used_at for proxy ID: ${randomProxy.id}`)

    return NextResponse.json({
      success: true,
      proxy: randomProxy,
      stats: {
        total_public_free: proxies.length,
        proxy_type: randomProxy.type,
        source: "MTProto.xyz API (Public/Free)",
      },
    })
  } catch (err) {
    console.error("Lỗi server:", err)
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi server khi lấy proxy công khai ngẫu nhiên",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
