import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '10');
    const category = searchParams.get('category') || 'all';
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const variable = searchParams.get('variable') || 'all';
    
    const where: any = {};
    
    // Filtro de busca
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    // Filtro de categoria
    if (category !== 'all') {
      where.categoryId = category;
    }
    
    // Filtro de status
    if (status === 'active') {
      where.active = true;
    } else if (status === 'inactive') {
      where.active = false;
    }
    
    // Filtro de tipo
    if (type !== 'all') {
      where.productType = type;
    }
    
    // Filtro de variação
    if (variable === 'variable') {
      where.variableProduct = true;
    } else if (variable === 'standard') {
      where.variableProduct = false;
    }
    
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true
        }
      }),
      prisma.product.count({ where })
    ]);
    
    // Obter todas as categorias para o filtro
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json({
      data: products.map(product => ({
        ...product,
        price_cents: product.priceCents,
        stock_enabled: product.stockEnabled,
        product_type: product.productType,
        variable_product: product.variableProduct,
        created_at: product.createdAt.toISOString().split('T')[0],
        category_id: product.categoryId
      })),
      categories: categories.map(category => ({
        id: category.id,
        name: category.name
      })),
      pagination: {
        page,
        size,
        total,
        pages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validação básica
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const product = await prisma.product.create({
      data: {
        name: body.name,
        barcode: body.barcode,
        categoryId: body.category_id || null,
        priceCents: parseInt(body.price_cents) || 0,
        description: body.description,
        stockEnabled: body.stock_enabled || false,
        stock: body.stock_enabled && body.stock ? parseInt(body.stock) : null,
        imageUrl: body.image_url,
        productType: body.product_type || 'sellable',
        variableProduct: body.variable_product || false,
        active: body.active !== undefined ? body.active : true
      }
    });
    
    return NextResponse.json({
      ...product,
      price_cents: product.priceCents,
      stock_enabled: product.stockEnabled,
      product_type: product.productType,
      variable_product: product.variableProduct,
      created_at: product.createdAt.toISOString().split('T')[0],
      category_id: product.categoryId
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
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
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Validação básica
    if (!data.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        barcode: data.barcode,
        categoryId: data.category_id || null,
        priceCents: parseInt(data.price_cents) || 0,
        description: data.description,
        stockEnabled: data.stock_enabled || false,
        stock: data.stock_enabled && data.stock ? parseInt(data.stock) : null,
        imageUrl: data.image_url,
        productType: data.product_type || 'sellable',
        variableProduct: data.variable_product || false,
        active: data.active !== undefined ? data.active : true
      }
    });
    
    return NextResponse.json({
      ...product,
      price_cents: product.priceCents,
      stock_enabled: product.stockEnabled,
      product_type: product.productType,
      variable_product: product.variableProduct,
      created_at: product.createdAt.toISOString().split('T')[0],
      category_id: product.categoryId
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    await prisma.product.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}