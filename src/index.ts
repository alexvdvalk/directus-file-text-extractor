import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  createDirectus,
  readMe,
  rest,
  staticToken,
  readAssetArrayBuffer,
  readFile,
} from '@directus/sdk'
import {
  extractTextFromBinary,
  UnsupportedMediaTypeError,
} from './extract-text.js'

const app = new Hono()

const extractRequestSchema = z.object({
  fileid: z.uuid(),
  directus_url: z.url(),
  token: z.string().min(1),
})

app.post('/extract', zValidator('json', extractRequestSchema), async (c) => {
  const { fileid, directus_url, token } = c.req.valid('json')
  const directus = createDirectus(directus_url)
    .with(rest())
    .with(staticToken(token))

  try {
    await directus.request(readMe())
  } catch {
    return c.json({ error: 'Invalid url or token' }, 401)
  }

  let fileMeta: { type: string | null; filename_download: string }
  let buffer: ArrayBuffer
  try {
    const [meta, bytes] = await Promise.all([
      directus.request(
        readFile(fileid, {
          fields: ['type', 'filename_download'],
        })
      ),
      directus.request(readAssetArrayBuffer(fileid)),
    ])
    fileMeta = meta as { type: string | null; filename_download: string }
    buffer = bytes
  } catch {
    return c.json({ error: 'File not found or not accessible' }, 404)
  }

  try {
    const { text, format, mimeType } = await extractTextFromBinary(
      buffer,
      fileMeta.type,
      fileMeta.filename_download
    )
    return c.json({
      fileid,
      mime_type: mimeType,
      format,
      text,
    })
  } catch (err) {
    if (err instanceof UnsupportedMediaTypeError) {
      return c.json({ error: err.message }, 415)
    }
    const message = err instanceof Error ? err.message : 'Failed to parse file'
    return c.json({ error: message }, 422)
  }
})

export default app
