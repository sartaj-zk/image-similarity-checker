// netlify/functions/search.mjs
//
// Three-source image similarity search:
//   1. Supabase DB  — compares against all previously uploaded images (pHash)
//   2. Google Vision — searches entire internet for matching images
//   3. TinEye        — checks 70B+ image index for exact/near duplicates
//
// Required env vars:
//   SUPABASE_URL          — your Supabase project URL
//   SUPABASE_ANON_KEY     — your Supabase anon key
//   GOOGLE_VISION_API_KEY — Google Cloud Vision API key
//   TINEYE_API_KEY        — TinEye private key  (optional)
//   TINEYE_API_USER       — TinEye public key   (optional)

// ─── Pure JS pHash (no dependencies) ─────────────────────────────────────────

async function computePHash(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const pixels = await decodeImageToGray(buf)
  const SMALL = 8
  const resized = resizeGray(pixels.data, pixels.width, pixels.height, SMALL, SMALL)
  const mean = resized.reduce((a, b) => a + b, 0) / resized.length
  const bits = resized.map(v => v >= mean ? 1 : 0)
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i+1] << 2) | (bits[i+2] << 1) | bits[i+3]
    hex += nibble.toString(16)
  }
  return hex
}

function resizeGray(src, sw, sh, dw, dh) {
  const out = new Array(dw * dh)
  for (let y = 0; y < dh; y++)
    for (let x = 0; x < dw; x++) {
      const sx = Math.floor(x * sw / dw)
      const sy = Math.floor(y * sh / dh)
      out[y * dw + x] = src[sy * sw + sx]
    }
  return out
}

async function decodeImageToGray(buf) {
  const isJPEG = buf[0] === 0xFF && buf[1] === 0xD8
  const isPNG  = buf[0] === 0x89 && buf[1] === 0x50
  if (isPNG)  return decodePNGGray(buf)
  if (isJPEG) return decodeJPEGGray(buf)
  return { data: [128], width: 1, height: 1 }
}

async function decodePNGGray(buf) {
  const zlib = await import('zlib')
  const { promisify } = await import('util')
  const inflate = promisify(zlib.inflate)
  const width  = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const colorType = buf[25]
  let idatData = Buffer.alloc(0)
  let pos = 8
  while (pos < buf.length - 12) {
    const len  = buf.readUInt32BE(pos)
    const type = buf.slice(pos + 4, pos + 8).toString('ascii')
    if (type === 'IDAT') idatData = Buffer.concat([idatData, buf.slice(pos + 8, pos + 8 + len)])
    if (type === 'IEND') break
    pos += 12 + len
  }
  const raw = await inflate(idatData)
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 4 ? 2 : 1
  const stride = width * channels + 1
  const gray = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const base = y * stride + 1 + x * channels
      const r = raw[base] || 0
      const g = channels > 1 ? (raw[base+1] || 0) : r
      const b = channels > 2 ? (raw[base+2] || 0) : r
      gray.push(Math.round(0.299*r + 0.587*g + 0.114*b))
    }
  return { data: gray, width, height }
}

async function decodeJPEGGray(buf) {
  let width = 8, height = 8
  for (let i = 0; i < buf.length - 8; i++) {
    if (buf[i] === 0xFF && (buf[i+1] === 0xC0 || buf[i+1] === 0xC2)) {
      height = buf.readUInt16BE(i+5)
      width  = buf.readUInt16BE(i+7)
      break
    }
  }
  const total = width * height
  const step  = Math.max(1, Math.floor(buf.length / total))
  const gray  = []
  for (let i = 0; i < total; i++)
    gray.push(buf[Math.min(i * step, buf.length - 1)])
  return { data: gray, width, height }
}

function hammingDistance(h1, h2) {
  if (!h1 || !h2 || h1.length !== h2.length) return 64
  let dist = 0
  for (let i = 0; i < h1.length; i++) {
    const xor = parseInt(h1[i], 16) ^ parseInt(h2[i], 16)
    dist += xor.toString(2).split('').filter(b => b === '1').length
  }
  return dist
}

function matchType(dist) {
  if (dist === 0)  return 'exact'
  if (dist <= 6)   return 'near-exact'
  if (dist <= 15)  return 'similar'
  return 'different'
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

function sbHeaders() {
  return {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  }
}

const SB = () => process.env.SUPABASE_URL?.replace(/\/$/, '')

async function getAllDBImages() {
  const res = await fetch(
    `${SB()}/rest/v1/images?select=id,filename,phash,file_url,uploaded_at&order=uploaded_at.desc`,
    { headers: sbHeaders() }
  )
  if (!res.ok) throw new Error(`Supabase fetch error: ${await res.text()}`)
  return res.json()
}

async function saveImageRecord(filename, phash, fileUrl) {
  const res = await fetch(`${SB()}/rest/v1/images`, {
    method: 'POST',
    headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify({ filename, phash, file_url: fileUrl }),
  })
  if (!res.ok) throw new Error(`Supabase insert error: ${await res.text()}`)
  return res.json()
}

async function uploadToStorage(filename, buffer, mimeType) {
  const res = await fetch(`${SB()}/storage/v1/object/images/${filename}`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': mimeType,
      'x-upsert': 'true',
    },
    body: buffer,
  })
  if (!res.ok) throw new Error(`Storage upload error: ${await res.text()}`)
  return `${SB()}/storage/v1/object/public/images/${filename}`
}

// ─── Supabase DB search ───────────────────────────────────────────────────────

async function searchSupabase(imageBuffer) {
  const queryHash = await computePHash(imageBuffer)
  const existing  = await getAllDBImages()
  const matches   = []

  for (const img of existing) {
    if (!img.phash) continue
    const dist = hammingDistance(queryHash, img.phash)
    const type = matchType(dist)
    if (type === 'different') continue
    matches.push({
      source:         'Your Database',
      match_type:     type,
      similarity_pct: Math.round((1 - dist / 64) * 100),
      confidence:     dist === 0 ? 'High' : dist <= 6 ? 'High' : 'Medium',
      url:            img.file_url,
      page_url:       null,
      title:          img.filename,
      thumbnail:      img.file_url,
      uploaded_at:    img.uploaded_at,
    })
  }

  return { matches, queryHash, existingImages: existing }
}

// ─── Google Vision search ─────────────────────────────────────────────────────

async function searchGoogleVision(imageBuffer) {
  const key = process.env.GOOGLE_VISION_API_KEY
  if (!key) return { matches: [], entities: [], bestGuessLabels: [] }

  const base64 = Buffer.from(imageBuffer).toString('base64')
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'WEB_DETECTION', maxResults: 30 }],
        }],
      }),
    }
  )

  if (!res.ok) return { matches: [], entities: [], bestGuessLabels: [] }

  const json = await res.json()
  const web  = json.responses?.[0]?.webDetection || {}
  const matches = []

  for (const m of web.fullMatchingImages || [])
    matches.push({ source: 'Google Vision', match_type: 'exact', similarity_pct: 100,
      confidence: 'High', url: m.url, page_url: null, title: null, thumbnail: m.url })

  for (const m of web.partialMatchingImages || [])
    matches.push({ source: 'Google Vision', match_type: 'partial', similarity_pct: 85,
      confidence: 'Medium', url: m.url, page_url: null, title: null, thumbnail: m.url })

  for (const page of web.pagesWithMatchingImages || []) {
    const thumb   = page.fullMatchingImages?.[0]?.url || page.partialMatchingImages?.[0]?.url || null
    const isExact = (page.fullMatchingImages?.length || 0) > 0
    matches.push({ source: 'Google Vision', match_type: isExact ? 'page-exact' : 'page-partial',
      similarity_pct: isExact ? 95 : 75, confidence: isExact ? 'High' : 'Medium',
      url: thumb, page_url: page.url, title: page.pageTitle || null, thumbnail: thumb })
  }

  for (const m of web.visuallySimilarImages || [])
    matches.push({ source: 'Google Vision', match_type: 'visual', similarity_pct: 60,
      confidence: 'Low', url: m.url, page_url: null, title: null, thumbnail: m.url })

  const entities = (web.webEntities || [])
    .filter(e => e.score > 0.5 && e.description)
    .slice(0, 6)
    .map(e => ({ description: e.description, score: Math.round(e.score * 100) }))

  const bestGuessLabels = (web.bestGuessLabels || []).map(l => l.label)

  return { matches, entities, bestGuessLabels }
}

// ─── TinEye search ────────────────────────────────────────────────────────────

async function searchTinEye(imageBuffer) {
  const privateKey = process.env.TINEYE_API_KEY
  const publicKey  = process.env.TINEYE_API_USER
  if (!privateKey || !publicKey) return []

  const crypto    = await import('crypto')
  const boundary  = '----TinEyeBoundary' + Date.now()
  const imgBuffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer)
  const pre  = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="upload.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  const post = `\r\n--${boundary}--\r\n`
  const body = Buffer.concat([Buffer.from(pre), imgBuffer, Buffer.from(post)])

  const date        = new Date().toUTCString()
  const nonce       = crypto.randomBytes(16).toString('hex')
  const contentType = `multipart/form-data; boundary=${boundary}`
  const requestUri  = 'https://api.tineye.com/rest/search/'
  const toSign      = ['POST', contentType, date, nonce, requestUri].join('\n')
  const hmac        = crypto.createHmac('sha256', privateKey).update(toSign).digest('hex')

  const res = await fetch(requestUri, {
    method: 'POST',
    headers: { Authorization: `TinEye ${publicKey}:${nonce}:${hmac}`, Date: date, 'Content-Type': contentType },
    body,
  })

  if (!res.ok) return []
  const json    = await res.json()
  const results = json.results?.matches || []

  return results.slice(0, 10).map(m => ({
    source:         'TinEye',
    match_type:     m.score >= 99 ? 'exact' : 'near-exact',
    similarity_pct: Math.round(m.score),
    confidence:     m.score >= 95 ? 'High' : 'Medium',
    url:            m.image_url,
    page_url:       m.backlinks?.[0]?.url || null,
    title:          m.backlinks?.[0]?.anchor || null,
    thumbnail:      m.image_url,
  }))
}

// ─── Multipart parser ─────────────────────────────────────────────────────────

function parseMultipart(bodyBuf, contentType) {
  const match = contentType.match(/boundary=(.+)/)
  if (!match) throw new Error('No boundary found')
  const boundary = match[1].trim()
  const sep = Buffer.from(`--${boundary}`)
  const parts = []
  let start = 0
  while (start < bodyBuf.length) {
    const idx = bodyBuf.indexOf(sep, start)
    if (idx === -1) break
    const after = idx + sep.length
    if (bodyBuf[after] === 45 && bodyBuf[after+1] === 45) break
    const headerStart = bodyBuf[after] === 13 ? after + 2 : after + 1
    const headerEnd   = bodyBuf.indexOf(Buffer.from('\r\n\r\n'), headerStart)
    if (headerEnd === -1) { start = after; continue }
    const headerStr = bodyBuf.slice(headerStart, headerEnd).toString()
    const dataStart = headerEnd + 4
    const nextBound = bodyBuf.indexOf(sep, dataStart)
    const dataEnd   = nextBound === -1 ? bodyBuf.length : nextBound - 2
    const headers   = {}
    for (const line of headerStr.split('\r\n')) {
      const colon = line.indexOf(':')
      if (colon > -1) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon+1).trim()
    }
    parts.push({ headers, data: bodyBuf.slice(dataStart, dataEnd) })
    start = nextBound === -1 ? bodyBuf.length : nextBound
  }
  return parts
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === 'OPTIONS')
    return new Response('', { status: 204, headers: cors() })
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors() })

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
      throw new Error('Supabase environment variables are not configured')

    // Parse uploaded file
    const contentType = req.headers.get('content-type') || ''
    const rawBody     = await req.arrayBuffer()
    const bodyBuf     = Buffer.from(rawBody)

    let fileBuffer = null, fileName = 'upload.jpg', mimeType = 'image/jpeg'

    if (contentType.includes('multipart/form-data')) {
      const parts    = parseMultipart(bodyBuf, contentType)
      const filePart = parts.find(p => {
        const cd = p.headers['content-disposition'] || ''
        return cd.includes('filename=') || cd.includes('name="file"')
      })
      if (!filePart) throw new Error('No file found in upload')
      fileBuffer = filePart.data
      const cd        = filePart.headers['content-disposition'] || ''
      const nameMatch = cd.match(/filename="([^"]+)"/)
      fileName  = nameMatch ? nameMatch[1] : `upload_${Date.now()}.jpg`
      mimeType  = filePart.headers['content-type'] || 'image/jpeg'
    } else {
      throw new Error('Expected multipart/form-data')
    }

    // Compute hash and save image silently to Supabase (no search against DB)
    const queryHash      = await computePHash(fileBuffer)
    const uniqueFilename = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    // Save silently — don't await, don't block search, don't surface errors to user
    uploadToStorage(uniqueFilename, fileBuffer, mimeType)
      .then(fileUrl => saveImageRecord(uniqueFilename, queryHash, fileUrl))
      .catch(err => console.error('[storage save]', err))

    // Run Google Vision + TinEye in parallel
    const [googleResult, tineyeResult] = await Promise.allSettled([
      searchGoogleVision(fileBuffer),
      searchTinEye(fileBuffer),
    ])

    const googleMatches   = googleResult.status === 'fulfilled' ? googleResult.value.matches         : []
    const entities        = googleResult.status === 'fulfilled' ? googleResult.value.entities        : []
    const bestGuessLabels = googleResult.status === 'fulfilled' ? googleResult.value.bestGuessLabels : []
    const tineyeMatches   = tineyeResult.status === 'fulfilled' ? tineyeResult.value                 : []

    // Merge and deduplicate by URL
    const allMatches = [...tineyeMatches, ...googleMatches]
      .sort((a, b) => b.similarity_pct - a.similarity_pct)

    const seen = new Set()
    const results = allMatches.filter(r => {
      const key = r.url || r.page_url || Math.random().toString()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return new Response(JSON.stringify({
      message:        'Search complete',
      query_filename: fileName,
      matches_found:  results.length,
      results,
      entities,
      bestGuessLabels,
      sources: {
        google: googleMatches.length,
        tineye: tineyeMatches.length,
      },
    }), { status: 200, headers: cors() })

  } catch (err) {
    console.error('[search]', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: cors() }
    )
  }
}
