/**
 * Estilos centralizados para impressão térmica
 * Otimizados para melhor legibilidade em impressoras térmicas de 58mm
 */

export const thermalStyles = `
  /* Estilos base para impressão térmica */
  .thermal-receipt,
  .thermal-report {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    max-width: 280px;
    margin: 0 auto;
    padding: 8px;
    background: white;
  }
  
  /* Cabeçalho */
  .thermal-header {
    text-align: center;
    margin-bottom: 8px;
    border-bottom: 1px dashed #333;
    padding-bottom: 6px;
  }
  
  .thermal-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  
  .thermal-subtitle {
    font-size: 13px;
    margin-bottom: 2px;
  }
  
  .thermal-date {
    font-size: 12px;
  }
  
  .thermal-period {
    font-size: 12px;
  }
  
  /* Seções */
  .thermal-section {
    margin-bottom: 8px;
    border-bottom: 1px dashed #333;
    padding-bottom: 6px;
  }
  
  .thermal-section-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .thermal-text {
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 2px;
  }
  
  /* Linhas de dados */
  .thermal-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 2px;
  }
  
  .thermal-total {
    font-size: 16px;
    font-weight: 500;
    border-top: 1px solid #333;
    padding-top: 4px;
    margin-top: 4px;
  }
  
  .thermal-value {
    font-weight: 500;
  }
  
  /* Itens do pedido */
  .thermal-item {
    margin-bottom: 4px;
    font-size: 13px;
    font-weight: 500;
  }
  
  .thermal-item-header {
    margin-bottom: 2px;
  }
  
  .thermal-item-name {
    font-size: 13px;
    font-weight: 500;
  }
  
  .thermal-item-details {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 500;
  }
  
  .thermal-item-total {
    font-weight: 500;
  }
  
  /* Transações (relatórios) */
  .thermal-transaction {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .thermal-date {
    font-size: 12px;
    font-weight: 500;
  }
  
  .thermal-transaction-value {
    font-weight: 500;
    font-size: 14px;
  }
  
  .thermal-transaction-type {
    font-size: 11px;
    color: #666;
    margin-bottom: 2px;
  }
  
  .thermal-description {
    font-size: 12px;
    font-weight: 500;
    word-wrap: break-word;
  }
  
  /* Separadores */
  .thermal-divider {
    border-bottom: 1px dotted #ccc;
    margin: 4px 0;
  }
  
  /* Rodapé */
  .thermal-footer {
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: #333;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 2px solid #333;
  }
  
  .thermal-separator {
    margin: 8px 0;
    font-weight: 500;
    font-size: 12px;
    color: #000;
  }
  
  /* Botões (apenas para tela) */
  .thermal-print-btn {
    text-align: center;
    margin-top: 16px;
  }
  
  .thermal-btn {
    background-color: #2563eb;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    font-size: 14px;
    cursor: pointer;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .thermal-btn:hover {
    background-color: #1d4ed8;
  }
  
  /* Estilos específicos para impressão */
  @media print {
    body {
      margin: 0;
      padding: 0;
    }
    
    .no-print {
      display: none !important;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    .thermal-receipt,
    .thermal-report {
      max-width: none;
      width: 58mm;
      margin: 0;
      padding: 2mm;
    }
    
    @page {
      size: 58mm auto;
      margin: 0;
    }
  }
`;
