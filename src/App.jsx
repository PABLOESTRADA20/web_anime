import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
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
const Characters = lazy(() => import('./pages/Characters'))
const CharacterDetail = lazy(() => import('./pages/CharacterDetail'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Seasonal = lazy(() => import('./pages/Seasonal'))

function Lazy({ children }) {
  return <Suspense fallback={<div className="py-20"><GridSkeleton count={6} /></div>}>{children}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-24 pb-8">
                  <Routes>
                    <Route path="/" element={<Lazy><Home /></Lazy>} />
                    <Route path="/search" element={<Lazy><Search /></Lazy>} />
                    <Route path="/anime/:id" element={<Lazy><AnimeDetail /></Lazy>} />
                    <Route path="/watch/*" element={<Lazy><Watch /></Lazy>} />
                    <Route path="/manga" element={<Lazy><Manga /></Lazy>} />
                    <Route path="/manga/:id/read" element={<Lazy><MangaRead /></Lazy>} />
                    <Route path="/manga/:id" element={<Lazy><MangaDetail /></Lazy>} />
                    <Route path="/characters" element={<Lazy><Characters /></Lazy>} />
                    <Route path="/character/:id" element={<Lazy><CharacterDetail /></Lazy>} />
                    <Route path="/schedule" element={<Lazy><Schedule /></Lazy>} />
                    <Route path="/seasonal" element={<Lazy><Seasonal /></Lazy>} />
                    <Route path="/login" element={<Lazy><Login /></Lazy>} />
                    <Route path="/profile" element={<Lazy><Profile /></Lazy>} />
                    <Route path="*" element={<Lazy><NotFound /></Lazy>} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
