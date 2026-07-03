import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { I18nProvider } from './hooks/useI18n'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import MobileBottomNav from './components/MobileBottomNav'
import Footer from './components/Footer'
import UpdatePrompt from './components/UpdatePrompt'
import InstallPrompt from './components/InstallPrompt'
import { GridSkeleton } from './components/Skeletons'

const Home = lazy(() => import('./pages/Home'))
const Search = lazy(() => import('./pages/Search'))
const AnimeDetail = lazy(() => import('./pages/AnimeDetail'))
const Watch = lazy(() => import('./pages/Watch'))
const Login = lazy(() => import('./pages/Login'))
const Profile = lazy(() => import('./pages/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Manga = lazy(() => import('./pages/Manga'))
const MangaDetail = lazy(() => import('./pages/MangaDetail'))
const MangaRead = lazy(() => import('./pages/MangaRead'))
const Novels = lazy(() => import('./pages/Novels'))
const NovelDetail = lazy(() => import('./pages/NovelDetail'))
const NovelRead = lazy(() => import('./pages/NovelRead'))
const Characters = lazy(() => import('./pages/Characters'))
const CharacterDetail = lazy(() => import('./pages/CharacterDetail'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Seasonal = lazy(() => import('./pages/Seasonal'))
const Directory = lazy(() => import('./pages/Directory'))
const Random = lazy(() => import('./pages/Random'))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))
const Studio = lazy(() => import('./pages/Studio'))
const Staff = lazy(() => import('./pages/Staff'))
const Downloads = lazy(() => import('./pages/Downloads'))
const Activity = lazy(() => import('./pages/Activity'))
const Settings = lazy(() => import('./pages/Settings'))
const Admin = lazy(() => import('./pages/Admin'))
const Collections = lazy(() => import('./pages/Collections'))
const CollectionDetail = lazy(() => import('./pages/CollectionDetail'))
const MyMangas = lazy(() => import('./pages/MyMangas'))
const MyNovels = lazy(() => import('./pages/MyNovels'))

function RouteGuard({ children }) {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="py-20">
            <GridSkeleton count={6} />
          </div>
        }>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

function VerifyBanner() {
  const { needsVerification } = useAuth()
  if (!needsVerification) return null
  return (
    <div className="bg-yellow-600/20 border border-yellow-600/30 text-yellow-300 text-xs text-center py-2 px-4">
      Verifica tu correo electrónico para acceder a todas las funciones.
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <I18nProvider>
            <ToastProvider>
              <div className="min-h-screen flex flex-col">
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:text-sm">
                  Saltar al contenido
                </a>
                <VerifyBanner />
                <Navbar />
                <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-4 pt-24 pb-20 sm:pb-8">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <RouteGuard>
                          <Home />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/search"
                      element={
                        <RouteGuard>
                          <Search />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/anime/:id"
                      element={
                        <RouteGuard>
                          <AnimeDetail />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/watch/*"
                      element={
                        <RouteGuard>
                          <Watch />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/manga"
                      element={
                        <RouteGuard>
                          <Manga />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/manga/:id/read"
                      element={
                        <RouteGuard>
                          <MangaRead />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/manga/:id"
                      element={
                        <RouteGuard>
                          <MangaDetail />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/novel"
                      element={
                        <RouteGuard>
                          <Novels />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/novel/:slug/read"
                      element={
                        <RouteGuard>
                          <NovelRead />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/novel/:slug"
                      element={
                        <RouteGuard>
                          <NovelDetail />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/characters"
                      element={
                        <RouteGuard>
                          <Characters />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/character/:id"
                      element={
                        <RouteGuard>
                          <CharacterDetail />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/schedule"
                      element={
                        <RouteGuard>
                          <Schedule />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/seasonal"
                      element={
                        <RouteGuard>
                          <Seasonal />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/directorio"
                      element={
                        <RouteGuard>
                          <Directory />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/aleatorio"
                      element={
                        <RouteGuard>
                          <Random />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/login"
                      element={
                        <RouteGuard>
                          <Login />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <RouteGuard>
                          <Profile />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/profile/:id"
                      element={
                        <RouteGuard>
                          <PublicProfile />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/studio/:id"
                      element={
                        <RouteGuard>
                          <Studio />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/staff/:id"
                      element={
                        <RouteGuard>
                          <Staff />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/downloads"
                      element={
                        <RouteGuard>
                          <Downloads />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/activity"
                      element={
                        <RouteGuard>
                          <Activity />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <RouteGuard>
                          <Settings />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <RouteGuard>
                          <Admin />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/collections"
                      element={
                        <RouteGuard>
                          <Collections />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/collections/:id"
                      element={
                        <RouteGuard>
                          <CollectionDetail />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/mis-mangas"
                      element={
                        <RouteGuard>
                          <MyMangas />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="/mis-novelas"
                      element={
                        <RouteGuard>
                          <MyNovels />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="*"
                      element={
                        <RouteGuard>
                          <NotFound />
                        </RouteGuard>
                      }
                    />
                  </Routes>
                </main>
                <MobileBottomNav />
                <InstallPrompt />
                <Footer />
                <UpdatePrompt />
              </div>
            </ToastProvider>
          </I18nProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
