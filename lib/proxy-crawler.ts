interface ProxySource {
  name: string
  url: string
  type: "mtproto-api" | "socks5-api"
  parser: (content: string) => Promise<CrawledProxy[]>
}

interface CrawledProxy {
  server: string
  port: number
  secret?: string // Optional - chỉ MTProto mới có
  description: string
  source: string
  type: "socks5" | "mtproto"
  // Thêm các field từ API gốc
  country?: string
  ping?: number
  up?: number
  down?: number
  uptime?: number
  addTime?: number
  updateTime?: number
}

// MTProto API Response - chính xác theo API
interface MtProtoApiResponse {
  host: string
  port: number
  secret: string
  country?: string
  up?: number
  down?: number
  uptime?: number
  addTime?: number
  updateTime?: number
  ping?: number
}

// SOCKS5 API Response - chính xác theo API
interface Socks5ApiResponse {
  addTime: number
  ip: string
  port: number
  country?: string
  ping?: number
}

export class ProxyCrawler {
  private sources: ProxySource[] = [
    {
      name: "MTProto.xyz - MTProto",
      url: "https://mtpro.xyz/api/?type=mtproto",
      type: "mtproto-api",
      parser: this.parseMtProtoApi,
    },
    {
      name: "MTProto.xyz - SOCKS5",
      url: "https://mtpro.xyz/api/?type=socks",
      type: "socks5-api",
      parser: this.parseSocks5Api,
    },
  ]

  // Validate MTProto secret cho Telegram
  private isValidMtProtoSecret(secret: string): boolean {
    if (!secret) return false

    // Clean secret - remove any whitespace
    const cleanSecret = secret.trim()

    // MTProto secret phải là hex string, ít nhất 32 ký tự
    const hexPattern = /^[a-fA-F0-9]{32,}$/
    const isValidHex = hexPattern.test(cleanSecret)

    console.log(`🔍 Secret validation: "${cleanSecret}" (length: ${cleanSecret.length}, isHex: ${isValidHex})`)

    return isValidHex
  }

  // Validate IP address (CHỈ IP, KHÔNG domain)
  private isValidIP(ip: string): boolean {
    if (!ip) return false

    const cleanIP = ip.trim()
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/

    if (!ipPattern.test(cleanIP)) {
      return false
    }

    // Kiểm tra từng octet phải từ 0-255
    const octets = cleanIP.split(".")
    for (const octet of octets) {
      const num = Number.parseInt(octet, 10)
      if (num < 0 || num > 255) {
        return false
      }
    }

    console.log(`🔍 IP validation: "${cleanIP}" - Valid IP`)
    return true
  }

  // Validate hostname/IP cho SOCKS5 (cho phép cả IP và domain)
  private isValidHost(host: string): boolean {
    if (!host) return false

    const cleanHost = host.trim()

    // Check if it's a valid IP
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
    const isValidIP = ipPattern.test(cleanHost)

    // Check if it's a valid domain
    const domainPattern =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    const isValidDomain = domainPattern.test(cleanHost)

    console.log(`🔍 Host validation: "${cleanHost}" (isIP: ${isValidIP}, isDomain: ${isValidDomain})`)

    return isValidIP || isValidDomain
  }

  // Parser MTProto - CHỈ CHẤP NHẬN IP ADDRESS
  private async parseMtProtoApi(content: string): Promise<CrawledProxy[]> {
    const proxies: CrawledProxy[] = []

    try {
      console.log("📝 Parsing MTProto API response (IP-only mode)...")

      if (!content || content.trim() === "") {
        console.log("⚠️ MTProto API response empty")
        return []
      }

      let data: MtProtoApiResponse | MtProtoApiResponse[]
      try {
        data = JSON.parse(content)
      } catch (parseError) {
        console.error("❌ MTProto JSON parse error:", parseError)
        console.log("Raw content:", content.substring(0, 200))
        return []
      }

      const mtprotoList: MtProtoApiResponse[] = Array.isArray(data) ? data : [data]
      console.log(`📊 MTProto API returned ${mtprotoList.length} items`)

      for (let i = 0; i < mtprotoList.length; i++) {
        const proxy = mtprotoList[i]
        console.log(`\n🔍 Processing MTProto proxy ${i + 1}:`, {
          host: proxy?.host,
          port: proxy?.port,
          secret: proxy?.secret ? `${proxy.secret.substring(0, 8)}...` : "missing",
          country: proxy?.country,
        })

        // Kiểm tra các field bắt buộc
        if (!proxy || !proxy.host || !proxy.port || !proxy.secret) {
          console.log(`❌ MTProto proxy ${i + 1}: Missing required fields`)
          continue
        }

        // CHỈ CHẤP NHẬN IP ADDRESS - KHÔNG CHẤP NHẬN HOSTNAME
        if (!this.isValidIP(proxy.host)) {
          console.log(`❌ MTProto proxy ${i + 1}: Not an IP address (hostname rejected): ${proxy.host}`)
          continue
        }

        // Validate port
        if (proxy.port < 1 || proxy.port > 65535) {
          console.log(`❌ MTProto proxy ${i + 1}: Invalid port range`)
          continue
        }

        // Validate secret cho Telegram
        if (!this.isValidMtProtoSecret(proxy.secret)) {
          console.log(`❌ MTProto proxy ${i + 1}: Invalid secret format for Telegram`)
          continue
        }

        // Tạo Telegram URL để test
        const telegramUrl = `tg://proxy?server=${proxy.host}&port=${proxy.port}&secret=${proxy.secret.toLowerCase()}`
        console.log(`🔗 Telegram URL: ${telegramUrl}`)

        const proxyData: CrawledProxy = {
          server: proxy.host.trim(),
          port: proxy.port,
          secret: proxy.secret.trim().toLowerCase(), // Normalize to lowercase
          description: `MTProto IP ${proxy.host} from ${proxy.country || "Unknown"} (ping: ${proxy.ping || "N/A"}ms)`,
          source: "MTProto.xyz API",
          type: "mtproto",
          country: proxy.country,
          ping: proxy.ping,
          up: proxy.up,
          down: proxy.down,
          uptime: proxy.uptime,
          addTime: proxy.addTime,
          updateTime: proxy.updateTime,
        }

        proxies.push(proxyData)
        console.log(`✅ MTProto proxy ${i + 1}: Valid IP and added`)
      }

      console.log(`✅ Successfully parsed ${proxies.length}/${mtprotoList.length} MTProto IP proxies`)
      return proxies
    } catch (error) {
      console.error("💥 Error parsing MTProto API:", error)
      return []
    }
  }

  // Parser SOCKS5 - giữ nguyên
  private async parseSocks5Api(content: string): Promise<CrawledProxy[]> {
    const proxies: CrawledProxy[] = []

    try {
      console.log("📝 Parsing SOCKS5 API response...")

      if (!content || content.trim() === "") {
        console.log("⚠️ SOCKS5 API response empty")
        return []
      }

      let data: Socks5ApiResponse | Socks5ApiResponse[]
      try {
        data = JSON.parse(content)
      } catch (parseError) {
        console.error("❌ SOCKS5 JSON parse error:", parseError)
        console.log("Raw content:", content.substring(0, 200))
        return []
      }

      const socks5List: Socks5ApiResponse[] = Array.isArray(data) ? data : [data]
      console.log(`📊 SOCKS5 API returned ${socks5List.length} items`)

      for (let i = 0; i < socks5List.length; i++) {
        const proxy = socks5List[i]
        console.log(`\n🔍 Processing SOCKS5 proxy ${i + 1}:`, {
          ip: proxy?.ip,
          port: proxy?.port,
          country: proxy?.country,
        })

        if (!proxy || !proxy.ip || !proxy.port) {
          console.log(`❌ SOCKS5 proxy ${i + 1}: Missing required fields`)
          continue
        }

        // Validate IP
        if (!this.isValidIP(proxy.ip)) {
          console.log(`❌ SOCKS5 proxy ${i + 1}: Invalid IP format`)
          continue
        }

        // Validate port
        if (proxy.port < 1 || proxy.port > 65535) {
          console.log(`❌ SOCKS5 proxy ${i + 1}: Invalid port range`)
          continue
        }

        const proxyData: CrawledProxy = {
          server: proxy.ip.trim(),
          port: proxy.port,
          secret: undefined, // SOCKS5 không có secret
          description: `SOCKS5 IP ${proxy.ip} from ${proxy.country || "Unknown"} (ping: ${proxy.ping || "N/A"}ms)`,
          source: "MTProto.xyz API",
          type: "socks5",
          country: proxy.country,
          ping: proxy.ping,
          addTime: proxy.addTime,
        }

        proxies.push(proxyData)
        console.log(`✅ SOCKS5 proxy ${i + 1}: Valid and added`)
      }

      console.log(`✅ Successfully parsed ${proxies.length}/${socks5List.length} SOCKS5 proxies`)
      return proxies
    } catch (error) {
      console.error("💥 Error parsing SOCKS5 API:", error)
      return []
    }
  }

  // Validation với logging chi tiết
  async validateProxy(proxy: CrawledProxy): Promise<boolean> {
    console.log(`🔍 Validating ${proxy.type} proxy: ${proxy.server}:${proxy.port}`)

    if (!proxy.server || !proxy.port) {
      console.log(`❌ Missing server or port`)
      return false
    }

    if (proxy.port < 1 || proxy.port > 65535) {
      console.log(`❌ Invalid port range: ${proxy.port}`)
      return false
    }

    if (proxy.type === "mtproto") {
      if (!proxy.secret) {
        console.log(`❌ MTProto missing secret`)
        return false
      }

      if (!this.isValidMtProtoSecret(proxy.secret)) {
        console.log(`❌ MTProto invalid secret format`)
        return false
      }

      // MTProto CHỈ CHẤP NHẬN IP
      if (!this.isValidIP(proxy.server)) {
        console.log(`❌ MTProto invalid IP format (hostname not allowed)`)
        return false
      }
    } else if (proxy.type === "socks5") {
      // SOCKS5 chấp nhận cả IP và hostname
      if (!this.isValidHost(proxy.server)) {
        console.log(`❌ SOCKS5 invalid host format`)
        return false
      }
    }

    console.log(`✅ Proxy validation passed`)
    return true
  }

  // Kiểm tra duplicate - giữ nguyên
  async checkExistingProxies(proxies: CrawledProxy[]): Promise<CrawledProxy[]> {
    try {
      const { supabase } = await import("@/lib/supabase")

      console.log(`🔍 Checking ${proxies.length} proxies for duplicates...`)

      const newProxies: CrawledProxy[] = []

      for (const proxy of proxies) {
        try {
          const { data: existing } = await supabase
            .from("proxies")
            .select("id")
            .eq("server", proxy.server)
            .eq("port", proxy.port)
            .limit(1)
            .single()

          if (!existing) {
            newProxies.push(proxy)
            console.log(`✅ New ${proxy.type}: ${proxy.server}:${proxy.port}`)
          } else {
            console.log(`⏭️ Duplicate ${proxy.type}: ${proxy.server}:${proxy.port}`)
          }
        } catch (error) {
          newProxies.push(proxy)
          console.log(`✅ New ${proxy.type} (no match): ${proxy.server}:${proxy.port}`)
        }
      }

      console.log(`🎯 Found ${newProxies.length} new proxies out of ${proxies.length} total`)
      return newProxies
    } catch (error) {
      console.error("Error checking existing proxies:", error)
      return proxies
    }
  }

  // Crawl từ URL với error handling tốt hơn
  async crawlFromUrl(url: string, sourceName: string): Promise<CrawledProxy[]> {
    try {
      console.log(`🕷️ Crawling proxies from: ${url}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MTProto-Crawler/1.0)",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(`📡 Response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        console.error(`❌ HTTP ${response.status} from ${url}`)
        return []
      }

      const content = await response.text()
      console.log(`📄 Received ${content.length} characters from ${url}`)
      console.log(`📄 Content preview: ${content.substring(0, 200)}...`)

      const source = this.sources.find((s) => s.url === url)
      if (source) {
        return await source.parser.call(this, content)
      } else {
        console.error(`❌ No parser found for URL: ${url}`)
        return []
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error(`⏰ Timeout crawling from ${url}`)
      } else {
        console.error(`❌ Error crawling from ${url}:`, error)
      }
      return []
    }
  }

  // Crawl với lựa chọn loại proxy
  async crawlSelected(enabledTypes: string[]): Promise<CrawledProxy[]> {
    console.log(`🚀 Starting selective crawl for types: ${enabledTypes.join(", ")}`)

    const selectedSources = this.sources.filter((source) => {
      if (enabledTypes.includes("mtproto") && source.type === "mtproto-api") return true
      if (enabledTypes.includes("socks5") && source.type === "socks5-api") return true
      return false
    })

    console.log(`📡 Selected ${selectedSources.length} sources`)

    const crawlPromises = selectedSources.map(async (source) => {
      try {
        console.log(`\n📡 Crawling ${source.name}...`)
        const proxies = await this.crawlFromUrl(source.url, source.name)
        console.log(`✅ ${source.name}: ${proxies.length} valid proxies`)
        return proxies
      } catch (error) {
        console.error(`❌ ${source.name}: Failed -`, error)
        return []
      }
    })

    const results = await Promise.allSettled(crawlPromises)
    const allProxies: CrawledProxy[] = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        allProxies.push(...result.value)
      } else {
        console.error(`Source ${selectedSources[index].name} failed:`, result.reason)
      }
    })

    // Loại bỏ duplicate
    const uniqueProxies = allProxies.filter(
      (proxy, index, self) => index === self.findIndex((p) => p.server === proxy.server && p.port === proxy.port),
    )

    const mtprotoCount = uniqueProxies.filter((p) => p.type === "mtproto").length
    const socks5Count = uniqueProxies.filter((p) => p.type === "socks5").length

    console.log(`\n🎯 Selective crawl summary:`)
    console.log(`   Total unique: ${uniqueProxies.length}`)
    console.log(`   MTProto (IP-only): ${mtprotoCount}`)
    console.log(`   SOCKS5: ${socks5Count}`)

    // Kiểm tra duplicate với database
    const newProxies = await this.checkExistingProxies(uniqueProxies)

    return newProxies
  }

  // Crawl tất cả với logging chi tiết
  async crawlAll(): Promise<CrawledProxy[]> {
    return this.crawlSelected(["mtproto", "socks5"])
  }

  // Text parsing - cải thiện cho MTProto
  async crawlFromText(text: string, sourceName = "Manual Input"): Promise<CrawledProxy[]> {
    const proxies: CrawledProxy[] = []
    const lines = text.split("\n").filter((line) => line.trim())

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const patterns = [
        {
          regex: /tg:\/\/proxy\?server=([^&]+)&port=(\d+)&secret=([a-fA-F0-9]{32,})/g,
          type: "mtproto" as const,
        },
        {
          regex: /([a-zA-Z0-9.-]+):(\d+):([a-fA-F0-9]{32,})/g,
          type: "mtproto" as const,
        },
        {
          regex: /([a-zA-Z0-9.-]+):(\d+)$/g,
          type: "socks5" as const,
        },
      ]

      for (const pattern of patterns) {
        let match
        while ((match = pattern.regex.exec(line)) !== null) {
          if (pattern.type === "mtproto") {
            const [, server, port, secret] = match
            // MTProto CHỈ CHẤP NHẬN IP
            if (this.isValidIP(server) && this.isValidMtProtoSecret(secret)) {
              proxies.push({
                server: server.trim(),
                port: Number.parseInt(port),
                secret: secret.trim().toLowerCase(),
                description: `Manual MTProto IP ${proxies.length + 1}`,
                source: sourceName,
                type: "mtproto",
              })
            }
          } else if (pattern.type === "socks5") {
            const [, server, port] = match
            // SOCKS5 chấp nhận cả IP và hostname
            if (this.isValidHost(server)) {
              proxies.push({
                server: server.trim(),
                port: Number.parseInt(port),
                secret: undefined,
                description: `Manual SOCKS5 ${proxies.length + 1}`,
                source: sourceName,
                type: "socks5",
              })
            }
          }
        }
      }
    }

    return proxies
  }

  // Demo proxies với MTProto hợp lệ
  generateDemoProxies(): CrawledProxy[] {
    return [
      {
        server: "149.154.175.50",
        port: 443,
        secret: "ee1b1a9c16aac9ba84fd2430b57ef6a4ee1b1a9c16aac9ba84fd2430b57ef6a4",
        description: "Demo MTProto IP (Telegram Official)",
        source: "Demo",
        type: "mtproto",
      },
      {
        server: "1.1.1.1",
        port: 1080,
        secret: undefined,
        description: "Demo SOCKS5 IP",
        source: "Demo",
        type: "socks5",
      },
    ]
  }

  addSource(source: ProxySource) {
    this.sources.push(source)
  }

  getSources() {
    return this.sources.map((s) => ({
      name: s.name,
      url: s.url,
      type: s.type,
    }))
  }
}

export const proxyCrawler = new ProxyCrawler()
