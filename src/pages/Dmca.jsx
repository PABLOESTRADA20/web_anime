import LegalPage from '../components/LegalPage'

export default function Dmca() {
  return (
    <LegalPage title="DMCA — Política de Copyright">
      <p>
        <strong>Última actualización:</strong> Julio 2026
      </p>

      <h2>1. Notificación de infracción</h2>
      <p>
        AnimeVerse respeta los derechos de propiedad intelectual. Si crees que tu contenido protegido por copyright aparece en nuestra
        plataforma sin autorización, puedes enviar una notificación DMCA.
      </p>

      <h2>2. Procedimiento</h2>
      <p>
        Para reportar una infracción, abre un issue en nuestro repositorio de GitHub o contacta a través de los canales del sitio. Incluye:
      </p>
      <ul>
        <li>Identificación de la obra con copyright infringida</li>
        <li>URL específica donde aparece el contenido</li>
        <li>Tu información de contacto y firma (física o electrónica)</li>
        <li>Declaración de buena fe sobre el uso no autorizado</li>
      </ul>

      <h2>3. Contenido de terceros</h2>
      <p>
        AnimeVerse funciona como un agregador de enlaces. No almacenamos archivos de video en nuestros servidores. Todo el contenido
        multimedia es incrustado desde servicios de terceros. En caso de infracción, el contenido será retirado de la plataforma en el menor
        tiempo posible.
      </p>

      <h2>4. Contranotificación</h2>
      <p>
        Si crees que tu contenido fue retirado por error, puedes enviar una contranotificación con los mismos datos requeridos en la sección
        2.
      </p>

      <h2>5. Política de reincidentes</h2>
      <p>Usuarios que infrinjan repetidamente los derechos de copyright serán suspendidos de la plataforma.</p>
    </LegalPage>
  )
}
