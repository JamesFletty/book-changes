import { beforeEach, describe, expect, it } from 'vitest'
import { POST as register } from '@/app/api/auth/register/route'
import { verifyCredentials } from '@/lib/credentials'
import { resetDatabase } from './helpers'

beforeEach(async () => {
  await resetDatabase()
})

describe('signup and login', () => {
  it('creates an account and accepts the same password', async () => {
    const response = await register(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ada Lovelace',
        email: 'Ada@Example.com',
        password: 'correct-horse',
      }),
    }))

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.email).toBe('ada@example.com')
    expect(body.passwordHash).toBeUndefined()

    const user = await verifyCredentials('ada@example.com', 'correct-horse')
    expect(user?.email).toBe('ada@example.com')
    expect(await verifyCredentials('ada@example.com', 'wrong-password')).toBeNull()
  })

  it('rejects a short password and a duplicate email', async () => {
    const short = await register(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'short' }),
    }))
    expect(short.status).toBe(400)

    const first = await register(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'long-enough' }),
    }))
    expect(first.status).toBe(201)

    const duplicate = await register(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'A@example.com', password: 'long-enough' }),
    }))
    expect(duplicate.status).toBe(400)
  })
})
