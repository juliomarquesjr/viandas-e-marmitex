// Tipos de mensagem que o sistema envia, com o texto padrão de cada um. Puro: serve ao servidor e às telas.
//
// Para criar um tipo novo: acrescente uma entrada em MESSAGE_TYPES (variáveis e textos padrão) e, onde o
// fato acontece, chame `sendCustomerMessage`. O gerenciador de mensagens já mostra e permite editar.

export type MessageChannel = 'whatsapp' | 'email';
export const MESSAGE_CHANNELS: MessageChannel[] = ['whatsapp', 'email'];
export const CHANNEL_LABEL: Record<MessageChannel, string> = { whatsapp: 'WhatsApp', email: 'E-mail' };

export interface MessageVariable {
  key: string;
  label: string;
  /** Valor de exemplo para a prévia e para a mensagem de teste. */
  sample: string;
  /** Dado sensível: aparece na mensagem, mas nunca é gravado no histórico. */
  sensitive?: boolean;
  /** Preenchida pelo sistema com o conteúdo do dia (ex.: o cardápio), não por quem envia. */
  auto?: boolean;
}

export interface ChannelDefault {
  subject?: string;
  body: string;
}

export interface MessageTypeDef {
  key: string;
  name: string;
  description: string;
  group: string;
  variables: MessageVariable[];
  /** Variáveis que o texto precisa ter para a mensagem fazer sentido. */
  required: string[];
  /** Mensagem de que o cliente depende (ex.: recuperar senha): não pode ser desligada. */
  alwaysOn?: boolean;
  defaults: Partial<Record<MessageChannel, ChannelDefault>>;
}

export const MESSAGE_LIMITS = { BODY_WHATSAPP: 1000, BODY_EMAIL: 5000, SUBJECT: 150, SIGNATURE: 200 } as const;

const STORE: MessageVariable = { key: 'loja', label: 'Nome da loja', sample: 'Sabores de Casa' };
const NAME: MessageVariable = { key: 'nome', label: 'Primeiro nome do cliente', sample: 'Maria' };

const SAMPLE_MENU = `📅 *Quinta-feira, 09/10*

*Pratos principais*
• Feijoada completa ⭐
• Frango assado com batatas
• Lasanha de berinjela (vegetariano)

*Acompanhamentos*
• Arroz branco
• Couve refogada
• Farofa`;

const SAMPLE_ORDERS = `🧾 *Sexta-feira, 09/10*
• 1× Feijoada completa
• 2× Suco de laranja
💰 Total: *R$ 37,00*`;

export const MESSAGE_TYPES: MessageTypeDef[] = [
  {
    key: 'customer_password',
    name: 'Senha de acesso',
    description: 'Enviada ao cliente quando o administrador gera ou reenvia a senha dele. A senha vem na mensagem e não é guardada no histórico.',
    group: 'Acesso do cliente',
    variables: [
      NAME,
      { key: 'usuario', label: 'Usuário para entrar (e-mail ou telefone)', sample: 'maria.souza@email.com' },
      { key: 'senha', label: 'Senha gerada', sample: 'kp7mrx4a', sensitive: true },
      STORE,
      { key: 'link_app', label: 'Endereço do aplicativo', sample: 'https://saboresdecasa.com.br' },
    ],
    required: ['senha'],
    defaults: {
      whatsapp: {
        body: 'Olá, {nome}! 👋\n\nBoas-vindas ao *{loja}*! 🎉 Seu acesso ao aplicativo já está pronto.\n\n👤 Usuário: *{usuario}*\n🔑 Senha: *{senha}*\n\n📲 Entre em {link_app}\n\n🔒 Por segurança, você escolhe uma senha só sua no primeiro acesso.\n\nQualquer dúvida, é só responder esta mensagem. 😊',
      },
      email: {
        subject: 'Seu acesso ao aplicativo - {loja}',
        body: 'Olá, {nome}! 👋\n\nBoas-vindas ao *{loja}*! Seu acesso ao aplicativo já está pronto.\n\nUsuário: *{usuario}*\nSenha: *{senha}*\n\nEntre em {link_app} e, por segurança, escolha uma senha só sua no primeiro acesso. 🔒\n\nQualquer dúvida, é só responder este e-mail. 😊',
      },
    },
  },
  {
    key: 'customer_password_reset',
    name: 'Link para redefinir senha',
    description: 'Enviado por e-mail quando o próprio cliente pede para redefinir a senha em "Esqueci minha senha".',
    group: 'Acesso do cliente',
    variables: [
      NAME,
      { key: 'link', label: 'Link para criar a nova senha', sample: 'https://…/reset-password?token=…', sensitive: true },
      { key: 'validade', label: 'Validade do link, em minutos', sample: '30' },
      STORE,
    ],
    required: ['link'],
    alwaysOn: true,
    defaults: {
      email: {
        subject: 'Redefinição de senha - {loja}',
        body: 'Olá, {nome}! 👋\n\nRecebemos um pedido para redefinir a senha da sua conta no *{loja}*. Para escolher uma nova senha, é só abrir o link abaixo:\n\n🔑 {link}\n\n⏱️ O link vale por {validade} minutos e só pode ser usado uma vez.\n\nNão foi você? Pode ignorar este e-mail: sua senha continua a mesma. 🔒',
      },
    },
  },
  {
    key: 'daily_menu',
    name: 'Cardápio do dia',
    description: 'Enviado pelo WhatsApp, em massa ou para um cliente, a partir de Clientes. Leva o cardápio publicado de hoje e o link da área do cliente.',
    group: 'Cardápio',
    variables: [
      NAME,
      STORE,
      { key: 'cardapio', label: 'Cardápio publicado de hoje, organizado por seção', sample: SAMPLE_MENU, auto: true },
      { key: 'link_app', label: 'Endereço da área do cliente', sample: 'https://saboresdecasa.com.br' },
    ],
    required: ['cardapio'],
    defaults: {
      whatsapp: {
        body: 'Olá, {nome}! 😋\n\nChegou o cardápio de hoje do *{loja}*:\n\n{cardapio}\n\n🍽️ Veja mais detalhes e acompanhe tudo pelo aplicativo:\n{link_app}',
      },
    },
  },
  {
    key: 'customer_orders',
    name: 'Resumo das compras',
    description: 'Enviado pelo WhatsApp, pelo administrador, a um cliente: as compras de um ou mais dias (até 5), com os itens e o total de cada dia.',
    group: 'Ficha do cliente',
    variables: [
      NAME,
      STORE,
      { key: 'compras', label: 'Compras dos dias escolhidos, com itens e total', sample: SAMPLE_ORDERS, auto: true },
      { key: 'link_app', label: 'Endereço da área do cliente', sample: 'https://saboresdecasa.com.br' },
    ],
    required: ['compras'],
    defaults: {
      whatsapp: {
        body: 'Olá, {nome}! 😊\n\nAqui está o resumo das suas compras no *{loja}*:\n\n{compras}\n\n📲 Veja o histórico completo no aplicativo:\n{link_app}\n\nQualquer dúvida, é só responder esta mensagem. 🙏',
      },
    },
  },
  {
    key: 'customer_balance',
    name: 'Saldo da ficha',
    description: 'Enviado pelo WhatsApp, pelo administrador, a um cliente: o saldo da ficha, seja valor a pagar, crédito ou ficha em dia.',
    group: 'Ficha do cliente',
    variables: [
      NAME,
      STORE,
      { key: 'saldo', label: 'Saldo da ficha, sem sinal', sample: 'R$ 127,70', auto: true },
      { key: 'situacao', label: 'A frase do saldo (a pagar, crédito ou em dia)', sample: '💳 Sua ficha está com *R$ 127,70* em aberto.', auto: true },
      { key: 'link_app', label: 'Endereço da área do cliente', sample: 'https://saboresdecasa.com.br' },
    ],
    required: ['situacao'],
    defaults: {
      whatsapp: {
        body: 'Olá, {nome}! 😊\n\nPassando para avisar sobre a sua ficha no *{loja}*:\n\n{situacao}\n\n📲 Veja o extrato completo no aplicativo:\n{link_app}\n\nQualquer dúvida, é só responder esta mensagem. 🙏',
      },
    },
  },
];

/** Aparecem no gerenciador como "em breve" (ainda não enviam nada). */
export const UPCOMING_MESSAGES: { group: string; names: string[] }[] = [
  { group: 'Pedidos', names: ['Pedido aceito', 'Pedido recusado', 'Pronto para retirar'] },
  { group: 'Financeiro', names: ['Pagamento confirmado', 'Lembrete de saldo'] },
];

export const getMessageType = (key: string) => MESSAGE_TYPES.find((t) => t.key === key) ?? null;
export const isMessageChannel = (value: unknown): value is MessageChannel => value === 'whatsapp' || value === 'email';
