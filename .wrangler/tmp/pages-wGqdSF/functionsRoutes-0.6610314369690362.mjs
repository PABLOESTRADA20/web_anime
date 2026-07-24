import { onRequest as __api_collections__id__items__itemId__js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\collections\\[id]\\items\\[itemId].js"
import { onRequest as __api_collections__id__items_index_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\collections\\[id]\\items\\index.js"
import { onRequest as __api_comments__id__likes_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\comments\\[id]\\likes.js"
import { onRequest as __api_reviews__id__votes_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\reviews\\[id]\\votes.js"
import { onRequest as __api_admin_bootstrap_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\admin\\bootstrap.js"
import { onRequest as __api_admin_check_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\admin\\check.js"
import { onRequest as __api_admin_moderation_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\admin\\moderation.js"
import { onRequest as __api_anime_favorites_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\anime\\favorites.js"
import { onRequest as __api_anime_history_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\anime\\history.js"
import { onRequest as __api_anime_lists_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\anime\\lists.js"
import { onRequest as __api_anime_ratings_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\anime\\ratings.js"
import { onRequest as __api_anime_watchlist_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\anime\\watchlist.js"
import { onRequest as __api_manga_favorites_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\manga\\favorites.js"
import { onRequest as __api_manga_history_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\manga\\history.js"
import { onRequest as __api_manga_lists_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\manga\\lists.js"
import { onRequest as __api_novel_favorites_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\novel\\favorites.js"
import { onRequest as __api_novel_history_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\novel\\history.js"
import { onRequest as __api_novel_lists_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\novel\\lists.js"
import { onRequest as __api_novel_ratings_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\novel\\ratings.js"
import { onRequest as __api_collections__id__index_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\collections\\[id]\\index.js"
import { onRequest as __api_comments__id__index_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\comments\\[id]\\index.js"
import { onRequest as __api_reviews__id__index_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\reviews\\[id]\\index.js"
import { onRequest as __api_ai_recommend_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\ai-recommend.js"
import { onRequest as __api_ai_test_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\ai-test.js"
import { onRequest as __api_check_site_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\check-site.js"
import { onRequest as __api_collections_index_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\collections\\index.js"
import { onRequest as __api_comments_index_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\comments\\index.js"
import { onRequest as __api_follows_index_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\follows\\index.js"
import { onRequest as __api_mangadex_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\mangadex.js"
import { onRequest as __api_notification_preferences_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\notification-preferences.js"
import { onRequest as __api_novels_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\novels.js"
import { onRequest as __api_profile_index_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\profile\\index.js"
import { onRequest as __api_proxy_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\proxy.js"
import { onRequest as __api_push_subscriptions_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\push-subscriptions.js"
import { onRequest as __api_reviews_index_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\reviews\\index.js"
import { onRequest as __api_translate_subtitles_js_onRequest } from "C:\\Users\\pablo\\OneDrive\\Desktop\\anime-app\\functions\\api\\translate-subtitles.js"

export const routes = [
    {
      routePath: "/api/collections/:id/items/:itemId",
      mountPath: "/api/collections/:id/items",
      method: "",
      middlewares: [],
      modules: [__api_collections__id__items__itemId__js_onRequest],
    },
  {
      routePath: "/api/collections/:id/items",
      mountPath: "/api/collections/:id/items",
      method: "",
      middlewares: [],
      modules: [__api_collections__id__items_index_js_onRequest],
    },
  {
      routePath: "/api/comments/:id/likes",
      mountPath: "/api/comments/:id",
      method: "",
      middlewares: [],
      modules: [__api_comments__id__likes_js_onRequest],
    },
  {
      routePath: "/api/reviews/:id/votes",
      mountPath: "/api/reviews/:id",
      method: "",
      middlewares: [],
      modules: [__api_reviews__id__votes_js_onRequest],
    },
  {
      routePath: "/api/admin/bootstrap",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_bootstrap_js_onRequest],
    },
  {
      routePath: "/api/admin/check",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_check_js_onRequest],
    },
  {
      routePath: "/api/admin/moderation",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_moderation_js_onRequest],
    },
  {
      routePath: "/api/anime/favorites",
      mountPath: "/api/anime",
      method: "",
      middlewares: [],
      modules: [__api_anime_favorites_js_onRequest],
    },
  {
      routePath: "/api/anime/history",
      mountPath: "/api/anime",
      method: "",
      middlewares: [],
      modules: [__api_anime_history_js_onRequest],
    },
  {
      routePath: "/api/anime/lists",
      mountPath: "/api/anime",
      method: "",
      middlewares: [],
      modules: [__api_anime_lists_js_onRequest],
    },
  {
      routePath: "/api/anime/ratings",
      mountPath: "/api/anime",
      method: "",
      middlewares: [],
      modules: [__api_anime_ratings_js_onRequest],
    },
  {
      routePath: "/api/anime/watchlist",
      mountPath: "/api/anime",
      method: "",
      middlewares: [],
      modules: [__api_anime_watchlist_js_onRequest],
    },
  {
      routePath: "/api/manga/favorites",
      mountPath: "/api/manga",
      method: "",
      middlewares: [],
      modules: [__api_manga_favorites_js_onRequest],
    },
  {
      routePath: "/api/manga/history",
      mountPath: "/api/manga",
      method: "",
      middlewares: [],
      modules: [__api_manga_history_js_onRequest],
    },
  {
      routePath: "/api/manga/lists",
      mountPath: "/api/manga",
      method: "",
      middlewares: [],
      modules: [__api_manga_lists_js_onRequest],
    },
  {
      routePath: "/api/novel/favorites",
      mountPath: "/api/novel",
      method: "",
      middlewares: [],
      modules: [__api_novel_favorites_js_onRequest],
    },
  {
      routePath: "/api/novel/history",
      mountPath: "/api/novel",
      method: "",
      middlewares: [],
      modules: [__api_novel_history_js_onRequest],
    },
  {
      routePath: "/api/novel/lists",
      mountPath: "/api/novel",
      method: "",
      middlewares: [],
      modules: [__api_novel_lists_js_onRequest],
    },
  {
      routePath: "/api/novel/ratings",
      mountPath: "/api/novel",
      method: "",
      middlewares: [],
      modules: [__api_novel_ratings_js_onRequest],
    },
  {
      routePath: "/api/collections/:id",
      mountPath: "/api/collections/:id",
      method: "",
      middlewares: [],
      modules: [__api_collections__id__index_js_onRequest],
    },
  {
      routePath: "/api/comments/:id",
      mountPath: "/api/comments/:id",
      method: "",
      middlewares: [],
      modules: [__api_comments__id__index_js_onRequest],
    },
  {
      routePath: "/api/reviews/:id",
      mountPath: "/api/reviews/:id",
      method: "",
      middlewares: [],
      modules: [__api_reviews__id__index_js_onRequest],
    },
  {
      routePath: "/api/ai-recommend",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_ai_recommend_js_onRequest],
    },
  {
      routePath: "/api/ai-test",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_ai_test_js_onRequest],
    },
  {
      routePath: "/api/check-site",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_check_site_js_onRequest],
    },
  {
      routePath: "/api/collections",
      mountPath: "/api/collections",
      method: "",
      middlewares: [],
      modules: [__api_collections_index_js_onRequest],
    },
  {
      routePath: "/api/comments",
      mountPath: "/api/comments",
      method: "",
      middlewares: [],
      modules: [__api_comments_index_js_onRequest],
    },
  {
      routePath: "/api/follows",
      mountPath: "/api/follows",
      method: "",
      middlewares: [],
      modules: [__api_follows_index_js_onRequest],
    },
  {
      routePath: "/api/mangadex",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_mangadex_js_onRequest],
    },
  {
      routePath: "/api/notification-preferences",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_notification_preferences_js_onRequest],
    },
  {
      routePath: "/api/novels",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_novels_js_onRequest],
    },
  {
      routePath: "/api/profile",
      mountPath: "/api/profile",
      method: "",
      middlewares: [],
      modules: [__api_profile_index_js_onRequest],
    },
  {
      routePath: "/api/proxy",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_proxy_js_onRequest],
    },
  {
      routePath: "/api/push-subscriptions",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_push_subscriptions_js_onRequest],
    },
  {
      routePath: "/api/reviews",
      mountPath: "/api/reviews",
      method: "",
      middlewares: [],
      modules: [__api_reviews_index_js_onRequest],
    },
  {
      routePath: "/api/translate-subtitles",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_translate_subtitles_js_onRequest],
    },
  ]