import { motion } from 'framer-motion'

export default function ErrorState({ message = 'Algo salió mal', retry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">⚠️</span>
      <p className="text-red-400 text-lg max-w-md">{message}</p>
      {retry && (
        <button onClick={retry} className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors">
          Reintentar
        </button>
      )}
    </motion.div>
  )
}
