export const ACHIEVEMENTS = [
  { id: 'first_episode', nameKey: 'achievements.firstEpisode.name', descKey: 'achievements.firstEpisode.desc', icon: '🎬', xp: 50 },
  { id: 'episode_50', nameKey: 'achievements.episode50.name', descKey: 'achievements.episode50.desc', icon: '📺', xp: 100 },
  { id: 'episode_100', nameKey: 'achievements.episode100.name', descKey: 'achievements.episode100.desc', icon: '🏆', xp: 200 },
  { id: 'episode_500', nameKey: 'achievements.episode500.name', descKey: 'achievements.episode500.desc', icon: '👑', xp: 500 },
  { id: 'episode_1000', nameKey: 'achievements.episode1000.name', descKey: 'achievements.episode1000.desc', icon: '💎', xp: 1000 },
  { id: 'first_manga', nameKey: 'achievements.firstManga.name', descKey: 'achievements.firstManga.desc', icon: '📖', xp: 50 },
  { id: 'manga_50', nameKey: 'achievements.manga50.name', descKey: 'achievements.manga50.desc', icon: '📚', xp: 100 },
  { id: 'manga_100', nameKey: 'achievements.manga100.name', descKey: 'achievements.manga100.desc', icon: '🏅', xp: 200 },
  { id: 'first_novel', nameKey: 'achievements.firstNovel.name', descKey: 'achievements.firstNovel.desc', icon: '📝', xp: 50 },
  { id: 'novel_50', nameKey: 'achievements.novel50.name', descKey: 'achievements.novel50.desc', icon: '📕', xp: 100 },
  { id: 'first_review', nameKey: 'achievements.firstReview.name', descKey: 'achievements.firstReview.desc', icon: '✍️', xp: 50 },
  { id: 'review_10', nameKey: 'achievements.review10.name', descKey: 'achievements.review10.desc', icon: '⭐', xp: 200 },
  { id: 'first_favorite', nameKey: 'achievements.firstFavorite.name', descKey: 'achievements.firstFavorite.desc', icon: '❤️', xp: 25 },
  { id: 'favorite_25', nameKey: 'achievements.favorite25.name', descKey: 'achievements.favorite25.desc', icon: '💖', xp: 100 },
  { id: 'favorite_100', nameKey: 'achievements.favorite100.name', descKey: 'achievements.favorite100.desc', icon: '💝', xp: 500 },
  { id: 'watch_party', nameKey: 'achievements.watchParty.name', descKey: 'achievements.watchParty.desc', icon: '🎉', xp: 100 },
  { id: 'collector', nameKey: 'achievements.collector.name', descKey: 'achievements.collector.desc', icon: '🗂️', xp: 150 },
]

export const XP_VALUES = {
  WATCH_EPISODE: 10,
  READ_MANGA_CHAPTER: 5,
  READ_NOVEL_CHAPTER: 5,
  WRITE_REVIEW: 25,
  RATE_CONTENT: 5,
  ADD_FAVORITE: 5,
  REMOVE_FAVORITE: -5,
  WRITE_COMMENT: 10,
  LOGIN_STREAK: 50,
  JOIN_WATCH_PARTY: 30,
  CREATE_COLLECTION: 20,
  SUBMIT_LINK: 15,
}

export function xpForLevel(level) {
  return level * level * 100
}

export function levelFromXp(xp) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)))
}

export function xpProgress(xp) {
  const level = levelFromXp(xp)
  const current = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return {
    level,
    currentXp: xp - current,
    neededXp: next - current,
    progress: Math.max(0, Math.min(100, Math.round(((xp - current) / (next - current)) * 100))),
  }
}
