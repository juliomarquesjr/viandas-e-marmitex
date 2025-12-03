import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const typeId = searchParams.get('typeId');
    const supplierTypeId = searchParams.get('supplierTypeId');

    // Construir filtros
    const where: any = {};
    
    if (startDate && endDate) {
      // Usar comparação de datas usando cast para date no PostgreSQL
      // Isso garante que apenas a parte da data seja comparada, ignorando horário e timezone
      where.date = {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z')
      };
    } else if (startDate) {
      // Se só tem startDate, filtrar do início desse dia em diante
      where.date = {
        gte: new Date(startDate + 'T00:00:00.000Z')
      };
    } else if (endDate) {
      // Se só tem endDate, filtrar até o fim desse dia
      where.date = {
        lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }
    
    if (typeId) {
      where.typeId = typeId;
    }
    
    if (supplierTypeId) {
      where.supplierTypeId = supplierTypeId;
    }

    const skip = (page - 1) * limit;

    // Se temos filtro de data, usar query raw para comparar apenas a parte da data
    // Isso evita problemas de timezone comparando apenas a data, não o horário (como no relatório de lucros)
    if (startDate || endDate) {
      // Construir condições WHERE dinamicamente
      const conditions: string[] = [];
      
      // Usar CAST para garantir comparação apenas da parte da data
      if (startDate && endDate) {
        conditions.push(`CAST(e.date AS DATE) >= CAST('${startDate}' AS DATE) AND CAST(e.date AS DATE) <= CAST('${endDate}' AS DATE)`);
      } else if (startDate) {
        conditions.push(`CAST(e.date AS DATE) >= CAST('${startDate}' AS DATE)`);
      } else if (endDate) {
        conditions.push(`CAST(e.date AS DATE) <= CAST('${endDate}' AS DATE)`);
      }
      
      if (typeId) {
        conditions.push(`e."typeId" = '${typeId}'`);
      }
      
      if (supplierTypeId) {
        conditions.push(`e."supplierTypeId" = '${supplierTypeId}'`);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Buscar total
      const totalResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*)::int as count FROM "Expense" e ${whereClause}`
      );
      
      // Buscar despesas
      const expensesRaw = await prisma.$queryRawUnsafe<any[]>(
        `SELECT e.*, 
         json_build_object('id', et.id, 'name', et.name) as type,
         json_build_object('id', st.id, 'name', st.name) as "supplierType"
         FROM "Expense" e
         INNER JOIN "ExpenseType" et ON e."typeId" = et.id
         INNER JOIN "SupplierType" st ON e."supplierTypeId" = st.id
         ${whereClause}
         ORDER BY e.date DESC
         LIMIT ${limit} OFFSET ${skip}`
      );
      
      // Converter resultados
      const expenses = expensesRaw.map((row: any) => ({
        id: row.id,
        typeId: row.typeId,
        supplierTypeId: row.supplierTypeId,
        amountCents: Number(row.amountCents),
        description: row.description,
        date: new Date(row.date),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        type: row.type,
        supplierType: row.supplierType
      }));
      
      const total = Number(totalResult[0]?.count || 0);
      
      return NextResponse.json({
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          type: {
            select: {
              id: true,
              name: true
            }
          },
          supplierType: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.expense.count({ where })
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validação básica
    if (!body.typeId) {
      return NextResponse.json(
        { error: 'Tipo de despesa é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!body.supplierTypeId) {
      return NextResponse.json(
        { error: 'Tipo de fornecedor é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!body.amountCents || body.amountCents <= 0) {
      return NextResponse.json(
        { error: 'Valor da despesa deve ser maior que zero' },
        { status: 400 }
      );
    }
    
    if (!body.description || body.description.trim() === '') {
      return NextResponse.json(
        { error: 'Descrição é obrigatória' },
        { status: 400 }
      );
    }
    
    if (!body.date) {
      return NextResponse.json(
        { error: 'Data é obrigatória' },
        { status: 400 }
      );
    }
    
    // Verificar se os tipos existem
    const [expenseType, supplierType] = await Promise.all([
      prisma.expenseType.findUnique({ where: { id: body.typeId } }),
      prisma.supplierType.findUnique({ where: { id: body.supplierTypeId } })
    ]);
    
    if (!expenseType) {
      return NextResponse.json(
        { error: 'Tipo de despesa não encontrado' },
        { status: 400 }
      );
    }
    
    if (!supplierType) {
      return NextResponse.json(
        { error: 'Tipo de fornecedor não encontrado' },
        { status: 400 }
      );
    }
    
    const expense = await prisma.expense.create({
      data: {
        typeId: body.typeId,
        supplierTypeId: body.supplierTypeId,
        amountCents: body.amountCents,
        description: body.description.trim(),
        date: new Date(body.date + 'T00:00:00.000Z')
      },
      include: {
        type: {
          select: {
            id: true,
            name: true
          }
        },
        supplierType: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
