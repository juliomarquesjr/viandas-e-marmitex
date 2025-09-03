import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
    const size = searchParams.get("size") ? parseInt(searchParams.get("size")!) : null;
    const category = searchParams.get("category") || "all";
    const status = searchParams.get("status") || "all";
    const type = searchParams.get("type") || "all";
    const variable = searchParams.get("variable") || "all";

    const where: any = {};

    // Filtro de busca
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    // Filtro de categoria
    if (category !== "all") {
      where.categoryId = category;
    }

    // Filtro de status
    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    }

    // Filtro de tipo
    if (type !== "all") {
      where.productType = type;
    }

    // Filtro de variação
    if (variable === "variable") {
      where.variableProduct = true;
    } else if (variable === "standard") {
      where.variableProduct = false;
    }

    // Se não especificar paginação, retornar todos os produtos
    const shouldPaginate = page !== null && size !== null;
    
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        ...(shouldPaginate && {
          skip: (page - 1) * size,
          take: size,
        }),
        orderBy: { createdAt: "desc" },
        include: {
          category: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Obter todas as categorias para o filtro
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: products.map((product) => ({
        ...product,
        priceCents: product.priceCents,
        stockEnabled: product.stockEnabled,
        stock: product.stock,
        productType: product.productType,
        variableProduct: product.variableProduct,
        createdAt: product.createdAt.toISOString().split("T")[0],
        categoryId: product.categoryId,
      })),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
      ...(shouldPaginate && {
        pagination: {
          page,
          size,
          total,
          pages: Math.ceil(total / size),
        },
      }),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validação básica
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        barcode: body.barcode,
        categoryId: body.categoryId || null,
        priceCents: parseInt(body.priceCents) || 0,
        description: body.description,
        stockEnabled: body.stockEnabled || false,
        stock: body.stockEnabled && body.stock ? parseInt(body.stock) : null,
        imageUrl: body.imageUrl,
        productType: body.productType || "sellable",
        variableProduct: body.variableProduct || false,
        active: body.active !== undefined ? body.active : true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Validação básica
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        barcode: data.barcode,
        categoryId: data.categoryId || null,
        priceCents: parseInt(data.priceCents) || 0,
        description: data.description,
        stockEnabled: data.stockEnabled || false,
        stock: data.stockEnabled && data.stock ? parseInt(data.stock) : null,
        imageUrl: data.imageUrl,
        productType: data.productType || "sellable",
        variableProduct: data.variableProduct || false,
        active: data.active !== undefined ? data.active : true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Verificar se o produto tem vendas associadas
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: id }
    });

    if (orderItemCount > 0) {
      // Se tiver vendas, fazer exclusão lógica (marcar como inativo)
      await prisma.product.update({
        where: { id },
        data: { active: false }
      });
      
      return NextResponse.json({ 
        message: "Product deactivated successfully (has associated sales)", 
        deactivated: true 
      });
    } else {
      // Se não tiver vendas, excluir fisicamente
      await prisma.product.delete({
        where: { id },
      });
      
      return NextResponse.json({ 
        message: "Product deleted successfully",
        deactivated: false
      });
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
