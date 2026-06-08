import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, FileText, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { cn, formatCurrency, PAYMENT_INSTRUCTIONS_TXT } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import jsPDF from 'jspdf';

export interface NoticeItemDetail {
  concept: string;
  reference?: string;
  amount: number;
}

interface NoticeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone?: string;
  title: string;
  subtitle?: string;
  items: NoticeItemDetail[];
  totalAmount: number;
  statusLabel?: string;
  paymentInstructions?: string;
  type?: 'receivable' | 'payable' | 'realized_update'; 
}

export function NoticeShareModal({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  title,
  subtitle,
  items,
  totalAmount,
  statusLabel = "PENDIENTE",
  paymentInstructions,
  type = 'receivable'
}: NoticeShareModalProps) {
  const { settings } = useAuth();
  const isDark = settings?.theme === 'dark';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrImagesLoaded, setQrImagesLoaded] = useState(false);
  const binanceImgRef = useRef<HTMLImageElement | null>(null);
  const paypalImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const bImg = new Image();
    bImg.crossOrigin = "anonymous";
    bImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=ca8a04&data=${encodeURIComponent('https://app.binance.com/qr/dplke9604c57f8c442e889ccb770899aa0e1')}`;

    const pImg = new Image();
    pImg.crossOrigin = "anonymous";
    pImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=003087&data=${encodeURIComponent('https://paypal.me/trennd07')}`;

    let loadedCount = 0;
    const handleLoad = () => {
      loadedCount++;
      if (loadedCount === 2) {
        setQrImagesLoaded(true);
      }
    };

    bImg.onload = handleLoad;
    pImg.onload = handleLoad;
    bImg.onerror = handleLoad;
    pImg.onerror = handleLoad;

    binanceImgRef.current = bImg;
    paypalImgRef.current = pImg;
  }, []);

  // Set style accents
  let primaryColor = "text-emerald-500";
  let primaryBg = "bg-emerald-500/10";
  let primaryBorder = "border-emerald-500/20";
  let accentColorRgb = [16, 185, 129]; // Emerald

  if (type === 'payable') {
    primaryColor = "text-rose-500";
    primaryBg = "bg-rose-500/10";
    primaryBorder = "border-rose-500/20";
    accentColorRgb = [244, 63, 94]; // Rose
  } else if (type === 'realized_update') {
    primaryColor = "text-indigo-500";
    primaryBg = "bg-indigo-500/10";
    primaryBorder = "border-indigo-500/20";
    accentColorRgb = [99, 102, 241]; // Indigo
  }

  // Prepares standard plain text payload
  const getPlainText = () => {
    let text = `*${title.toUpperCase()}*\n`;
    if (subtitle) text += `_${subtitle}_\n`;
    text += `\n*Destinatario:* ${recipientName}\n`;
    text += `*Estado:* ${statusLabel}\n`;
    text += `\n*Detalle de conceptos:*\n`;
    items.forEach((item, index) => {
      text += `${index + 1}. *${item.concept}* ${item.reference ? `(${item.reference})` : ''} - *${formatCurrency(item.amount)}*\n`;
    });
    text += `\n*Total:* *${formatCurrency(totalAmount)}*\n`;
    if (paymentInstructions) text += `\n_${paymentInstructions}_\n`;
    text += `\n${PAYMENT_INSTRUCTIONS_TXT.replace(/\*/g, '')}`;
    return text;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const phone = recipientPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(getPlainText())}`;
    window.open(url, '_blank');
  };

  // Draws notice to high resolution canvas for Image export
  const drawNoticeToCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 2;
    canvas.width = 450 * scale;
    canvas.height = (520 + Math.min(items.length, 10) * 35) * scale;
    
    // Reset transform & scale
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);

    const width = 450;
    const height = 520 + Math.min(items.length, 10) * 35;

    // Background
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Decorative glow
    ctx.fillStyle = `rgba(${accentColorRgb[0]}, ${accentColorRgb[1]}, ${accentColorRgb[2]}, 0.04)`;
    ctx.beginPath();
    ctx.arc(width, 0, 200, 0, Math.PI * 2);
    ctx.fill();

    // Border Frame
    ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Headline Header
    ctx.fillStyle = `rgb(${accentColorRgb[0]}, ${accentColorRgb[1]}, ${accentColorRgb[2]})`;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(settings?.companyName?.toUpperCase() || 'CONTROL FINANCIERO', 25, 45);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.fillText(title, 25, 70);

    ctx.font = 'normal 10px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(subtitle || 'Resumen de movimientos / avisos', 25, 87);

    // Divider
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.moveTo(25, 100);
    ctx.lineTo(width - 25, 100);
    ctx.stroke();

    // Recipient & Date
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = 'normal 9px sans-serif';
    ctx.fillText('DESTINATARIO:', 25, 125);
    ctx.fillText('FECHA DE EMISIÓN:', 250, 125);

    ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(recipientName.toUpperCase(), 25, 142);
    ctx.fillText(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase(), 250, 142);

    // Status Badge
    ctx.fillStyle = `rgba(${accentColorRgb[0]}, ${accentColorRgb[1]}, ${accentColorRgb[2]}, 0.15)`;
    ctx.beginPath();
    ctx.roundRect(width - 120, 125, 95, 20, 5);
    ctx.fill();

    ctx.fillStyle = `rgb(${accentColorRgb[0]}, ${accentColorRgb[1]}, ${accentColorRgb[2]})`;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(statusLabel, width - 110, 138);

    // Items Header
    ctx.fillStyle = isDark ? '#334155' : '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(25, 160, width - 50, 22, 4);
    ctx.fill();

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.fillText('CONCEPTO / DETALLE', 35, 174);
    ctx.fillText('VALOR', width - 85, 174);

    // Render items
    let currentY = 197;
    items.forEach((item) => {
      ctx.fillStyle = isDark ? '#e2e8f0' : '#334155';
      ctx.font = 'bold 10px sans-serif';
      
      // Left coordinate text
      const shortConcept = item.concept.length > 40 ? item.concept.slice(0, 38) + '...' : item.concept;
      ctx.fillText(shortConcept, 35, currentY);

      // Sub-ref
      ctx.font = 'normal 8.5px sans-serif';
      ctx.fillStyle = '#64748b';
      if (item.reference) {
        ctx.fillText(item.reference, 35, currentY + 11);
      } else {
        ctx.fillText('-', 35, currentY + 11);
      }

      // Money Rate Right
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(formatCurrency(item.amount), width - 85, currentY + 5);

      // Border sub-divider
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
      ctx.beginPath();
      ctx.moveTo(25, currentY + 19);
      ctx.lineTo(width - 25, currentY + 19);
      ctx.stroke();

      currentY += 32;
    });

    // Total section
    ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(25, currentY + 10);
    ctx.lineTo(width - 25, currentY + 10);
    ctx.stroke();
    ctx.setLineDash([]); // clear dash

    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Monto Consolidado:', 250, currentY + 32);

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = `rgb(${accentColorRgb[0]}, ${accentColorRgb[1]}, ${accentColorRgb[2]})`;
    ctx.fillText(formatCurrency(totalAmount), 350, currentY + 32);

    // PAYMENT METHODS ON CANVAS DE CUENTAS POR COBRAR
    currentY += 55;
    ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(25, currentY, width - 50, 185, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.strokeRect(25, currentY, width - 50, 185);

    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.fillText('MÉTODOS DE PAGO / CUENTAS BANCARIAS', 35, currentY + 16);

    ctx.font = 'bold italic 7.5px sans-serif';
    ctx.fillStyle = '#4f46e5';
    ctx.fillText('Todos los depósitos, transferencias y pagos son a nombre de Marcelo Gutama', 35, currentY + 28);

    ctx.font = 'normal 8.2px sans-serif';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.fillText('• Ahorros Pichincha: 2203066545', 35, currentY + 40);
    ctx.fillText('• Ahorros Guayaquil: 0032481285', 35, currentY + 51);
    ctx.fillText('• Ahorros Coop JEP: 406002489704', 35, currentY + 62);
    ctx.fillText('• Binance ID: 717956622', 35, currentY + 73);
    ctx.fillText('• PayPal ID: marcelogutama3eroa@gmail.com', 35, currentY + 84);

    ctx.font = 'bold italic 7.5px sans-serif';
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.fillText('Una vez hecho el depósito, transferencia o pago envíe la foto para corroborar.', 35, currentY + 97);

    // Side-by-side QR Codes
    if (binanceImgRef.current && qrImagesLoaded) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(80, currentY + 106, 55, 55);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(80, currentY + 106, 55, 55);
      try {
        ctx.drawImage(binanceImgRef.current, 82, currentY + 108, 51, 51);
      } catch (err) {
        console.error("Canvas drawImage Binance error:", err);
      }
      ctx.fillStyle = '#ca8a04';
      ctx.font = 'bold 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QR BINANCE PAY', 107, currentY + 172);
    }

    if (paypalImgRef.current && qrImagesLoaded) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(260, currentY + 106, 55, 55);
      ctx.strokeStyle = '#003087';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(260, currentY + 106, 55, 55);
      try {
        ctx.drawImage(paypalImgRef.current, 262, currentY + 108, 51, 51);
      } catch (err) {
        console.error("Canvas drawImage PayPal error:", err);
      }
      ctx.fillStyle = '#003087';
      ctx.font = 'bold 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QR PAYPAL ME', 287, currentY + 172);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 8px sans-serif';
    currentY += 205;
    ctx.fillText('Consulte los canales autorizados para transferencias.', 25, currentY);
    ctx.fillText('Comprobante digital provisto de manera segura.', 25, currentY + 11);
  };

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      setTimeout(() => {
        if (canvasRef.current) drawNoticeToCanvas(canvasRef.current);
      }, 100);
    }
  }, [isOpen, items, isDark, qrImagesLoaded]);

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Aviso_${recipientName.replace(/\s+/g, '_')}_${new Date().getTime().toString().slice(-4)}.png`;
    link.href = url;
    link.click();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [110, 260] 
    });

    // Outer Border
    doc.setDrawColor(accentColorRgb[0], accentColorRgb[1], accentColorRgb[2]);
    doc.setLineWidth(1.2);
    doc.rect(4, 4, 102, 252);

    // Title / Header
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(settings?.companyName?.toUpperCase() || 'CONTROL FINANCIERO', 55, 14, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('DOCUMENTO DE NOTIFICACIÓN DE SALDO', 55, 19, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(10, 24, 100, 24);

    // Subject title
    doc.setTextColor(accentColorRgb[0], accentColorRgb[1], accentColorRgb[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, 55, 29, { align: 'center' });

    // Details Grid Layout
    doc.setTextColor(115, 115, 115);
    doc.setFontSize(7.5);
    doc.text('RECIPIENTE / DESTINATARIO', 10, 37);
    doc.text('SITUACIÓN FISCAL', 75, 37);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(recipientName.slice(0, 30).toUpperCase(), 10, 42);
    doc.text(statusLabel, 75, 42);

    doc.setTextColor(115, 115, 115);
    doc.setFontSize(7.5);
    doc.text('FECHA DEL ENTRANTE', 10, 49);
    doc.text('REGISTRO DE CONTROL', 75, 49);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text(new Date().toLocaleDateString('es-ES'), 10, 54);
    doc.text('#PRV-' + new Date().getTime().toString().slice(-6), 75, 54);

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 59, 100, 59);

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 63, 90, 6, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DETALLE DEL MOVIMIENTO', 13, 67);
    doc.text('VALOR', 85, 67);

    let startY = 75;
    items.forEach((item) => {
      doc.setTextColor(51, 65, 85);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      const limitConcept = item.concept.length > 38 ? item.concept.slice(0, 36) + '...' : item.concept;
      doc.text(limitConcept, 13, startY);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      if (item.reference) {
        doc.text(item.reference, 13, startY + 4);
      }

      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text(formatCurrency(item.amount), 85, startY + 2);

      // Little dotted lines
      doc.setDrawColor(241, 245, 249);
      doc.line(10, startY + 7, 100, startY + 7);

      startY += 12;
    });

    // Total Card box
    startY = Math.max(startY, 120);
    doc.setFillColor(248, 250, 252);
    doc.rect(55, startY, 45, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(55, startY, 45, 18, 'D');

    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('VALOR TOTAL:', 58, startY + 6);

    doc.setFontSize(10.5);
    doc.setTextColor(accentColorRgb[0], accentColorRgb[1], accentColorRgb[2]);
    doc.text(formatCurrency(totalAmount), 58, startY + 13);

    // Payment info box in pdf de cuentas por cobrar
    startY = Math.max(startY, 120);
    doc.setFillColor(248, 250, 252);
    doc.rect(10, startY + 22, 90, 60, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, startY + 22, 90, 60, 'D');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('MÉTODOS DE PAGO / CUENTAS BANCARIAS', 14, startY + 27);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(79, 70, 229);
    doc.text('Todos los depósitos, transferencias y pagos son a nombre de Marcelo Gutama', 14, startY + 32);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('• Pichincha Ahorros: 2203066545', 14, startY + 37);
    doc.text('• Guayaquil Ahorros: 0032481285', 14, startY + 42);
    doc.text('• Coop JEP Ahorros: 406002489704', 14, startY + 47);
    doc.text('• Binance ID: 717956622', 14, startY + 52);
    doc.text('• PayPal ID: marcelogutama3eroa@gmail.com', 14, startY + 57);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Una vez hecho el depósito, transferencia o pago envíe la foto para corroborar.', 14, startY + 63);

    // QRs on PDF
    if (binanceImgRef.current && qrImagesLoaded) {
      try {
        doc.addImage(binanceImgRef.current, 'PNG', 20, startY + 66, 11, 11);
        doc.setFontSize(4.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(202, 138, 4); // Binance Pay Golden Yellow
        doc.text('QR BINANCE PAY', 25.5, startY + 79, { align: 'center' });
      } catch (err) {
        console.error("Error drawing PDF QR Binance:", err);
      }
    }
    if (paypalImgRef.current && qrImagesLoaded) {
      try {
        doc.addImage(paypalImgRef.current, 'PNG', 62, startY + 66, 11, 11);
        doc.setFontSize(4.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(0, 48, 135); // PayPal Deep Blue
        doc.text('QR PAYPAL ME', 67.5, startY + 79, { align: 'center' });
      } catch (err) {
        console.error("Error drawing PDF QR PayPal:", err);
      }
    }

    // Footnotes
    doc.setFont('Helvetica', 'oblique');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No corresponde a una factura fiscal de bienes.', 10, startY + 89);
    doc.text('Documento emitido dinámicamente y firmado de forma íntegra.', 10, startY + 92);

    doc.save(`Notificacion_${recipientName.replace(/\s+/g, '_')}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal body */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className={cn(
            "relative w-full max-w-xl p-6 sm:p-8 rounded-[2rem] border shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto text-left",
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          )}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6 shrink-0">
            <div>
              <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full", primaryColor, primaryBg, primaryBorder)}>
                Canales de Distribución
              </span>
              <h3 className={cn("text-lg font-black tracking-tight mt-2.5", isDark ? "text-white" : "text-slate-950")}>
                Emisión de Aviso Pendiente
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Selecciona la modalidad de entrega preferida para el contacto.
              </p>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-full border cursor-pointer hover:scale-105 transition-all",
                isDark ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-100 hover:bg-slate-50 text-slate-500"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core options container */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
            {/* option 1: Plain Text */}
            <div 
              onClick={handleCopyText}
              className={cn(
                "p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-lg flex flex-col items-center text-center gap-3 select-none active:scale-98",
                isDark ? "bg-slate-850/40 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-350"
              )}
            >
              <div className="h-10 w-10 bg-indigo-500/10 text-indigo-500 flex items-center justify-center rounded-xl border border-indigo-500/20">
                <Copy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Texto Plano</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Mensaje portapapeles / WhatsApp</p>
              </div>
            </div>

            {/* option 2: PDF Document */}
            <div 
              onClick={handleDownloadPDF}
              className={cn(
                "p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-lg flex flex-col items-center text-center gap-3 select-none active:scale-98",
                isDark ? "bg-slate-850/40 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-350"
              )}
            >
              <div className="h-10 w-10 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-xl border border-rose-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Reporte PDF</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Factura formal de liquidación</p>
              </div>
            </div>

            {/* option 3: Image Voucher */}
            <div 
              onClick={handleDownloadImage}
              className={cn(
                "p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-lg flex flex-col items-center text-center gap-3 select-none active:scale-98",
                isDark ? "bg-slate-850/40 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-350"
              )}
            >
              <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 flex items-center justify-center rounded-xl border border-emerald-500/20">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Imagen PNG</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Ficha gráfica descargable</p>
              </div>
            </div>
          </div>

          {/* Quick preview statement */}
          <div className="space-y-4 flex-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Vista Previa del Aviso</span>
            
            <div className={cn("p-5 rounded-2xl border font-mono text-xs overflow-y-auto max-h-[180px] leading-relaxed whitespace-pre-wrap text-left select-text",
              isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-700"
            )}>
              {getPlainText()}
            </div>
          </div>

          {/* Quick WhatsApp Share Button */}
          <div className="mt-6 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              onClick={handleCopyText}
              className={cn("w-full sm:w-auto px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 cursor-pointer",
                copied 
                  ? "bg-emerald-600 border-emerald-600 text-white" 
                  : isDark
                    ? "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '¡Copiado!' : 'Copiar Portapapeles'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Enviar por WhatsApp
            </button>
          </div>

          {/* Hidden Canvas for background export */}
          <canvas ref={canvasRef} className="hidden" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
