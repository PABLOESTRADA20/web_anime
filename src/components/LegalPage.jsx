import { motion } from 'framer-motion'
import SeoHead from './SeoHead'

export default function LegalPage({ title, children }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto py-8">
      <SeoHead title={title} />
      <h1 className="text-2xl font-heading font-bold mb-8">{title}</h1>
      <div className="space-y-4 text-sm text-text-secondary leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-text-primary [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-neon-cyan [&_a]:hover:underline">
        {children}
      </div>
    </motion.div>
  )
}
