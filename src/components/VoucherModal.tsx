import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, FileText, Image as ImageIcon, Send, Copy, Check } from 'lucide-react';
import { cn, formatCurrency, PAYMENT_INSTRUCTIONS_TXT } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { SYSTEM_UPDATES } from '../data/updates';
import jsPDF from 'jspdf';

export interface VoucherDetail {
  label: string;
  value: string;
}

export interface VoucherData {
  title: string;
  subtitle?: string;
  id: string;
  date: string;
  clientName: string;
  clientContact?: string;
  details: VoucherDetail[];
  amount: number;
  status: 'paid' | 'pending' | 'expired';
  paymentMethod?: string;
}

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: VoucherData | null;
}

export function VoucherModal({ isOpen, onClose, voucher }: VoucherModalProps) {
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

  // Generate image representation using canvas
  const drawVoucherToCanvas = (canvas: HTMLCanvasElement, v: VoucherData) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas scaling for high resolution (Retina support)
    const scale = 2;
    canvas.width = 400 * scale;
    canvas.height = (v.status === 'paid' ? 580 : 780) * scale;
    ctx.scale(scale, scale);

    // Context drawing settings
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, v.status === 'paid' ? 580 : 780);

    // Draw solid border accent
    ctx.strokeStyle = v.status === 'paid' ? '#10b981' : v.status === 'expired' ? '#f43f5e' : '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 380, (v.status === 'paid' ? 560 : 760));

    // Header Company Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(settings?.companyName?.toUpperCase() || 'CONTROL FINANCIERO', 200, 45);

    ctx.font = '500 11px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('COMPROBANTE DE TRANSACCIÓN DIGITAL', 200, 62);

    // Double dotted line
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, 75);
    ctx.lineTo(370, 75);
    ctx.stroke();

    // Section Title
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(v.title, 200, 95);

    if (v.subtitle) {
      ctx.font = '500 10px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(v.subtitle, 200, 110);
    }

    // Status Badge
    const badgeColor = v.status === 'paid' ? '#e6f4ea' : v.status === 'expired' ? '#fce8e6' : '#fef7e0';
    const textColor = v.status === 'paid' ? '#137333' : v.status === 'expired' ? '#c5221f' : '#b06000';
    const statusText = v.status === 'paid' ? 'COBRADO / PAGADO' : v.status === 'expired' ? 'EXPIRADO' : 'PENDIENTE';

    ctx.fillStyle = badgeColor;
    // rounded rect
    ctx.beginPath();
    ctx.roundRect(140, 125, 120, 24, 6);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(statusText, 200, 141);

    // Info details layout
    ctx.setLineDash([]); // Reset
    ctx.textAlign = 'left';

    let currentY = 175;
    const drawItem = (label: string, val: string) => {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(label.toUpperCase(), 35, currentY);

      ctx.fillStyle = '#1e293b';
      ctx.font = '500 11px sans-serif';
      ctx.fillText(val, 150, currentY);

      // Light underline
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(35, currentY + 6);
      ctx.lineTo(365, currentY + 6);
      ctx.stroke();

      currentY += 28;
    };

    drawItem('Comprobante #', v.id.slice(0, 8).toUpperCase() || 'REF-N/A');
    drawItem('Fecha', v.date);
    drawItem('Cliente', v.clientName);

    v.details.forEach(item => {
      if (currentY < 420) {
        drawItem(item.label, item.value || '-');
      }
    });

    if (v.paymentMethod) {
      drawItem('Método Pago', v.paymentMethod);
    }

    // Total Amount Box
    currentY += 10;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(35, currentY - 15, 330, 45, 8);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(35, currentY - 15, 330, 45);

    const isDigital = v.subtitle?.toLowerCase().includes('digital') || 
                      v.subtitle?.toLowerCase().includes('suscripción') || 
                      v.title.toLowerCase().includes('venta:');

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(isDigital ? 'VALOR PVP' : 'TOTAL TRANSACCIÓN', 50, currentY + 12);

    ctx.fillStyle = v.status === 'paid' ? '#10b981' : '#f59e0b';
    ctx.font = 'bold 18 monospace';
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(v.amount), 345, currentY + 14);

    // PAYMENT METHODS BLOCK ON CANVAS
    if (v.status !== 'paid') {
      currentY += 45;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(35, currentY - 15, 330, 185, 8);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(35, currentY - 15, 330, 185);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('MÉTODOS DE PAGO / CUENTAS BANCARIAS', 45, currentY + 0);

      ctx.font = 'bold italic 8px sans-serif';
      ctx.fillStyle = '#4f46e5';
      ctx.fillText('Todos los depósitos, transferencias y pagos son a nombre de Marcelo Gutama', 45, currentY + 12);

      ctx.font = 'normal 8.2px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('• Ahorros Pichincha: 2203066545', 45, currentY + 25);
      ctx.fillText('• Ahorros Guayaquil: 0032481285', 45, currentY + 38);
      ctx.fillText('• Ahorros Coop JEP: 406002489704', 45, currentY + 51);
      ctx.fillText('• Binance ID: 717956622', 45, currentY + 64);
      ctx.fillText('• PayPal ID: marcelogutama3eroa@gmail.com', 45, currentY + 77);

      ctx.font = 'bold italic 7.5px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Una vez hecho el depósito, transferencia o pago envíe la foto para corroborar.', 45, currentY + 92);

      // Side-by-side QR Codes
      if (binanceImgRef.current && qrImagesLoaded) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(80, currentY + 101, 55, 55);
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(80, currentY + 101, 55, 55);
        try {
          ctx.drawImage(binanceImgRef.current, 82, currentY + 103, 51, 51);
        } catch (err) {
          console.error("Canvas drawImage Binance error:", err);
        }
        ctx.fillStyle = '#ca8a04';
        ctx.font = 'bold 7.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QR BINANCE PAY', 107, currentY + 167);
      }

      if (paypalImgRef.current && qrImagesLoaded) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(260, currentY + 101, 55, 55);
        ctx.strokeStyle = '#003087';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(260, currentY + 101, 55, 55);
        try {
          ctx.drawImage(paypalImgRef.current, 262, currentY + 103, 51, 51);
        } catch (err) {
          console.error("Canvas drawImage PayPal error:", err);
        }
        ctx.fillStyle = '#003087';
        ctx.font = 'bold 7.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QR PAYPAL ME', 287, currentY + 167);
      }

      // Barcode rendering footer (simulated)
      ctx.textAlign = 'center';
      currentY += 195;
    } else {
      // Barcode rendering footer (simulated)
      ctx.textAlign = 'center';
      currentY += 20;
    }
    
    // Draw vertical barcode lines nicely centered
    ctx.fillStyle = '#000000';
    const codePattern = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 2, 3, 1, 2];
    const itemStep = 2.5; 
    const barHeight = 28; 
    
    let barcodeTotalWidth = 0;
    codePattern.forEach((w) => {
      barcodeTotalWidth += w * itemStep;
    });
    
    let startX = (400 - barcodeTotalWidth) / 2;
    
    codePattern.forEach((width, index) => {
      if (index % 2 === 0) {
        ctx.fillRect(startX, currentY, width * itemStep, barHeight);
      }
      startX += width * itemStep;
    });

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`*${v.id.toUpperCase()}*`, 200, currentY + barHeight + 11);

    ctx.font = 'italic 9.5px sans-serif';
    ctx.fillText('¡Gracias por su confianza! Sistema de Control de Caja.', 200, currentY + barHeight + 26);
  };

  const isDigitalService = voucher ? (voucher.subtitle?.toLowerCase().includes('digital') || 
                                      voucher.subtitle?.toLowerCase().includes('suscripción') || 
                                      voucher.title.toLowerCase().includes('venta:')) : false;

  const filteredDetails = voucher && isDigitalService 
    ? voucher.details.filter(d => {
        const labelLower = d.label.toLowerCase();
        const forbiddenWords = ['proveedor', 'ganancia', 'utilidad', 'costo', 'cost', 'supplier', 'profit', 'markup', 'provider', 'basecost', 'net'];
        return !forbiddenWords.some(word => labelLower.includes(word));
      })
    : voucher?.details || [];

  useEffect(() => {
    if (isOpen && voucher && canvasRef.current) {
      setTimeout(() => {
        if (canvasRef.current) {
          drawVoucherToCanvas(canvasRef.current, {
            ...voucher,
            details: filteredDetails
          });
        }
      }, 100);
    }
  }, [isOpen, voucher, filteredDetails, qrImagesLoaded]);

  if (!voucher) return null;

  // Handles PNG image trigger
  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Comprobante_${voucher.clientName.replace(/\s+/g, '_')}_${voucher.id.slice(0, 6)}.png`;
    link.href = url;
    link.click();
  };

  // Handles PDF compilation trigger via jsPDF
  const handleDownloadPDF = () => {
    const isPaid = voucher.status === 'paid';
    const isDigital = voucher.subtitle?.toLowerCase().includes('digital') || 
                      voucher.subtitle?.toLowerCase().includes('suscripción') || 
                      voucher.title.toLowerCase().includes('venta:');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, isPaid ? 170 : 255] // Much more compact ticket when already paid
    });
    
    // Aesthetic Ticket Border
    doc.setDrawColor(isPaid ? 16 : 244, isPaid ? 185 : 63, isPaid ? 129 : 94);
    doc.setLineWidth(1.5);
    doc.rect(3, 3, 94, isPaid ? 164 : 249);

    // Title / Header
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(settings?.companyName?.toUpperCase() || 'CONTROL FINANCIERO', 50, 12, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('COMPROBANTE DE TRANSACCIÓN DIGITAL', 50, 17, { align: 'center' });

    // Separator line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(10, 22, 90, 22);

    doc.setTextColor(51, 65, 85);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(voucher.title, 50, 27, { align: 'center' });

    // Status Stamp Box
    doc.setFillColor(isPaid ? 230 : 252, isPaid ? 244 : 232, isPaid ? 234 : 230);
    doc.rect(30, 32, 40, 7, 'F');
    doc.setTextColor(isPaid ? 19 : 197, isPaid ? 115 : 34, isPaid ? 51 : 31);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text(isPaid ? 'PAGADO / COBRADO' : 'PENDIENTE', 50, 36.5, { align: 'center' });

    // Fields
    let y = 48;
    const writeField = (label: string, val: string) => {
      doc.setTextColor(148, 163, 184);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(label.toUpperCase(), 10, y);

      doc.setTextColor(30, 41, 59);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(val || '-', 40, y);

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(10, y + 2, 90, y + 2);

      y += 8;
    };

    writeField('Comprobante #', voucher.id.slice(0, 10).toUpperCase());
    writeField('Fecha', voucher.date);
    writeField('Cliente', voucher.clientName);

    filteredDetails.forEach(det => {
      if (y < 120) {
        writeField(det.label, det.value);
      }
    });

    if (voucher.paymentMethod) {
      writeField('Método Pago', voucher.paymentMethod);
    }

    // Total box
    y += 4;
    doc.setFillColor(248, 250, 252);
    doc.rect(10, y, 80, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 80, 12, 'S');

    doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(isDigital ? 'VALOR PVP' : 'TOTAL TRANSACCIÓN', 14, y + 7.5);

    doc.setTextColor(isPaid ? 16 : 245, isPaid ? 185 : 158, isPaid ? 129 : 11);
    doc.setFont('Courier', 'bold');
    doc.setFontSize(12);
    doc.text(formatCurrency(voucher.amount), 86, y + 8, { align: 'right' });

    if (!isPaid) {
      // Payment Accounts on PDF (Only drawn for unpaid/pending receipts)
      y += 18;
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y, 80, 60, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, y, 80, 60, 'S');

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('MÉTODOS DE PAGO / CUENTAS BANCARIAS', 14, y + 5);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(79, 70, 229);
      doc.text('Todos los depósitos, transferencias y pagos son a nombre de Marcelo Gutama', 14, y + 10);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text('• Pichincha Ahorros: 2203066545', 14, y + 15);
      doc.text('• Guayaquil Ahorros: 0032481285', 14, y + 20);
      doc.text('• Coop JEP Ahorros: 406002489704', 14, y + 25);
      doc.text('• Binance ID: 717956622', 14, y + 30);
      doc.text('• PayPal ID: marcelogutama3eroa@gmail.com', 14, y + 35);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Una vez hecho el depósito, transferencia o pago envíe la foto para corroborar.', 14, y + 41);

      // QRs on PDF
      if (binanceImgRef.current && qrImagesLoaded) {
        try {
          doc.addImage(binanceImgRef.current, 'PNG', 20, y + 44, 11, 11);
          doc.setFontSize(4.5);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(202, 138, 4); // Clear gold color for Binance Pay
          doc.text('QR BINANCE PAY', 25.5, y + 57, { align: 'center' });
        } catch (err) {
          console.error("Error drawing PDF QR Binance:", err);
        }
      }
      if (paypalImgRef.current && qrImagesLoaded) {
        try {
          doc.addImage(paypalImgRef.current, 'PNG', 58, y + 44, 11, 11);
          doc.setFontSize(4.5);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(0, 48, 135); // Classic deep blue for PayPal me
          doc.text('QR PAYPAL ME', 63.5, y + 57, { align: 'center' });
        } catch (err) {
          console.error("Error drawing PDF QR PayPal:", err);
        }
      }
      y += 68;
    } else {
      y += 15;
    }

    // Legal / bottom footer text
    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('¡Gracias por su preferencia!', 50, y, { align: 'center' });
    doc.text('Documento soportado digitalmente', 50, y + 4, { align: 'center' });

    doc.save(`Recibo_${voucher.clientName.replace(/\s+/g, '_')}.pdf`);
  };

  // Prepares the WhatsApp content message
  const handleShareWhatsApp = () => {
    const isPaid = voucher.status === 'paid';
    const detailsTxt = filteredDetails.map(d => `*${d.label}:* ${d.value}`).join('\n');
    const instructions = isPaid ? '' : `\n\n${PAYMENT_INSTRUCTIONS_TXT}`;
    const text = `*COMPROBANTE DE TRANSACCIÓN* ✅\n--------------------------------\n*Empresa:* ${settings?.companyName || 'Caja Digital'}\n*Servicio:* ${voucher.title}\n*Comprobante:* #${voucher.id.slice(0, 8).toUpperCase()}\n*Fecha:* ${voucher.date}\n*Cliente:* ${voucher.clientName}\n${detailsTxt}\n--------------------------------\n*${isDigitalService ? 'Valor PVP' : 'Monto Total'}:* *${formatCurrency(voucher.amount)}*\n*Estado:* ${voucher.status === 'paid' ? 'PAGADO ✅' : 'PENDIENTE ⚠️'}\n\n¡Gracias por su preferencia!${instructions}`;
    const encoded = encodeURIComponent(text);
    
    // Direct popup link to WA
    const finalUrl = `https://api.whatsapp.com/send?phone=${voucher.clientContact?.replace(/[^0-9]/g, '') || ''}&text=${encoded}`;
    window.open(finalUrl, '_blank');
  };

  // Copy text support
  const handleCopyText = () => {
    const isPaid = voucher.status === 'paid';
    const detailsTxt = filteredDetails.map(d => `${d.label}: ${d.value}`).join('\n');
    const instructions = isPaid ? '' : `\n\n${PAYMENT_INSTRUCTIONS_TXT.replace(/\*/g, '')}`;
    const text = `COMPROBANTE DE TRANSACCIÓN\n--------------------------------\nEmpresa: ${settings?.companyName || 'Caja Digital'}\nServicio: ${voucher.title}\nComprobante: #${voucher.id.slice(0, 8).toUpperCase()}\nFecha: ${voucher.date}\nCliente: ${voucher.clientName}\n${detailsTxt}\n--------------------------------\n${isDigitalService ? 'Valor PVP' : 'Monto Total'}: ${formatCurrency(voucher.amount)}\nEstado: ${voucher.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}\n\n¡Gracias por su preferencia!${instructions}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.35 }}
            className={cn(
              "relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row gap-6 p-6",
              isDark ? "bg-slate-900 border-slate-850" : "bg-white border-slate-100"
            )}
          >
            {/* Left Column: Canvas Preview (Beautiful receipt) */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", isDark ? "text-slate-400" : "text-slate-500")}>
                Vista Previa del Ticket
              </span>
              <div className="border border-slate-205/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg bg-white p-1">
                <canvas 
                  ref={canvasRef} 
                  className="w-[280px] h-[392px] rounded-xl"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
            </div>

            {/* Right Column: Controls & Actions */}
            <div className="flex-1 flex flex-col justify-between text-left space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      Acciones de Emisión
                    </h3>
                    <p className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-slate-500")}>
                      Exporte o comparta el comprobante.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className={cn(
                      "p-1.5 rounded-full transition-colors",
                      isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className={cn("p-4 rounded-2xl border text-xs space-y-1 bg-slate-50 dark:bg-slate-950/20", isDark ? "border-slate-800" : "border-slate-100")}>
                  <div className="flex justify-between font-bold"><span className="text-slate-450">Cliente:</span> <span className={isDark ? "text-slate-100" : "text-slate-800"}>{voucher.clientName}</span></div>
                  <div className="flex justify-between font-bold"><span className="text-slate-450">Servicio:</span> <span className="text-indigo-500 font-black">{voucher.title}</span></div>
                  <div className="flex justify-between font-bold"><span className="text-slate-450">{isDigitalService ? 'Valor PVP:' : 'Total:'}</span> <span className="font-mono text-indigo-500 font-extrabold">{formatCurrency(voucher.amount)}</span></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Guardar como PDF
                </button>

                <button
                  onClick={handleDownloadImage}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
                >
                  <ImageIcon className="w-4 h-4" />
                  Guardar como Imagen (PNG)
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
                >
                  <Send className="w-4 h-4" />
                  Enviar por WhatsApp
                </button>

                <button
                  onClick={handleCopyText}
                  className={cn(
                    "w-full flex items-center justify-center gap-2.5 px-4 py-3 border font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer",
                    copied 
                      ? "bg-indigo-600 text-white border-indigo-600" 
                      : isDark
                        ? "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  )}
                >
                  {copied ? <Check className="w-4 h-4 animate-scale" /> : <Copy className="w-4 h-4" />}
                  {copied ? '¡Copiado al Portapapeles!' : 'Copiar Texto del Recibo'}
                </button>
              </div>
              
              <div className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider">
                {SYSTEM_UPDATES[0]?.version || 'V4.0.0'} • Control Digital
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
