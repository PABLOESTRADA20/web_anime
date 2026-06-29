import { describe, it, expect } from 'vitest'
import { readnovelfullProvider } from './readnovelfull'

const SLUG = 'only-i-level-up'

describe('readnovelfullProvider', () => {
  describe('interface', () => {
    it('tiene las funciones requeridas', () => {
      expect(typeof readnovelfullProvider.search).toBe('function')
      expect(typeof readnovelfullProvider.info).toBe('function')
      expect(typeof readnovelfullProvider.chapters).toBe('function')
      expect(typeof readnovelfullProvider.chapterContent).toBe('function')
    })
  })

  describe('search', () => {
    it('encuentra Solo Leveling buscando "Solo Leveling"', async () => {
      const results = await readnovelfullProvider.search({ q: 'Solo Leveling' })
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.some((r) => r.slug === SLUG)).toBe(true)
    })

    it('retorna array vacío para query sin resultados', async () => {
      const results = await readnovelfullProvider.search({ q: 'xyz123nonexistent999' })
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('info', () => {
    it('retorna metadata completa', async () => {
      const info = await readnovelfullProvider.info({ slug: SLUG })
      expect(info.title).toBeTruthy()
      expect(info.slug).toBe(SLUG)
      expect(info.author).toBeTruthy()
      expect(info.status).toMatch(/Completed|Ongoing|Unknown/i)
      expect(Array.isArray(info.genres)).toBe(true)
    })

    it('retorna cover URL', async () => {
      const info = await readnovelfullProvider.info({ slug: SLUG })
      expect(info.cover).toBeTruthy()
      expect(info.cover).toMatch(/^https?:\/\//)
    })

    it('lanza error para slug inexistente', async () => {
      await expect(readnovelfullProvider.info({ slug: 'this-novel-does-not-exist-12345' })).rejects.toThrow()
    })
  })

  describe('chapters', () => {
    it('retorna todos los capítulos ordenados', async () => {
      const chapters = await readnovelfullProvider.chapters({ slug: SLUG })
      expect(Array.isArray(chapters)).toBe(true)
      expect(chapters.length).toBeGreaterThan(100)
      for (let i = 1; i < chapters.length; i++) {
        expect(chapters[i].number).toBeGreaterThan(chapters[i - 1].number)
      }
    })

    it('cada capítulo tiene number, title, path', async () => {
      const chapters = await readnovelfullProvider.chapters({ slug: SLUG })
      const ch = chapters[0]
      expect(typeof ch.number).toBe('number')
      expect(typeof ch.title).toBe('string')
      expect(typeof ch.path).toBe('string')
    })
  })

  describe('chapterContent', () => {
    it('retorna contenido del capítulo 1', async () => {
      const content = await readnovelfullProvider.chapterContent({
        path: `${SLUG}/chapter-1-prologue.html`,
      })
      expect(content.title).toBeTruthy()
      expect(content.content).toBeTruthy()
      expect(content.content.length).toBeGreaterThan(100)
    })

    it('retorna contenido del capítulo final (270)', async () => {
      const content = await readnovelfullProvider.chapterContent({
        path: `${SLUG}/chapter-270-end-v1.html`,
      })
      expect(content.title).toBeTruthy()
      expect(content.content.length).toBeGreaterThan(100)
    })
  })
})
