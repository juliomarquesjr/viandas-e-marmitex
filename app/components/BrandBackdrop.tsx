/**
 * Fundo das telas de pré-login (splash e login).
 *
 * "Mesa posta": pratos vistos de cima, cortados pelas bordas, em opacidade
 * muito baixa — dá estrutura à composição sem parecer painel de dashboard.
 * Sobre eles, um grão fino traz textura artesanal. Tudo em SVG/CSS, sem imagem.
 */
export function BrandBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -top-56 left-1/2 h-[720px] w-[1100px] -translate-x-1/2"
        style={{
          background: "radial-gradient(circle at 50% 50%, var(--auth-glow), transparent 66%)",
        }}
      />

      <svg
        className="auth-table-backdrop absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <g stroke="var(--auth-ring)" strokeWidth="1.25">
          {/* prato principal, atrás do conteúdo */}
          <circle cx="1062" cy="612" r="404" />
          <circle cx="1062" cy="612" r="333" />
          <circle cx="1062" cy="612" r="267" />
          <circle cx="1062" cy="612" r="206" />

          {/* prato cortado pelo canto superior esquerdo */}
          <circle cx="248" cy="138" r="301" />
          <circle cx="248" cy="138" r="237" />
          <circle cx="248" cy="138" r="179" />

          {/* prato pequeno na base */}
          <circle cx="152" cy="862" r="188" />
          <circle cx="152" cy="862" r="139" />
          <circle cx="152" cy="862" r="95" />
        </g>
      </svg>

      <svg
        className="absolute inset-0 h-full w-full"
        style={{ opacity: "var(--auth-grain-opacity)" }}
      >
        <filter id="brand-backdrop-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#brand-backdrop-grain)" />
      </svg>
    </div>
  );
}
