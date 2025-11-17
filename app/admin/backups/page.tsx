"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import {
  AlertCircle,
  CheckCircle,
  CloudDownload,
  Database,
  Download,
  FileCheck,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function BackupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [restoreConfirmationText, setRestoreConfirmationText] = useState("");
  const [autoDownload, setAutoDownload] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false); // Por padrão desativado
  const [isDragging, setIsDragging] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [progressType, setProgressType] = useState<"backup" | "restore">("backup");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Verificar autenticação e permissões
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (session.user?.role !== "admin") {
      router.push("/unauthorized");
      return;
    }
  }, [session, status, router]);

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true);
      setProgressType("backup");
      setProgressMessage("Iniciando criação do backup...");
      setShowProgressModal(true);
      
      const response = await fetch("/api/backups/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        try {
          const error = await response.json();
          setShowProgressModal(false);
          throw new Error(error.error || "Erro ao criar backup");
        } catch (e) {
          setShowProgressModal(false);
          throw new Error("Erro ao criar backup");
        }
      }

      setProgressMessage("Backup criado! Preparando download...");

      // Se autoDownload estiver ativado, fazer download automático
      if (autoDownload) {
        // Obter o nome do arquivo do header Content-Disposition
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = "backup-viandas.sql";
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        // Criar blob e fazer download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setProgressMessage("Download concluído!");
        setTimeout(() => {
          setShowProgressModal(false);
        }, 500);
        
        showToast(
          "Backup criado com sucesso!",
          "success",
          "Download iniciado",
          "O arquivo de backup foi baixado com sucesso."
        );
      } else {
        setProgressMessage("Backup concluído!");
        setTimeout(() => {
          setShowProgressModal(false);
        }, 500);
        
        // Se não for download automático, apenas mostrar mensagem de sucesso
        showToast(
          "Backup criado com sucesso!",
          "success",
          "Backup concluído",
          "O backup foi criado. Ative o download automático para baixar o arquivo."
        );
      }
    } catch (error: any) {
      console.error("Erro ao criar backup:", error);
      setShowProgressModal(false);
      showToast(
        "Erro ao criar backup",
        "error",
        "Erro",
        error.message || "Não foi possível criar o backup"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      showToast("Selecione um arquivo de backup", "error");
      return;
    }

    if (!restoreConfirmed || restoreConfirmationText !== "RESTAURAR") {
      showToast("Digite 'RESTAURAR' para confirmar", "error");
      return;
    }

    try {
      setIsRestoring(true);
      setProgressType("restore");
      setProgressMessage("Iniciando restauração do backup...");
      setShowProgressModal(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("confirmed", "true");
      formData.append("autoBackup", autoBackup ? "true" : "false");

      setProgressMessage("Criando backup automático...");
      if (autoBackup) {
        setProgressMessage("Criando backup automático antes da restauração...");
      } else {
        setProgressMessage("Preparando restauração...");
      }

      const response = await fetch("/api/backups/restore", {
        method: "POST",
        body: formData,
      });

      setProgressMessage("Restaurando dados do banco de dados...");
      
      const data = await response.json();

      if (!response.ok) {
        setShowProgressModal(false);
        throw new Error(data.error || "Erro ao restaurar backup");
      }

      setProgressMessage("Restauração concluída! Finalizando...");

      // Se houver backup automático, oferecer download
      if (data.autoBackup && data.autoBackup.data && data.autoBackup.filename) {
        setProgressMessage("Baixando backup automático...");
        try {
          // Converter data URL para blob
          const response = await fetch(data.autoBackup.data);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.autoBackup.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          setProgressMessage("Restauração concluída com sucesso!");
          setTimeout(() => {
            setShowProgressModal(false);
          }, 1000);
          
          showToast(
            "Backup restaurado com sucesso!",
            "success",
            "Backup automático baixado",
            "Um backup automático foi criado antes da restauração e foi baixado automaticamente."
          );
        } catch (error) {
          console.error("Erro ao baixar backup automático:", error);
          setProgressMessage("Restauração concluída!");
          setTimeout(() => {
            setShowProgressModal(false);
          }, 500);
          
          showToast(
            "Backup restaurado com sucesso!",
            "success",
            "Aviso",
            "Backup restaurado, mas houve um problema ao baixar o backup automático."
          );
        }
      } else {
        setProgressMessage("Restauração concluída com sucesso!");
        setTimeout(() => {
          setShowProgressModal(false);
        }, 1000);
        
        showToast(
          "Backup restaurado com sucesso!",
          "success"
        );
      }

      // Limpar formulário
      setIsRestoreDialogOpen(false);
      setSelectedFile(null);
      setRestoreConfirmed(false);
      setRestoreConfirmationText("");
      setIsDragging(false);
      setAutoBackup(false); // Resetar para padrão (desativado)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Erro ao restaurar backup:", error);
      setShowProgressModal(false);
      showToast(
        "Erro ao restaurar backup",
        "error",
        "Erro",
        error.message || "Não foi possível restaurar o backup"
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".sql")) {
      showToast("Arquivo deve ser .sql", "error");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast("Arquivo muito grande. Máximo: 100MB", "error");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Drag and Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho Moderno */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3BhdHRlcm4pIi8+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <Database className="h-10 w-10" />
              Gerenciamento de Backups
            </h1>
            <p className="text-blue-100 text-lg">
              Crie e restaure backups do seu banco de dados com segurança
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CloudDownload className="h-5 w-5" />
                  Criar Backup
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card de Informações */}
        <Card className="shadow-lg border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Info className="h-6 w-6 text-blue-600" />
              Informações sobre o Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">O que é incluído</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Todas as tabelas, dados, índices e estrutura completa do banco de dados.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <Database className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">Formato do arquivo</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Arquivo SQL padrão do PostgreSQL, compatível com pg_restore e psql.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                <Download className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">Download</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {autoDownload 
                      ? "O arquivo será baixado automaticamente após a criação."
                      : "O backup será criado, mas não será baixado automaticamente."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Restauração */}
        <Card className="shadow-lg border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Upload className="h-6 w-6 text-green-600" />
              Restaurar Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Faça upload de um arquivo de backup (.sql) para restaurar o banco de dados.
              </p>

              {/* Switch para Backup Automático */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        Backup Automático
                      </p>
                      <p className="text-xs text-blue-800">
                        {autoBackup 
                          ? "Um backup automático será criado antes da restauração."
                          : "Nenhum backup automático será criado antes da restauração."}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={autoBackup}
                    onCheckedChange={setAutoBackup}
                    className="flex-shrink-0"
                  />
                </div>
              </div>

              <Button
                onClick={() => setIsRestoreDialogOpen(true)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Upload className="h-4 w-4 mr-2" />
                Restaurar Backup
              </Button>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Atenção:</strong> A restauração substituirá todos os dados atuais.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aviso de Segurança */}
      <Card className="shadow-lg border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-3 text-lg">
                Recomendações de Segurança
              </h3>
              <ul className="space-y-2 text-sm text-orange-800">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Armazene os backups em local seguro e criptografado</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Faça backups regularmente (diariamente ou semanalmente)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Teste a restauração periodicamente para garantir que os backups estão funcionando</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Mantenha múltiplas cópias dos backups em locais diferentes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Não compartilhe arquivos de backup com pessoas não autorizadas</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Restauração - Padrão do Sistema */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-orange-600" />
              Restaurar Backup
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-1 text-sm">
              Selecione o arquivo de backup (.sql) para restaurar. Um backup automático será criado antes da restauração.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Aviso de Segurança Elegante */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-red-900 mb-1">
                    ⚠️ Operação Irreversível
                  </p>
                  <p className="text-xs text-red-800 leading-relaxed">
                    Esta operação substituirá <strong>TODOS</strong> os dados atuais do banco de dados.
                  </p>
                </div>
              </div>
            </div>

            {/* Área de Drag and Drop Elegante */}
            <div className="space-y-2">
              <Label htmlFor="backup-file" className="text-sm font-semibold text-gray-900">
                Arquivo de Backup (.sql)
              </Label>
              
              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg transition-all duration-300 shadow-sm
                  ${isDragging 
                    ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.01]' 
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:shadow-md'
                  }
                  ${selectedFile ? 'border-green-500 bg-green-50 p-3' : 'p-6'}
                `}
              >
                <input
                  id="backup-file"
                  type="file"
                  accept=".sql"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-green-200">
                      <FileCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-gray-900 truncate mb-0.5">
                        {selectedFile.name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1 w-1 rounded-full bg-green-500" />
                        <p className="text-xs text-gray-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className={`p-3 rounded-xl bg-white shadow-sm transition-all ${
                      isDragging ? 'scale-105 bg-blue-100' : ''
                    }`}>
                      <Upload className={`h-6 w-6 transition-colors ${
                        isDragging ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {isDragging ? 'Solte o arquivo' : 'Arraste o arquivo aqui'}
                      </p>
                      <p className="text-xs text-gray-500">ou</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white hover:bg-gray-50 shadow-sm text-xs"
                      >
                        <FileText className="h-3 w-3 mr-1.5" />
                        Selecionar arquivo
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                      <FileText className="h-3 w-3" />
                      <span>.sql • Máx. 100MB</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmação Elegante */}
            <div className="space-y-2">
              <Label htmlFor="confirm-restore" className="text-sm font-semibold text-gray-900">
                Confirme digitando <span className="text-red-600 font-bold">RESTAURAR</span>:
              </Label>
              <Input
                id="confirm-restore"
                type="text"
                value={restoreConfirmationText}
                onChange={(e) => {
                  setRestoreConfirmationText(e.target.value);
                  setRestoreConfirmed(e.target.value === "RESTAURAR");
                }}
                placeholder="RESTAURAR"
                className={`text-sm transition-all ${
                  restoreConfirmed 
                    ? "border-green-500 bg-green-50 focus:ring-green-500 shadow-sm" 
                    : "border-gray-300 focus:border-gray-400"
                }`}
              />
              {restoreConfirmed && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Confirmação válida</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsRestoreDialogOpen(false);
                setSelectedFile(null);
                setRestoreConfirmationText("");
                setRestoreConfirmed(false);
                setIsDragging(false);
                setAutoBackup(false); // Resetar para padrão (desativado)
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              disabled={isRestoring}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRestoreBackup}
              disabled={!selectedFile || !restoreConfirmed || isRestoring}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Restaurar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Progresso */}
      <Dialog open={showProgressModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              progressType === "backup" ? "bg-blue-100" : "bg-orange-100"
            }`}>
              {progressType === "backup" ? (
                <Download className="h-6 w-6 text-blue-600" />
              ) : (
                <Upload className="h-6 w-6 text-orange-600" />
              )}
            </div>
            <DialogTitle className="text-center">
              {progressType === "backup" ? "Criando Backup" : "Restaurando Backup"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {progressMessage || "Processando..."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            {/* Barra de Progresso Elegante */}
            <div className="space-y-3">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                <div 
                  className={`absolute h-full w-1/3 rounded-full shadow-lg ${
                    progressType === "backup" 
                      ? "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600" 
                      : "bg-gradient-to-r from-orange-500 via-orange-600 to-red-600"
                  }`}
                  style={{
                    animation: "shimmer 1.5s ease-in-out infinite",
                    boxShadow: progressType === "backup" 
                      ? "0 0 10px rgba(59, 130, 246, 0.5)" 
                      : "0 0 10px rgba(249, 115, 22, 0.5)",
                  }}
                />
              </div>
              
              {/* Indicador de Status */}
              <div className="flex items-center justify-center gap-2">
                <div className={`h-2 w-2 rounded-full animate-pulse ${
                  progressType === "backup" ? "bg-blue-500" : "bg-orange-500"
                }`} />
                <span className="text-xs font-medium text-gray-500">
                  Processando...
                </span>
              </div>
            </div>

            {/* Mensagem Informativa */}
            <div className="flex items-start justify-center gap-3 rounded-lg bg-gray-50 p-4 border border-gray-200">
              <Loader2 className={`h-5 w-5 animate-spin mt-0.5 flex-shrink-0 ${
                progressType === "backup" ? "text-blue-600" : "text-orange-600"
              }`} />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">
                  Aguarde, isso pode levar alguns instantes
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Não feche esta janela durante o processo
                </p>
              </div>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes shimmer {
                0% {
                  transform: translateX(-100%);
                }
                100% {
                  transform: translateX(400%);
                }
              }
            `
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
