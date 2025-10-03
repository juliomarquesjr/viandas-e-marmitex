import type { Content } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

import { createCleanResponse } from "@/lib/ai/data-formatter";
import { getRoModel } from "@/lib/ai/gemini";
import { FINAL_RESPONSE_GUIDE } from "@/lib/ai/ro/constants";
import { generateFeedbackPrompt } from "@/lib/ai/ro/feedback-prompt";
import {
    applySafeLimit,
    formatRowsForModel,
    normalizeRowValue,
    quoteIdentifiers,
    validateSelectQuery
} from "@/lib/ai/sql-utils";
import { validatePostgreSQL } from "@/lib/ai/sql-validator";
import prisma from "@/lib/prisma";

const MAX_HISTORY_MESSAGES = 12;

interface ClientMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

type AnalysisAction =
  | { action: "respond"; message: string }
  | { action: "query"; sql: string; reason?: string };

function toGeminiContent(message: ClientMessage): Content {
  const role = message.role === "assistant" ? "model" : "user";
  return {
    role,
    parts: [{ text: message.content }],
  };
}

function sanitizeMessages(messages: unknown[]): ClientMessage[] {
  return messages
    .filter((msg): msg is ClientMessage => {
      if (!msg || typeof msg !== "object") return false;
      const role = (msg as ClientMessage).role;
      const content = (msg as ClientMessage).content;
      if (typeof content !== "string") return false;
      if (!content.trim()) return false;
      if (role !== "user" && role !== "assistant" && role !== "system") return false;
      return true;
    })
    .map((msg) => ({
      role: msg.role,
      content: msg.content.trim().slice(0, 4000),
    }))
    .slice(-MAX_HISTORY_MESSAGES);
}

function extractJson(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
  return cleaned;
}

function parseAnalysisAction(raw: string): AnalysisAction {
  try {
    const parsed = JSON.parse(extractJson(raw));
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Resposta vazia");
    }
    if (parsed.action === "respond" && typeof parsed.message === "string") {
      return { action: "respond", message: parsed.message };
    }
    if (parsed.action === "query" && typeof parsed.sql === "string") {
      return {
        action: "query",
        sql: parsed.sql,
        reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
      };
    }
    throw new Error("Formato de ação inválido");
  } catch (error) {
    throw new Error(`Não consegui interpretar a resposta do modelo: ${(error as Error).message}`);
  }
}

function normalizeRows(rows: unknown[]): Array<Record<string, unknown>> {
  return rows.map((row) => {
    if (!row || typeof row !== "object") {
      return { valor: normalizeRowValue(row) };
    }
    return normalizeRowValue(row) as Record<string, unknown>;
  });
}

function isColumnMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeError = error as { code?: string; meta?: unknown; message?: string };
  if (maybeError.code !== "P2010") {
    return false;
  }
  const meta = maybeError.meta as Record<string, unknown> | undefined;
  const metaMessage = typeof meta?.message === "string" ? (meta.message as string) : null;
  const message = metaMessage ?? maybeError.message ?? "";
  return /column\s+"?.+"?\s+does not exist/i.test(message);
}

function isUnknownFunctionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeError = error as { code?: string; meta?: unknown; message?: string };
  if (maybeError.code !== "P2010") {
    return false;
  }
  const meta = maybeError.meta as Record<string, unknown> | undefined;
  const metaMessage = typeof meta?.message === "string" ? (meta.message as string) : null;
  const message = metaMessage ?? maybeError.message ?? "";
  return /function\s+.+\s+does not exist/i.test(message);
}

function isDateFunctionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeError = error as { code?: string; meta?: unknown; message?: string };
  if (maybeError.code !== "P2010") {
    return false;
  }
  const meta = maybeError.meta as Record<string, unknown> | undefined;
  const metaMessage = typeof meta?.message === "string" ? (meta.message as string) : null;
  const message = metaMessage ?? maybeError.message ?? "";
  return /function\s+date\s*\(/i.test(message) || /date\s*\(/i.test(message);
}

export async function POST(req: NextRequest) {
  const startedAt = performance.now();
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || !Array.isArray((body as any).messages)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const messages = sanitizeMessages((body as any).messages);
    if (messages.length === 0) {
      return NextResponse.json({ error: "Envie ao menos uma mensagem" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      return NextResponse.json({ error: "A última mensagem precisa ser do usuário" }, { status: 400 });
    }

    const historyContents: Content[] = messages.slice(0, -1).map(toGeminiContent);
    const conversation = [...historyContents, toGeminiContent(lastMessage)];

    const analysisModel = getRoModel({ responseMimeType: "application/json", temperature: 0.2 });
    const analysisResult = await analysisModel.generateContent({ contents: conversation });
    const analysisText = analysisResult.response.text();
    const analysis = parseAnalysisAction(analysisText);

    if (analysis.action === "respond") {
      return NextResponse.json({
        message: analysis.message,
        meta: {
          elapsedMs: Math.round(performance.now() - startedAt),
          usedSql: false,
        },
      });
    }

    // Validar e corrigir SQL para PostgreSQL
    console.log("[RO][SQL][Original]", analysis.sql);
    const validation = validatePostgreSQL(analysis.sql);
    
    if (!validation.isValid) {
      console.warn("[RO][SQL][Validation Errors]", validation.errors);
      
      // Se há erros críticos, retornar feedback para a IA
      if (validation.errors.length > 0) {
        const feedback = generateFeedbackPrompt(analysis.sql, validation.errors, validation.correctedSql);
        console.log("[RO][SQL][Feedback]", feedback);
        
        // Retornar feedback para a IA tentar novamente
        return NextResponse.json({
          error: "SQL inválida para PostgreSQL",
          details: validation.errors.join(", "),
          feedback: feedback,
          hint: "A IA precisa gerar SQL válida para PostgreSQL. Use DATE_TRUNC em vez de date()."
        }, { status: 400 });
      }
      
      if (validation.correctedSql) {
        console.log("[RO][SQL][Auto-corrected]", validation.correctedSql);
      }
    }
    
    if (validation.warnings.length > 0) {
      console.warn("[RO][SQL][Warnings]", validation.warnings);
    }
    
    const sqlToUse = validation.correctedSql || analysis.sql;
    const validated = validateSelectQuery(sqlToUse);
    const sqlWithLimit = applySafeLimit(validated);

    let executedSql = sqlWithLimit;
    let rowsRaw: unknown[];

    try {
      rowsRaw = (await prisma.$queryRawUnsafe(executedSql)) as unknown[];
    } catch (error) {
      if (isColumnMissingError(error)) {
        console.warn("[RO][SQL][Retry] Identificadores com camelCase detectados. Aplicando aspas automáticas.");
        executedSql = quoteIdentifiers(sqlWithLimit);
        rowsRaw = (await prisma.$queryRawUnsafe(executedSql)) as unknown[];
      } else if (isDateFunctionError(error)) {
        console.warn("[RO][SQL][Retry] Função date() detectada. Tentando correção automática.");
        // Tentar uma correção mais específica para date()
        const fixedSql = analysis.sql.replace(/date\s*\(/gi, 'DATE_TRUNC(\'day\', ');
        const fixedValidated = validateSelectQuery(fixedSql);
        const fixedWithLimit = applySafeLimit(fixedValidated);
        executedSql = fixedWithLimit;
        rowsRaw = (await prisma.$queryRawUnsafe(executedSql)) as unknown[];
      } else {
        throw error;
      }
    }
    const normalizedRows = normalizeRows(rowsRaw).slice(0, 200);
    const previewForModel = formatRowsForModel(normalizedRows);

    console.info("[RO][SQL]", executedSql, {
      rows: normalizedRows.length,
      reason: analysis.reason,
    });

    const followUpModel = getRoModel({ temperature: 0.45 });
    const followUpContents: Content[] = [
      ...conversation,
      {
        role: "model",
        parts: [{ text: analysisText }],
      },
      {
        role: "user",
        parts: [
          {
            text: `Consulta executada com sucesso. SQL utilizada: ${executedSql}. Linhas retornadas: ${normalizedRows.length}. Prévia dos dados em JSON:\n${previewForModel}\n\n${FINAL_RESPONSE_GUIDE}`,
          },
        ],
      },
    ];

    const followUpResult = await followUpModel.generateContent({ contents: followUpContents });
    const finalMessage = followUpResult.response.text().trim();

    // Criar resposta limpa para o frontend
    const cleanResponse = createCleanResponse(finalMessage, normalizedRows, executedSql, analysis.reason);

    return NextResponse.json({
      message: cleanResponse.message,
      meta: {
        elapsedMs: Math.round(performance.now() - startedAt),
        usedSql: true,
      },
    });
  } catch (error) {
    console.error("[RO][ERROR]", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const messageLower = message.toLowerCase();

    const columnMissing = isColumnMissingError(error);
    const unknownFunction = isUnknownFunctionError(error);
    const dateFunctionError = isDateFunctionError(error);
    const basicValidationIssue =
      error instanceof Error &&
      (messageLower.includes("consulta sql") ||
        messageLower.includes("comandos não permitidos") ||
        messageLower.includes("começar com select") ||
        messageLower.includes("funções sql inválidas"));

    const shouldReturnBadRequest = columnMissing || unknownFunction || dateFunctionError || basicValidationIssue;

    const friendlyError = columnMissing
      ? "Coluna desconhecida"
      : dateFunctionError
      ? "Função date() inválida"
      : unknownFunction
      ? "Função SQL desconhecida"
      : basicValidationIssue
      ? "Receita proibida"
      : "Falha ao processar a requisição da RO";

    return NextResponse.json(
      {
        error: friendlyError,
        details: message,
        hint: dateFunctionError
          ? "A função date() não existe no PostgreSQL. Use DATE_TRUNC('day', campo) ou CAST(campo AS DATE) em vez de date()."
          : unknownFunction
          ? "Use funções suportadas pelo PostgreSQL, como DATE_TRUNC ou CAST, em vez de date()."
          : columnMissing
          ? "Confira nomes de colunas e utilize aspas se estiverem em camelCase."
          : undefined,
      },
      { status: shouldReturnBadRequest ? 400 : 500 }
    );
  }
}
