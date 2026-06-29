import { describe, it, expect } from 'vitest'
import { novelbuddyProvider } from './novelbuddy'

const SLUG = 'only-i-level-up'

describe('novelbuddyProvider', () => {
  describe('interface', () => {
    it('tiene las funciones requeridas', () => {
      expect(typeof novelbuddyProvider.search).toBe('function')
      expect(typeof novelbuddyProvider.info).toBe('function')
      expect(typeof novelbuddyProvider.chapters).toBe('function')
      expect(typeof novelbuddyProvider.chapterContent).toBe('function')
    })
  })

  describe('search', () => {
    it('retorna array sin errores', async () => {
      const results = await novelbuddyProvider.search({ q: 'Only I Level Up' })
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('info', () => {
    it('retorna metadata completa', async () => {
      const info = await novelbuddyProvider.info({ slug: SLUG })
      expect(info.title).toBeTruthy()
      expect(info.slug).toBe(SLUG)
      expect(info.author).toBeTruthy()
      expect(info.author).toContain('Chugong')
      expect(info.status).toMatch(/Completed|Ongoing|Unknown/i)
      expect(Array.isArray(info.genres)).toBe(true)
      expect(info.genres.length).toBeGreaterThanOrEqual(3)
    })

    it('retorna cover URL', async () => {
      const info = await novelbuddyProvider.info({ slug: SLUG })
      expect(info.cover).toBeTruthy()
      expect(info.cover).toMatch(/^https?:\/\//)
    })

    it('retorna descripción', async () => {
      const info = await novelbuddyProvider.info({ slug: SLUG })
      expect(info.description).toBeTruthy()
      expect(info.description.length).toBeGreaterThan(10)
    })

    it('lanza error para slug inexistente', async () => {
      await expect(novelbuddyProvider.info({ slug: 'this-novel-does-not-exist-99999' })).rejects.toThrow()
    })
  })

  describe('chapters', () => {
    it('retorna capítulos ordenados con gaps llenados', async () => {
      const chapters = await novelbuddyProvider.chapters({ slug: SLUG })
      expect(Array.isArray(chapters)).toBe(true)
      expect(chapters.length).toBeGreaterThanOrEqual(200)
      for (let i = 1; i < chapters.length; i++) {
        expect(chapters[i].number).toBeGreaterThan(chapters[i - 1].number)
      }
    })

    it('cada capítulo tiene number, title, path', async () => {
      const chapters = await novelbuddyProvider.chapters({ slug: SLUG })
      expect(chapters.length).toBeGreaterThan(0)
      const ch = chapters[0]
      expect(typeof ch.number).toBe('number')
      expect(typeof ch.title).toBe('string')
      expect(typeof ch.path).toBe('string')
    })

    it('el path del primer capítulo es correcto', async () => {
      const chapters = await novelbuddyProvider.chapters({ slug: SLUG })
      const ch1 = chapters.find((c) => c.number === 1)
      expect(ch1).toBeTruthy()
      expect(ch1.path).toBe(`${SLUG}/chapter-1`)
    })
  })

  describe('chapterContent', () => {
    it('retorna contenido del capítulo 1', async () => {
      const content = await novelbuddyProvider.chapterContent({
        path: `${SLUG}/chapter-1`,
      })
      expect(content.title).toBeTruthy()
      expect(content.content).toBeTruthy()
      expect(content.content.length).toBeGreaterThan(100)
    })

    it('retorna contenido del capítulo final', async () => {
      const content = await novelbuddyProvider.chapterContent({
        path: `${SLUG}/chapter-270-end`,
      })
      expect(content.title).toBeTruthy()
      expect(content.content.length).toBeGreaterThan(100)
    })
  })
})
