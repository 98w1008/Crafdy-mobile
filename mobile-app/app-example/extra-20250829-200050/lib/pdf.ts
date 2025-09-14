import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { fileStorage } from './storage'

export class PDFService {
  // 見積書PDF生成
  async generateEstimatePDF(estimateData: {
    id: string
    title: string
    projectName: string
    items: Array<{
      name: string
      quantity: number
      unit: string
      unitPrice: number
      amount: number
    }>
    totalAmount: number
    issueDate: string
    dueDate?: string
    companyInfo?: {
      name: string
      address: string
      phone: string
      email: string
    }
  }): Promise<string> {
    try {
      const htmlContent = this.generateEstimateHTML(estimateData)
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      })

      return uri
    } catch (error) {
      console.error('PDF generation error:', error)
      throw error
    }
  }

  // 日報PDF生成
  async generateReportPDF(reportData: {
    id: string
    projectName: string
    workDate: string
    content: string
    weather?: string
    workers?: number
    progress?: number
    photos?: string[]
    companyInfo?: {
      name: string
      address: string
      phone: string
      email: string
    }
  }): Promise<string> {
    try {
      const htmlContent = this.generateReportHTML(reportData)
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      })

      return uri
    } catch (error) {
      console.error('Report PDF generation error:', error)
      throw error
    }
  }

  // PDFファイルを共有
  async sharePDF(pdfUri: string, filename?: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync()
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device')
      }

      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: filename || 'ドキュメントを共有',
        UTI: 'com.adobe.pdf'
      })
    } catch (error) {
      console.error('PDF sharing error:', error)
      throw error
    }
  }

  // 見積書HTMLテンプレート生成
  private generateEstimateHTML(data: any): string {
    const itemsHTML = data.items.map((item: any) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: center;">${item.unit}</td>
        <td style="text-align: right;">¥${item.unitPrice.toLocaleString()}</td>
        <td style="text-align: right;">¥${item.amount.toLocaleString()}</td>
      </tr>
    `).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>見積書</title>
        <style>
          body {
            font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
            margin: 20px;
            font-size: 12px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .info-section {
            margin-bottom: 20px;
          }
          .company-info {
            text-align: right;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .total-row {
            background-color: #f8f8f8;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">見積書</div>
        </div>

        ${data.companyInfo ? `
        <div class="company-info">
          <strong>${data.companyInfo.name}</strong><br>
          ${data.companyInfo.address}<br>
          TEL: ${data.companyInfo.phone}<br>
          Email: ${data.companyInfo.email}
        </div>
        ` : ''}

        <div class="info-section">
          <table style="width: 50%; margin-bottom: 20px;">
            <tr>
              <th>見積書No.</th>
              <td>${data.id}</td>
            </tr>
            <tr>
              <th>件名</th>
              <td>${data.title}</td>
            </tr>
            <tr>
              <th>プロジェクト</th>
              <td>${data.projectName}</td>
            </tr>
            <tr>
              <th>発行日</th>
              <td>${data.issueDate}</td>
            </tr>
            ${data.dueDate ? `
            <tr>
              <th>有効期限</th>
              <td>${data.dueDate}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <table>
          <thead>
            <tr>
              <th>項目名</th>
              <th style="width: 60px;">数量</th>
              <th style="width: 40px;">単位</th>
              <th style="width: 80px;">単価</th>
              <th style="width: 100px;">金額</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
            <tr class="total-row">
              <td colspan="4" style="text-align: right; font-weight: bold;">合計金額</td>
              <td style="text-align: right; font-weight: bold;">¥${data.totalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>※ 上記金額は税込価格です。</p>
          <p>※ 本見積書は発行日より30日間有効です。</p>
        </div>
      </body>
      </html>
    `
  }

  // 日報HTMLテンプレート生成
  private generateReportHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>作業日報</title>
        <style>
          body {
            font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
            margin: 20px;
            font-size: 12px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .info-table th, .info-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          .info-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            width: 120px;
          }
          .content-section {
            margin-bottom: 20px;
          }
          .content-title {
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
          }
          .content-text {
            min-height: 100px;
            padding: 10px;
            border: 1px solid #ccc;
            background-color: #fafafa;
          }
          .photo-section {
            margin-top: 20px;
          }
          .footer {
            margin-top: 30px;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">作業日報</div>
        </div>

        ${data.companyInfo ? `
        <div style="text-align: right; margin-bottom: 20px;">
          <strong>${data.companyInfo.name}</strong><br>
          ${data.companyInfo.address}<br>
          TEL: ${data.companyInfo.phone}
        </div>
        ` : ''}

        <table class="info-table">
          <tr>
            <th>日報ID</th>
            <td>${data.id}</td>
            <th>作業日</th>
            <td>${data.workDate}</td>
          </tr>
          <tr>
            <th>プロジェクト</th>
            <td colspan="3">${data.projectName}</td>
          </tr>
          ${data.weather || data.workers ? `
          <tr>
            ${data.weather ? `<th>天候</th><td>${data.weather}</td>` : '<th></th><td></td>'}
            ${data.workers ? `<th>作業者数</th><td>${data.workers}名</td>` : '<th></th><td></td>'}
          </tr>
          ` : ''}
          ${data.progress ? `
          <tr>
            <th>進捗率</th>
            <td colspan="3">${Math.round(data.progress * 100)}%</td>
          </tr>
          ` : ''}
        </table>

        <div class="content-section">
          <div class="content-title">作業内容</div>
          <div class="content-text">
            ${data.content.replace(/\n/g, '<br>')}
          </div>
        </div>

        ${data.photos && data.photos.length > 0 ? `
        <div class="photo-section">
          <div class="content-title">添付写真</div>
          <p>写真 ${data.photos.length}枚が添付されています。</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>※ この日報はCrafdy Mobileで作成されました。</p>
        </div>
      </body>
      </html>
    `
  }
}