import { onRequest as __api_mangadex_js_onRequest } from "C:\\Users\\pablo\\anime-app\\functions\\api\\mangadex.js"
import { onRequest as __api_proxy_js_onRequest } from "C:\\Users\\pablo\\anime-app\\functions\\api\\proxy.js"

export const routes = [
    {
      routePath: "/api/mangadex",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_mangadex_js_onRequest],
    },
  {
      routePath: "/api/proxy",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_proxy_js_onRequest],
    },
  ]