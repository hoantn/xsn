import { NextResponse } from "next/server"
import { proxyCrawler } from "@/lib/proxy-crawler"

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Text không hợp lệ",
          proxies: [],
        },
        { status: 400 },
      )
    }

    console.log("📝 Parsing text for proxies...")

    const proxies = await proxyCrawler.crawlFromText(text, "Text Input")

    // Validate proxies
    const validProxies = []
    for (const proxy of proxies) {
      const isValid = await proxyCrawler.validateProxy(proxy)
      if (isValid) {
        validProxies.push(proxy)
      }
    }

    console.log(`✅ Found ${validProxies.length}/${proxies.length} valid proxies from text`)

    return NextResponse.json({
      success: true,
      message: `Tìm thấy ${validProxies.length} proxy hợp lệ từ text`,
      proxies: validProxies,
      total: proxies.length,
      valid: validProxies.length,
    })
  } catch (error) {
    console.error("Parse text error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi khi parse text: " + (error instanceof Error ? error.message : "Unknown error"),
        proxies: [],
      },
      { status: 500 },
    )
  }
}
