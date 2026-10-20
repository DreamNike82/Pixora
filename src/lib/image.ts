// Допоміжні функції для брендових зображень профілю

const loadImage = (file: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Не вдалося прочитати зображення'))
    }
    img.src = url
  })

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не вдалося підготувати зображення'))), type, quality),
  )

/**
 * Зменшує зображення до maxSide по довшій стороні. Сервер (Vercel) не приймає тіло запиту понад ~4.5 MB,
 * а для аватара, логотипа й знака великі розміри не потрібні. PNG лишається PNG (прозорість),
 * решта стає JPEG.
 */
export async function prepareImage(file: File, maxSide = 1600): Promise<File> {
  const img = await loadImage(file)
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  if (scale === 1 && file.size <= 1_500_000) return file

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  const keepPng = file.type === 'image/png' || file.type === 'image/webp'
  if (!keepPng) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const type = keepPng ? 'image/png' : 'image/jpeg'
  const blob = await toBlob(canvas, type, 0.88)
  const ext = keepPng ? 'png' : 'jpg'
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type })
}

// Водяний знак із тексту (Instagram): білий напис із тонким контуром на прозорому тлі, PNG
export async function makeTextWatermark(text: string): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 1000
  canvas.height = 300
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не вдалося створити водяний знак')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '110px Georgia, serif'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.strokeText(text, 500, 150, 940)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText(text, 500, 150, 940)
  const blob = await toBlob(canvas, 'image/png')
  return new File([blob], 'watermark.png', { type: 'image/png' })
}
