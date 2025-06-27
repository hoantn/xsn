import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth"

export async function POST(request: NextRequest) {
  console.log("🔍 Proxy crawl POST request received")

  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization")
    console.log("🔐 Auth header:", authHeader ? "Present" : "Missing")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Missing or invalid authorization header")
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log("🔐 Token extracted, length:", token.length)

    // Verify admin token using AuthService
    const user = AuthService.verifySessionToken(token)

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      console.log("❌ Invalid admin token or not admin role:", user?.role)
      return NextResponse.json({ error: "Invalid admin token" }, { status: 401 })
    }

    console.log("👤 Admin user verified:", user.username)

    const body = await request.json()
    console.log("📝 Request body:", body)

    const { proxies } = body

    if (!proxies || !Array.isArray(proxies) || proxies.length === 0) {
      console.log("❌ No proxies provided")
      return NextResponse.json(
        {
          error: "No proxies provided",
          details: "The request must include an array of proxies",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Processing ${proxies.length} proxies...`)

    // Process each proxy
    const results = []
    let addedCount = 0

    for (const proxy of proxies) {
      const {
        server,
        port,
        type,
        secret,
        username,
        password,
        description,
        source,
        visibility = "public",
        max_users = 1,
      } = proxy

      // Validate required fields
      if (!server || !port || !type) {
        console.log(`❌ Skipping proxy with missing required fields: ${JSON.stringify(proxy)}`)
        results.push({
          success: false,
          proxy,
          error: "Missing required fields (server, port, or type)",
        })
        continue
      }

      // Check if proxy already exists
      const { data: existingProxy, error: checkError } = await supabase
        .from("proxies")
        .select("id")
        .eq("server", server)
        .eq("port", port)
        .single()

      if (existingProxy) {
        console.log(`⚠️ Proxy already exists: ${server}:${port}`)
        results.push({
          success: false,
          proxy,
          error: "Proxy already exists",
        })
        continue
      }

      // Insert proxy into database
      try {
        const { data: result, error } = await supabase
          .from("proxies")
          .insert({
            server: server.trim(),
            port: Number.parseInt(port.toString()),
            username: type === "mtproto" ? secret || "" : username || "",
            password: password || "",
            description: description || `${type.toUpperCase()} Proxy`,
            type,
            is_active: true,
            user_id: null, // Admin-added proxies are public
            visibility: visibility || "public",
            source: source || "Crawler",
            max_users: max_users || 1,
            current_users: 0,
          })
          .select()
          .single()

        if (error) {
          console.error(`❌ Failed to insert proxy ${server}:${port}:`, error)
          results.push({
            success: false,
            proxy,
            error: error.message,
          })
        } else {
          console.log(`✅ Added proxy: ${server}:${port}`)
          results.push({
            success: true,
            proxy: result,
          })
          addedCount++
        }
      } catch (err) {
        console.error(`💥 Error processing proxy ${server}:${port}:`, err)
        results.push({
          success: false,
          proxy,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    console.log(`✅ Added ${addedCount} new proxies out of ${proxies.length} processed`)
    return NextResponse.json({
      success: true,
      added: addedCount,
      total: proxies.length,
      results,
    })
  } catch (error) {
    console.error("💥 Unhandled error in proxy crawl:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
