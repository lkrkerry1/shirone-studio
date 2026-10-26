const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

/** Extension for a clipboard/drop image, falling back to a safe default. */
export function imageExtension(file: File): string {
  const byMime = IMAGE_EXTENSIONS[file.type.toLowerCase()]
  if (byMime) return byMime
  const nameExtension = file.name.split('.').pop()?.toLowerCase()
  if (nameExtension && Object.values(IMAGE_EXTENSIONS).includes(nameExtension)) {
    return nameExtension
  }
  return 'png'
}

/** First image file on a clipboard or drag data transfer, if any. */
export function findImageFile(items: DataTransferItemList | null | undefined): File | null {
  if (!items) return null
  for (const item of Array.from(items)) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) return file
  }
  return null
}

function timestamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
}

function randomSuffix(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Path of a pasted image relative to the document, e.g. `img/pasted-….png`,
 * which is what the Markdown link must contain.
 */
export function pastedImagePath(docPath: string, file: File): string {
  return `img/pasted-${timestamp()}-${randomSuffix()}.${imageExtension(file)}`
}

/** Root-relative path used when writing the image into the project. */
export function documentDirectory(docPath: string): string {
  const normalized = docPath.replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '' : normalized.slice(0, index)
}

const CHUNK = 0x8000

/** Read a file as standard base64, without blowing the call stack. */
export async function readFileBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK))
  }
  return btoa(binary)
}
