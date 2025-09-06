import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Relatório de Fechamento - Viandas e Marmitex',
  description: 'Relatório de fechamento do cliente para impressão',
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <style>{`
          @media print {
            @page {
              margin: 0.5in;
              size: A4;
            }
            
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .no-print {
              display: none !important;
            }
            
            .page-break {
              page-break-before: always;
            }
            
            .avoid-break {
              page-break-inside: avoid;
            }
          }
          
          @media screen {
            body {
              background-color: #f5f5f5;
              padding: 20px;
            }
            
            .print-container {
              background: white;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 0.5in;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              border-radius: 8px;
            }
          }
          
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
          }
          
          * {
            box-sizing: border-box;
          }
          
          .text-xs { font-size: 10px; }
          .text-sm { font-size: 11px; }
          .text-base { font-size: 12px; }
          .text-lg { font-size: 14px; }
          .text-xl { font-size: 16px; }
          .text-2xl { font-size: 20px; }
          
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-3 { margin-bottom: 0.75rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mb-8 { margin-bottom: 2rem; }
          
          .mt-1 { margin-top: 0.25rem; }
          .mt-2 { margin-top: 0.5rem; }
          .mt-3 { margin-top: 0.75rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-6 { margin-top: 1.5rem; }
          .mt-8 { margin-top: 2rem; }
          
          .p-2 { padding: 0.5rem; }
          .p-3 { padding: 0.75rem; }
          .p-4 { padding: 1rem; }
          
          .border { border: 1px solid #e5e7eb; }
          .border-t { border-top: 1px solid #e5e7eb; }
          .border-b { border-bottom: 1px solid #e5e7eb; }
          .border-2 { border: 2px solid #e5e7eb; }
          
          .rounded { border-radius: 0.25rem; }
          .rounded-lg { border-radius: 0.5rem; }
          
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .bg-blue-50 { background-color: #eff6ff; }
          .bg-green-50 { background-color: #f0fdf4; }
          .bg-red-50 { background-color: #fef2f2; }
          .bg-yellow-50 { background-color: #fefce8; }
          
          .text-gray-500 { color: #6b7280; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-700 { color: #374151; }
          .text-gray-800 { color: #1f2937; }
          .text-gray-900 { color: #111827; }
          .text-green-600 { color: #16a34a; }
          .text-red-600 { color: #dc2626; }
          .text-blue-600 { color: #2563eb; }
          
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          
          .gap-1 { gap: 0.25rem; }
          .gap-2 { gap: 0.5rem; }
          .gap-3 { gap: 0.75rem; }
          .gap-4 { gap: 1rem; }
          
          .w-full { width: 100%; }
          .h-full { height: 100%; }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th, td {
            padding: 0.5rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          
          th {
            font-weight: 600;
            background-color: #f9fafb;
          }
          
          .table-auto {
            table-layout: auto;
          }
          
          .w-1-12 { width: 8.333333%; }
          .w-2-12 { width: 16.666667%; }
          .w-3-12 { width: 25%; }
          .w-4-12 { width: 33.333333%; }
          .w-6-12 { width: 50%; }
          .w-8-12 { width: 66.666667%; }
          
          @media print {
            .print-container {
              box-shadow: none !important;
              border-radius: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
              max-width: none !important;
            }
          }
        `}</style>
      </head>
      <body>
        <div className="print-container">
          {children}
        </div>
      </body>
    </html>
  );
}