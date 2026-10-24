import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getDb } from './firebase'

const MAX_DIMENSION = 1280
const SAVE_TIMEOUT_MS = 8000

// Firestore documents are capped at 1 MB, so phone photos must be downscaled before storing as base64.
async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not read this image. Please try a JPG or PNG photo.'))
      image.src = url
    })
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timed out saving submission')), ms)),
  ])
}

export async function uploadHomeworkImage(file: File, subject: string) {
  const { base64, mimeType } = await compressImage(file)

  let docId: string | null = null
  const db = getDb()
  if (!db) return { docId, imageBase64: base64, imageMimeType: mimeType }

  try {
    const submission = await withTimeout(
      addDoc(collection(db, 'submissions'), {
        imageBase64: base64,
        imageMimeType: mimeType,
        subject,
        status: 'pending',
        createdAt: serverTimestamp(),
      }),
      SAVE_TIMEOUT_MS,
    )
    docId = submission.id
  } catch (error) {
    console.warn('Could not save submission to Firestore; continuing without it.', error)
  }

  return { docId, imageBase64: base64, imageMimeType: mimeType }
}
