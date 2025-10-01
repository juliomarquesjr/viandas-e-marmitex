import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    // Validar parâmetros obrigatórios
    if (!customerId || !startDate || !endDate) {
      return NextResponse.json({
        error: 'Customer ID, start date and end date are required'
      }, { status: 400 });
    }

    // Buscar dados do cliente
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        doc: true
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Buscar dados do relatório
    const reportResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/customers/${customerId}/report?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      }
    );

    if (!reportResponse.ok) {
      return NextResponse.json({
        error: 'Erro ao gerar dados do relatório'
      }, { status: 500 });
    }

    const reportData = await reportResponse.json();

    // Carregar informações da empresa
    const companyConfigs = await prisma.systemConfig.findMany({
      where: { category: 'branding' }
    });

    const companyName = companyConfigs.find(c => c.key === 'branding_system_title')?.value || 'Viandas e Marmitex';

    // Gerar HTML do relatório para PDF
    const htmlContent = generateReportHTML(reportData, companyName);

    // Retornar HTML que será convertido para PDF no cliente
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

function generateReportHTML(reportData: any, companyName: string): string {
  const { customer, period, summary, details, metadata } = reportData;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Criar lista unificada de transações
  const createTransactionList = () => {
    const transactions: Array<{
      id: string;
      date: string;
      type: 'consumption' | 'payment';
      description: string;
      value: number;
      status: string;
    }> = [];

    // Adicionar pedidos do período
    details.periodOrders.forEach((order: any) => {
      const itemsDescription = order.items.map((item: any) => 
        `${item.quantity}x ${item.product.name}`
      ).join(', ');
      
      transactions.push({
        id: order.id,
        date: order.createdAt,
        type: 'consumption',
        description: itemsDescription,
        value: order.totalCents,
        status: order.status
      });
    });

    // Adicionar pagamentos ficha do período
    details.fichaPayments.forEach((payment: any) => {
      const paymentDate = new Date(payment.createdAt);
      const startDateTime = new Date(period.startDateTime);
      const endDateTime = new Date(period.endDateTime);
      const isInPeriod = paymentDate >= startDateTime && paymentDate <= endDateTime;
      
      if (isInPeriod) {
        transactions.push({
          id: payment.id,
          date: payment.createdAt,
          type: 'payment',
          description: 'Pagamento Ficha',
          value: -payment.totalCents,
          status: payment.status
        });
      }
    });

    // Ordenar por data (mais recente primeiro)
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const allTransactions = createTransactionList();

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Fechamento - ${customer.name}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          font-size: 10px;
          line-height: 1.2;
          color: #333;
          background: white;
          padding: 10px;
        }
        
         .header {
           text-align: left;
           margin-bottom: 15px;
           border-bottom: 1px solid #333;
           padding-bottom: 10px;
         }
        
        .header h1 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 3px;
        }
        
        .header h2 {
          font-size: 14px;
          font-weight: 600;
          color: #666;
          margin-bottom: 5px;
        }
        
        .header .period {
          font-size: 10px;
          color: #888;
        }
        
        .customer-info {
          margin-bottom: 12px;
          background: #f8f9fa;
          padding: 8px;
          border-radius: 3px;
        }
        
        .customer-info h3 {
          font-size: 12px;
          margin-bottom: 6px;
          color: #333;
        }
        
         .customer-grid {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: 8px;
         }
         
         .customer-item {
           margin-bottom: 3px;
           border-bottom: 1px solid #e5e7eb;
           padding-bottom: 4px;
         }
         
         .customer-item .label {
           font-size: 9px;
           color: #666;
           font-weight: 500;
           margin-bottom: 2px;
         }
         
         .customer-item .value {
           font-size: 10px;
           font-weight: 600;
           margin-left: 8px;
         }
        
        .summary {
          margin-bottom: 12px;
        }
        
        .summary h3 {
          font-size: 12px;
          margin-bottom: 8px;
          color: #333;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }
        
        .summary-item {
          background: #f8f9fa;
          padding: 8px;
          border-radius: 3px;
          text-align: center;
          border-left: 3px solid #ddd;
        }
        
        .summary-item.debt {
          border-left-color: #dc2626;
        }
        
        .summary-item.consumption {
          border-left-color: #059669;
        }
        
        .summary-item.payment {
          border-left-color: #2563eb;
        }
        
        .summary-item .label {
          font-size: 9px;
          color: #666;
          margin-bottom: 3px;
        }
        
        .summary-item .value {
          font-size: 12px;
          font-weight: bold;
        }
        
        .transactions {
          margin-bottom: 12px;
        }
        
        .transactions h3 {
          font-size: 12px;
          margin-bottom: 8px;
          color: #333;
        }
        
        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        
        .transactions-table th {
          background: #f8f9fa;
          padding: 4px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #ddd;
        }
        
        .transactions-table td {
          padding: 4px;
          border: 1px solid #ddd;
        }
        
        .transactions-table .date {
          width: 80px;
        }
        
        .transactions-table .description {
          width: auto;
        }
        
        .transactions-table .value {
          width: 100px;
          text-align: right;
        }
        
        .value-positive {
          color: #dc2626;
          font-weight: 600;
        }
        
        .value-negative {
          color: #059669;
          font-weight: 600;
        }
        
        .footer {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 9px;
          color: #666;
        }
        
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${companyName}</h1>
        <h2>RELATÓRIO DE FECHAMENTO</h2>
        <div class="period">
          Período: ${formatDate(period.startDate)} a ${formatDate(period.endDate)} | 
          Gerado em: ${formatDateTime(metadata.generatedAt)}
        </div>
      </div>

       <div class="customer-info">
         <h3>Dados do Cliente</h3>
         <div class="customer-grid">
           <div class="customer-item">
             <div class="label">Nome:</div>
             <div class="value">${customer.name}</div>
           </div>
           <div class="customer-item">
             <div class="label">Telefone:</div>
             <div class="value">${customer.phone}</div>
           </div>
           ${customer.email ? `
           <div class="customer-item">
             <div class="label">Email:</div>
             <div class="value">${customer.email}</div>
           </div>
           ` : ''}
           ${customer.address ? `
           <div class="customer-item">
             <div class="label">Endereço:</div>
             <div class="value">${customer.address.street} ${customer.address.number}${customer.address.complement ? ', ' + customer.address.complement : ''}<br>${customer.address.neighborhood}, ${customer.address.city} - ${customer.address.state}<br>CEP: ${customer.address.zip}</div>
           </div>
           ` : ''}
           ${customer.doc ? `
           <div class="customer-item">
             <div class="label">Documento:</div>
             <div class="value">${customer.doc}</div>
           </div>
           ` : ''}
         </div>
       </div>

      <div class="summary">
        <h3>Resumo Financeiro</h3>
        <div class="summary-grid">
          <div class="summary-item debt">
            <div class="label">Saldo Devedor</div>
            <div class="value">${formatCurrency(summary.debtBalanceCents)}</div>
          </div>
           <div class="summary-item consumption">
             <div class="label">Saldo Período</div>
             <div class="value">${formatCurrency(summary.pendingInPeriodCents)}</div>
           </div>
          ${summary.totalPaymentsCents > 0 ? `
          <div class="summary-item payment">
            <div class="label">Pagamentos</div>
            <div class="value">${formatCurrency(summary.totalPaymentsCents)}</div>
          </div>
          ` : ''}
        </div>
      </div>

      ${allTransactions.length > 0 ? `
      <div class="transactions">
        <h3>Histórico de Transações</h3>
        <table class="transactions-table">
          <thead>
            <tr>
              <th class="date">Data</th>
              <th class="description">Descrição</th>
              <th style="width: 80px;">Detalhes</th>
              <th class="value">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${allTransactions.map(transaction => `
              <tr style="${transaction.type === 'payment' ? 'background-color: #f0fdf4;' : ''}">
                <td>${formatDate(transaction.date)}</td>
                <td style="white-space: normal; word-wrap: break-word;">
                  ${transaction.description}
                </td>
                <td style="white-space: normal; word-wrap: break-word; font-size: 8px; line-height: 1.2;">
                  ${transaction.type === 'consumption' ? (() => {
                    const order = details.periodOrders.find((o: any) => o.id === transaction.id);
                    if (order) {
                      if (order.discountCents > 0) {
                        return `
                          <div>Subtotal: ${formatCurrency(order.subtotalCents)}</div>
                          <div>Desc: -${formatCurrency(order.discountCents)}</div>
                        `;
                      }
                      return '-';
                    }
                    return '-';
                  })() : ''}
                  ${transaction.type === 'payment' ? '-' : ''}
                </td>
                <td class="${transaction.type === 'payment' ? 'value-negative' : 'value-positive'}">
                  ${transaction.type === 'payment' ? '-' : '+'}${formatCurrency(Math.abs(transaction.value))}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="footer">
        <p>Relatório gerado em ${formatDateTime(metadata.generatedAt)}</p>
        <p>${companyName}</p>
      </div>
    </body>
    </html>
  `;
}
