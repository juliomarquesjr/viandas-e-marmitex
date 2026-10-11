/** Apaga as conversas da RO guardadas neste navegador (todas as pessoas). Usado ao sair do sistema. */
export function limparHistoricoRo(): void {
  try {
    const chaves: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const chave = window.localStorage.key(i);
      if (chave && chave.startsWith("ro:chat:v1:")) chaves.push(chave);
    }
    chaves.forEach((chave) => window.localStorage.removeItem(chave));
  } catch {
    /* sem armazenamento: não há o que apagar */
  }
}
