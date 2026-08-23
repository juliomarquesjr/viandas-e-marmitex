import RedirectPage from "./redirect/page";

/**
 * A splash é quem decide o destino: ela checa servidor e sessão e navega sozinha
 * — por isso aqui não há mais temporizador.
 */
export default function Home() {
  return <RedirectPage />;
}
