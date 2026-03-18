import { CheckCircle } from "lucide-react";
import { SectionLabel } from "./SectionLayout";

const tips = [
  {
    title: "Armazenamento seguro",
    description:
      "Armazene os backups em local seguro e criptografado, preferencialmente fora do servidor principal.",
  },
  {
    title: "Regularidade",
    description:
      "Faça backups regularmente — diariamente para ambientes de produção, semanalmente para ambientes menores.",
  },
  {
    title: "Teste de restauração",
    description:
      "Teste a restauração periodicamente para garantir que os backups estão íntegros e funcionando corretamente.",
  },
  {
    title: "Múltiplas cópias",
    description:
      "Mantenha múltiplas cópias dos backups em locais diferentes (nuvem, HD externo, etc.).",
  },
  {
    title: "Controle de acesso",
    description:
      "Não compartilhe arquivos de backup com pessoas não autorizadas — eles contêm todos os dados do sistema.",
  },
];

export function SecuritySection() {
  return (
    <div>
      <SectionLabel>Recomendações</SectionLabel>

      <div className="divide-y divide-slate-100">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start gap-4 px-8 py-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 flex-shrink-0 mt-0.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{tip.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{tip.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
