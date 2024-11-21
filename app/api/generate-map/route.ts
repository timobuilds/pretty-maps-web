import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'

// Input validation schema
const RequestSchema = z.object({
  address: z.string().min(1).max(200),
  mapType: z.enum([
    'default', 'minimal', 'detailed', 'retro', 'modern',
    'nature', 'dark', 'light', 'colorful', 'monochrome'
  ]),
  scale: z.number().min(50).max(1000),
  customColors: z.object({
    building_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    street_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    water_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    park_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
  }).optional()
})

// Rate limiting (needs Redis in production)
const RATE_LIMIT = 10 // requests per minute
const requestCounts = new Map<string, number>()

export async function POST(req: Request) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Validate input
    const body = await req.json()
    const validatedData = RequestSchema.parse(body)

    // Create temp directory
    const tempDir = path.join(process.cwd(), 'public', 'maps')
    fs.mkdirSync(tempDir, { recursive: true })

    // Clean old files
    await cleanOldFiles(tempDir)

    // Generate unique filename
    const filename = `map-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
    const outputPath = path.join(tempDir, filename)

    // Generate map using spawn
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_map.py')
    
    const args = [
      scriptPath,
      validatedData.address,
      validatedData.mapType,
      validatedData.scale.toString(),
      validatedData.customColors ? JSON.stringify(validatedData.customColors) : '{}',
      outputPath
    ]

    console.log('Generating map with:', {
      scriptPath,
      address: validatedData.address,
      mapType: validatedData.mapType,
      scale: validatedData.scale,
      customColors: validatedData.customColors,
      outputPath
    })

    const result = await new Promise((resolve, reject) => {
      const process = spawn('python3', args)

      let stdout = ''
      let stderr = ''

      process.stdout.on('data', (data) => {
        stdout += data
        console.log('Python stdout:', data.toString())
      })

      process.stderr.on('data', (data) => {
        stderr += data
        console.error('Python stderr:', data.toString())
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          reject(new Error(`Process exited with code ${code}\nStderr: ${stderr}`))
        }
      })

      process.on('error', (err) => {
        console.error('Failed to start Python process:', err)
        reject(err)
      })
    })

    // Check if file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('Map file was not created')
    }

    return NextResponse.json({
      success: true,
      mapUrl: `/maps/${filename}`
    })

  } catch (error) {
    console.error('Error generating map:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate map' },
      { status: 500 }
    )
  }
}

// Rate limiting helper
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const count = requestCounts.get(ip) || 0
  requestCounts.set(ip, count + 1)

  // Reset count after 1 minute
  setTimeout(() => {
    requestCounts.set(ip, Math.max(0, (requestCounts.get(ip) || 0) - 1))
  }, 60000)

  return count >= RATE_LIMIT
}

// Clean files older than 1 hour
async function cleanOldFiles(dir: string) {
  const files = fs.readdirSync(dir)
  const now = Date.now()
  const maxAge = 3600000 // 1 hour in milliseconds

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stats = fs.statSync(filePath)
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath)
    }
  }
}
