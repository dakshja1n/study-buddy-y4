import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

export async function getSubmission(docId: string) {
  const snapshot = await getDoc(doc(db, 'submissions', docId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}
