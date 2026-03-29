import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/kanban/mentions/search?q=&types=user,customer,product
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const typesParam = url.searchParams.get("types") ?? "user,customer,product";
  const types = typesParam.split(",");

  const results: {
    id: string;
    label: string;
    type: "user" | "customer" | "product";
    imageUrl?: string | null;
    subtitle?: string;
  }[] = [];

  const searchFilter = q
    ? { name: { contains: q, mode: "insensitive" as const } }
    : {};

  if (types.includes("user")) {
    const users = await prisma.user.findMany({
      where: { active: true, ...searchFilter },
      select: { id: true, name: true, email: true, imageUrl: true, role: true },
      take: 8,
    });
    for (const u of users) {
      results.push({
        id: u.id,
        label: u.name,
        type: "user",
        imageUrl: u.imageUrl,
        subtitle: u.role === "admin" ? "Admin" : "Operador",
      });
    }
  }

  if (types.includes("customer")) {
    const customers = await prisma.customer.findMany({
      where: {
        active: true,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      select: { id: true, name: true, phone: true, imageUrl: true },
      take: 8,
    });
    for (const c of customers) {
      results.push({
        id: c.id,
        label: c.name,
        type: "customer",
        imageUrl: c.imageUrl,
        subtitle: c.phone,
      });
    }
  }

  if (types.includes("product")) {
    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      select: { id: true, name: true, priceCents: true, imageUrl: true },
      take: 8,
    });
    for (const p of products) {
      results.push({
        id: p.id,
        label: p.name,
        type: "product",
        imageUrl: p.imageUrl,
        subtitle: `R$ ${(p.priceCents / 100).toFixed(2).replace(".", ",")}`,
      });
    }
  }

  return NextResponse.json(results);
}
