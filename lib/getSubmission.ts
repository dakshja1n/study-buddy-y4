import { doc, getDoc } from 'firebase/firestore'
import { getDb } from './firebase'

export async function getSubmission(docId: string) {
  const db = getDb()
  if (!db) return null
  const snapshot = await getDoc(doc(db, 'submissions', docId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}
