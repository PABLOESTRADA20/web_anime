import LegalPage from '../components/LegalPage'

export default function Privacy() {
  return (
    <LegalPage title="Política de Privacidad">
      <p>
        <strong>Última actualización:</strong> Julio 2026
      </p>

      <h2>1. Información que recopilamos</h2>
      <p>
        Recopilamos la información que nos proporcionas al registrarte: correo electrónico, nombre de usuario y preferencias de idioma.
        También almacenamos tu historial de visualización y listas de anime/manga para mejorar tu experiencia.
      </p>

      <h2>2. Uso de la información</h2>
      <p>Usamos tu información para:</p>
      <ul>
        <li>Personalizar tu experiencia en la plataforma</li>
        <li>Enviar notificaciones push (solo si las activas)</li>
        <li>Mejorar nuestros servicios y recomendaciones</li>
        <li>Cumplir con obligaciones legales</li>
      </ul>

      <h2>3. Servicios de terceros</h2>
      <p>Esta plataforma utiliza los siguientes servicios de terceros:</p>
      <ul>
        <li>
          <strong>Supabase</strong> — autenticación, base de datos y almacenamiento
        </li>
        <li>
          <strong>AniList API</strong> — metadatos de anime y manga
        </li>
        <li>
          <strong>Sentry</strong> — monitoreo de errores
        </li>
        <li>
          <strong>Cloudflare</strong> — hosting y CDN
        </li>
      </ul>
      <p>No compartimos tus datos personales con anunciantes ni vendemos tu información a terceros.</p>

      <h2>4. Cookies</h2>
      <p>
        Utilizamos cookies esenciales para el funcionamiento de la plataforma (sesión, preferencias de tema e idioma). No utilizamos cookies
        de rastreo publicitario.
      </p>

      <h2>5. Contenido de terceros</h2>
      <p>
        AnimeVerse no aloja ningún archivo de video en sus servidores. Todo el contenido multimedia es proporcionado por servicios externos
        y se reproduce mediante iframes o enlaces incrustados. No controlamos ni somos responsables del contenido alojado por terceros.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes solicitar la exportación o eliminación de tus datos en cualquier momento contactándonos a través de los canales indicados en
        el sitio.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Si tienes preguntas sobre esta política, abre un issue en nuestro repositorio de GitHub o utiliza el formulario de contacto en el
        sitio.
      </p>
    </LegalPage>
  )
}
