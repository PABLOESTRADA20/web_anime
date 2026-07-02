import { describe, it, expect } from 'vitest'
import { ACHIEVEMENTS, XP_VALUES, xpForLevel, levelFromXp, xpProgress } from './achievements'

describe('ACHIEVEMENTS', () => {
  it('tiene 17 logros definidos', () => {
    expect(ACHIEVEMENTS).toHaveLength(17)
  })

  it('cada logro tiene id, nameKey, descKey, icon, xp', () => {
    for (const ach of ACHIEVEMENTS) {
      expect(ach.id).toBeTruthy()
      expect(ach.nameKey).toBeTruthy()
      expect(ach.descKey).toBeTruthy()
      expect(ach.icon).toBeTruthy()
      expect(typeof ach.xp).toBe('number')
    }
  })

  it('todos los logros tienen XP positivo', () => {
    for (const ach of ACHIEVEMENTS) {
      expect(ach.xp).toBeGreaterThan(0)
    }
  })
})

describe('XP_VALUES', () => {
  it('tiene valores para todas las acciones definidas', () => {
    const expected = [
      'WATCH_EPISODE',
      'READ_MANGA_CHAPTER',
      'READ_NOVEL_CHAPTER',
      'WRITE_REVIEW',
      'RATE_CONTENT',
      'ADD_FAVORITE',
      'REMOVE_FAVORITE',
      'WRITE_COMMENT',
      'LOGIN_STREAK',
      'JOIN_WATCH_PARTY',
      'CREATE_COLLECTION',
      'SUBMIT_LINK',
    ]
    for (const key of expected) {
      expect(XP_VALUES).toHaveProperty(key)
    }
  })

  it('REMOVE_FAVORITE es negativo', () => {
    expect(XP_VALUES.REMOVE_FAVORITE).toBeLessThan(0)
  })

  it('WATCH_EPISODE es 10', () => {
    expect(XP_VALUES.WATCH_EPISODE).toBe(10)
  })
})

describe('xpForLevel', () => {
  it('nivel 1 cuesta 100 XP', () => {
    expect(xpForLevel(1)).toBe(100)
  })

  it('nivel 5 cuesta 2500 XP', () => {
    expect(xpForLevel(5)).toBe(2500)
  })

  it('nivel 10 cuesta 10000 XP', () => {
    expect(xpForLevel(10)).toBe(10000)
  })
})

describe('levelFromXp', () => {
  it('0 XP es nivel 1', () => {
    expect(levelFromXp(0)).toBe(1)
  })

  it('99 XP es nivel 1', () => {
    expect(levelFromXp(99)).toBe(1)
  })

  it('100 XP es nivel 1', () => {
    expect(levelFromXp(100)).toBe(1)
  })

  it('399 XP es nivel 1', () => {
    expect(levelFromXp(399)).toBe(1)
  })

  it('400 XP es nivel 2', () => {
    expect(levelFromXp(400)).toBe(2)
  })

  it('900 XP es nivel 3', () => {
    expect(levelFromXp(900)).toBe(3)
  })

  it('10000 XP es nivel 10', () => {
    expect(levelFromXp(10000)).toBe(10)
  })
})

describe('xpProgress', () => {
  it('0 XP → level 1, progreso 0 (clamped)', () => {
    const p = xpProgress(0)
    expect(p.level).toBe(1)
    expect(p.currentXp).toBe(-100)
    expect(p.neededXp).toBeGreaterThan(0)
    expect(p.progress).toBe(0)
  })

  it('250 XP → level 1, 50% progreso (250/500)', () => {
    const p = xpProgress(250)
    expect(p.level).toBe(1)
    expect(p.progress).toBe(50)
  })

  it('400 XP → level 2, 0% progreso', () => {
    const p = xpProgress(400)
    expect(p.level).toBe(2)
    expect(p.currentXp).toBe(0)
    expect(p.progress).toBe(0)
  })
})
