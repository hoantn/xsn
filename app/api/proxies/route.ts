import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    // Đảm bảo supabase client được khởi tạo đúng cách
    if (!supabase) {
      console.error("Supabase client is not initialized.")
      return NextResponse.json(
        {
          success: false,
          error: "Lỗi cấu hình cơ sở dữ liệu",
          details: "Supabase client không được khởi tạo.",
        },
        { status: 500 },
      )
    }

    let query = supabase.from("proxies").select("*", { count: "exact" }).eq("is_active", true).is("user_id", null)

    // Filters
    if (type) {
      query = query.eq("type", type)
    }

    if (search) {
      query = query.or(`server.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: proxies, error, count } = await query.order("created_at", { ascending: false }).range(from, to)

    if (error) {
      console.error("Supabase query error in /api/proxies:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Lỗi truy vấn cơ sở dữ liệu",
          details: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: proxies || [], // Đổi `proxies` thành `data`
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      total: count || 0, // Thêm total ở đây để tương thích với hook
    })
  } catch (error) {
    // Bắt mọi lỗi không mong muốn và đảm bảo trả về JSON
    console.error("Unhandled error in /api/proxies GET:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi máy chủ nội bộ",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
