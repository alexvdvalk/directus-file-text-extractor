import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

const MIME_PDF = 'application/pdf'
const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function normalizeMime(type: string | null | undefined): string | null {
  if (!type?.trim()) return null
  return type.split(';')[0]?.trim().toLowerCase() ?? null
}

function mimeFromFilename(name: string | null | undefined): string | null {
  if (!name) return null
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return MIME_PDF
  if (lower.endsWith('.docx')) return MIME_DOCX
  return null
}

function resolveFormat(
  mimeFromServer: string | null | undefined,
  filename: string | null | undefined
): 'pdf' | 'docx' | null {
  const mime = normalizeMime(mimeFromServer)
  if (mime === MIME_PDF) return 'pdf'
  if (mime === MIME_DOCX) return 'docx'
  if (
    mime === 'application/octet-stream' ||
    mime === 'binary/octet-stream' ||
    mime === null
  ) {
    const guess = mimeFromFilename(filename)
    if (guess === MIME_PDF) return 'pdf'
    if (guess === MIME_DOCX) return 'docx'
  }
  return null
}

export class UnsupportedMediaTypeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedMediaTypeError'
  }
}

export async function extractTextFromBinary(
  data: ArrayBuffer,
  mimeFromServer: string | null | undefined,
  filename: string | null | undefined
): Promise<{ text: string; format: 'pdf' | 'docx'; mimeType: string }> {
  const format = resolveFormat(mimeFromServer, filename)
  if (!format) {
    const shown = normalizeMime(mimeFromServer) ?? 'unknown'
    throw new UnsupportedMediaTypeError(
      `Unsupported file type (${shown}). Supported: ${MIME_PDF}, ${MIME_DOCX}.`
    )
  }

  if (format === 'pdf') {
    const parser = new PDFParse({ data: new Uint8Array(data) })
    try {
      const result = await parser.getText()
      return {
        text: result.text.trim(),
        format: 'pdf',
        mimeType: normalizeMime(mimeFromServer) ?? MIME_PDF,
      }
    } finally {
      await parser.destroy().catch(() => { })
    }
  }

  const { value } = await mammoth.extractRawText({ arrayBuffer: data })
  return {
    text: value.trim(),
    format: 'docx',
    mimeType: normalizeMime(mimeFromServer) ?? MIME_DOCX,
  }
}
