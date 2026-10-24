import { NextResponse } from 'next/server'

const exercises = [
  { number: 1, question: 'What is 1/3 + 1/4?', answer: '7/12', skill: 'Adding fractions' },
  { number: 2, question: 'What is 2/5 + 3/10?', answer: '7/10', skill: 'Finding common denominators' },
  { number: 3, question: 'What is 5/6 - 1/4?', answer: '7/12', skill: 'Subtracting fractions' },
  { number: 4, question: 'What is 3/8 + 5/12? Simplify your answer.', answer: '19/24', skill: 'Simplifying fractions' },
  { number: 5, question: 'What is 7/9 - 2/3?', answer: '1/9', skill: 'Subtracting unlike fractions' },
]

export async function POST() {
  return NextResponse.json({ exercises })
}
