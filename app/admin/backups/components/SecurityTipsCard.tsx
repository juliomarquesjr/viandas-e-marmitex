import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";

const tips = [
  "Armazene os backups em local seguro e criptografado",
  "Faça backups regularmente (diariamente ou semanalmente)",
  "Teste a restauração periodicamente para garantir que os backups estão funcionando",
  "Mantenha múltiplas cópias dos backups em locais diferentes",
  "Não compartilhe arquivos de backup com pessoas não autorizadas",
];

export function SecurityTipsCard() {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          Recomendações de Segurança
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-amber-800">{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
