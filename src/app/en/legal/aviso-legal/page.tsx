import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Aviso Legal — Numinia Digital Goods',
  description: 'Aviso legal e información societaria conforme a la LSSI-CE',
};

export default function AvisoLegalPage() {
  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/en/archive" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors no-underline">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Link>
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1>Aviso Legal</h1>
          <p className="text-sm text-gray-500">
            Informaci&oacute;n legal conforme a la Ley 34/2002, de 11 de julio, de Servicios de la
            Sociedad de la Informaci&oacute;n y de Comercio Electr&oacute;nico (LSSI-CE).
          </p>

          <h2>1. Datos identificativos del prestador</h2>
          <table>
            <tbody>
              <tr><td><strong>Denominaci&oacute;n social</strong></td><td>Numen Games S.L.</td></tr>
              <tr><td><strong>NIF</strong></td><td>B70735949</td></tr>
              <tr><td><strong>Domicilio social</strong></td><td>Ca. Chile 10, oficina 239, 28290 Las Rozas de Madrid, Espa&ntilde;a</td></tr>
              <tr><td><strong>Datos registrales</strong></td><td>Inscrita en el Registro Mercantil de Madrid, Tomo 46518, Folio 130, Secci&oacute;n 8, Hoja M-816810</td></tr>
              <tr><td><strong>Correo electr&oacute;nico</strong></td><td><a href="mailto:legal@numengames.com">legal@numengames.com</a></td></tr>
              <tr><td><strong>Sitio web</strong></td><td><a href="https://numinia.store" target="_blank" rel="noopener noreferrer">https://numinia.store</a></td></tr>
            </tbody>
          </table>

          <h2>2. Objeto del sitio web</h2>
          <p>
            Numinia Digital Goods es una plataforma de registro abierto de activos digitales
            bajo licencia CC0 (dominio p&uacute;blico): modelos 3D (GLB), avatares (VRM),
            mundos Hyperfy (HYP), archivos de impresi&oacute;n 3D (STL), audio, v&iacute;deo
            e im&aacute;genes. El c&oacute;digo fuente es MIT y los datos residen en archivos
            abiertos siguiendo la filosof&iacute;a &quot;File Over App&quot;.
          </p>

          <h2>3. Condiciones de uso</h2>
          <p>
            El acceso al sitio web atribuye la condici&oacute;n de usuario e implica la aceptaci&oacute;n
            de las presentes condiciones. Para m&aacute;s detalle, consulte nuestros{' '}
            <a href="/en/legal/terms">T&eacute;rminos y Condiciones</a>.
          </p>

          <h2>4. Propiedad intelectual e industrial</h2>
          <p>
            El c&oacute;digo fuente de la plataforma est&aacute; disponible bajo licencia MIT.
            Los activos digitales curados son CC0 (dominio p&uacute;blico) salvo indicaci&oacute;n
            contraria en cada activo. La marca Numinia, el logotipo (icono Khepri) y la identidad
            visual son propiedad de Numen Games S.L.
          </p>

          <h2>5. Protecci&oacute;n de datos personales</h2>
          <p>
            El tratamiento de datos personales se realiza conforme al Reglamento (UE) 2016/679 (RGPD)
            y la Ley Org&aacute;nica 3/2018 (LOPDGDD). Consulte nuestra{' '}
            <a href="/en/legal/privacy">Pol&iacute;tica de Privacidad</a> para informaci&oacute;n
            detallada sobre la recogida, tratamiento y protecci&oacute;n de sus datos.
          </p>

          <h2>6. Pol&iacute;tica de cookies</h2>
          <p>
            Este sitio web utiliza exclusivamente cookies estrictamente necesarias para el
            funcionamiento de la autenticaci&oacute;n y la seguridad. No se emplean cookies de
            an&aacute;lisis ni publicidad. Consulte nuestra{' '}
            <a href="/en/legal/cookies">Pol&iacute;tica de Cookies</a>.
          </p>

          <h2>7. Exclusi&oacute;n de garant&iacute;as y responsabilidad</h2>
          <p>
            Numen Games S.L. no garantiza la disponibilidad continua del sitio web ni la
            exactitud de los contenidos. No ser&aacute; responsable de da&ntilde;os derivados
            del uso o imposibilidad de uso de la plataforma, ni de los contenidos subidos
            por terceros.
          </p>

          <h2>8. Legislaci&oacute;n aplicable y jurisdicci&oacute;n</h2>
          <p>
            Las presentes condiciones se rigen por la legislaci&oacute;n espa&ntilde;ola.
            Para la resoluci&oacute;n de cualquier controversia, las partes se someten
            a los Juzgados y Tribunales de Madrid, Espa&ntilde;a, con renuncia expresa
            a cualquier otro fuero que pudiera corresponderles.
          </p>

          <h2>9. Contacto</h2>
          <p>
            <a href="mailto:legal@numengames.com">legal@numengames.com</a>
          </p>
        </article>
      </div>
    </div>
  );
}
