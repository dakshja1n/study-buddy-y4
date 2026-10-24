import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function uploadHomeworkImage(file: File, subject: string) {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const submission = await addDoc(collection(db, 'submissions'), {
    imageBase64: base64,
    imageMimeType: file.type,
    subject,
    status: 'pending',
    createdAt: serverTimestamp(),
  })

  return { docId: submission.id, imageBase64: base64 }
}
