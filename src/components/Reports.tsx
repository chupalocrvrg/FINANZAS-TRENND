import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Filter, 
  FileText, 
  Download, 
  Database,
  BarChart3,
  CheckCircle,
  Clock,
  Briefcase,
  Search
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DatePreset = 'today' | 'week' | 'month' | 'custom';
type ReportModule = 'consolidated' | 'services' | 'updates' | 'ledger';

export function Reports() {
  const { user, settings } = useAuth();
  const isDark = settings?.theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');

  // Filters state
  const [module, setModule] = useState<ReportModule>('consolidated');
  const [preset, setPreset] = useState<DatePreset>('month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to start of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Loaded matches state
  const [loading, setLoading] = useState(false);
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [updatesData, setUpdatesData] = useState<any[]>([]);
  const [ledgerData, setLedgerData] = useState<any[]>([]);

  // Analytics State
  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    pendingPayments: 0,
    totalRecords: 0
  });

  // Calculate filtering date boundary based on preset
  useEffect(() => {
    if (preset !== 'custom') {
      const now = new Date();
      let start = new Date();
      if (preset === 'today') {
        start.setHours(0,0,0,0);
      } else if (preset === 'week') {
        start.setDate(now.getDate() - 7);
      } else if (preset === 'month') {
        start.setMonth(now.getMonth() - 1);
      }
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  }, [preset]);

  // Fetch report data on filter change
  const fetchReportData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Create lower bound and upper bound dates
      const startSecs = new Date(startDate + 'T00:00:00');
      const endSecs = new Date(endDate + 'T23:59:59');

      // Fetch active modules in parallel
      const servicesPromise = getDocs(query(collection(db, 'digital_services'), where('ownerId', '==', user.uid)));
      const updatesPromise = getDocs(query(collection(db, 'transactions'), where('ownerId', '==', user.uid)));
      const ledgerPromise = getDocs(query(collection(db, 'ledger'), where('ownerId', '==', user.uid)));

      const [servicesSnap, updatesSnap, ledgerSnap] = await Promise.all([
        servicesPromise,
        updatesPromise,
        ledgerPromise
      ]);

      // Parse Digital Services inside date boundaries
      const services = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter(item => {
        if (!item.expirationDate) return true; // Keep or skip based on preference
        const dateObj = new Date(item.expirationDate);
        return dateObj >= startSecs && dateObj <= endSecs;
      });

      // Parse Updates
      const updates = updatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter(item => {
        // Find if field updated / date exists
        const rawDate = item.date || item.updated;
        if (!rawDate) return false;
        const dateObj = new Date(rawDate);
        return dateObj >= startSecs && dateObj <= endSecs;
      });

      // Parse Treasury movements
      const ledger = ledgerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter(item => {
        if (!item.date) return false;
        const dateObj = new Date(item.date);
        return dateObj >= startSecs && dateObj <= endSecs;
      });

      setServicesData(services);
      setUpdatesData(updates);
      setLedgerData(ledger);

      // Perform analytics metrics consolidation
      let income = 0;
      let expense = 0;
      let pending = 0;
      let recordsCount = 0;

      // 1. Calculations from digital services
      services.forEach(item => {
        const itemRevenue = parseFloat(item.revenue || '0');
        const itemCost = parseFloat(item.cost || '0');
        
        income += itemRevenue;
        expense += itemCost;
        if (!item.isPaid) {
          pending += itemRevenue;
        }
      });

      // 2. Calculations from ANT updates
      updates.forEach(item => {
        const rate = parseFloat(item.chargedRate || '0');
        income += rate;
        if (!item.isPaid) {
          pending += rate;
        }
      });

      // 3. Treasury entries (avoid double-counting from automated entries if possible, or include consolidated ledger values directly) We include directly
      ledger.forEach(item => {
        const amt = parseFloat(item.amount || '0');
        if (amt > 0) {
          // If transaction states exist, let's consolidates
          income += amt;
        } else {
          expense += Math.abs(amt);
        }
        if (item.isPending) {
          pending += Math.abs(amt);
        }
      });

      recordsCount = services.length + updates.length + ledger.length;

      setMetrics({
        totalIncome: income,
        totalExpense: expense,
        netProfit: income - expense,
        pendingPayments: pending,
        totalRecords: recordsCount
      });

    } catch (err) {
      console.error("Error generating customized reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [module, startDate, endDate, user]);

  // Export dynamically to CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `Reporte_${module}_${startDate}_al_${endDate}.csv`;

    if (module === 'services') {
      headers = ['Plataforma/Servicio', 'Cliente', 'Costo', 'PVP/Ingreso', 'E-mail', 'Clave', 'Vence', 'Estado Pago'];
      rows = servicesData.map(s => [
        s.name,
        s.clientName,
        s.cost,
        s.revenue,
        s.email || '-',
        s.password || '-',
        s.expirationDate || '-',
        s.isPaid ? 'Pagado' : 'Pendiente'
      ]);
    } else if (module === 'updates') {
      headers = ['Intermediario', 'Cliente Final', 'Establecimiento/Almacén', 'Tarifa Cobrada', 'Estado Pago', 'Fecha'];
      rows = updatesData.map(u => [
        u.intermediaryName,
        u.finalClientName,
        u.warehouse,
        u.chargedRate,
        u.isPaid ? 'Pagado' : 'Pendiente',
        u.date || u.updated || '-'
      ]);
    } else if (module === 'ledger') {
      headers = ['Fecha', 'Categoría', 'Descripción', 'Monto', 'Tipo', 'Estado'];
      rows = ledgerData.map(l => [
        l.date,
        l.category,
        l.description || '-',
        l.amount,
        l.amount > 0 ? 'Ingreso' : 'Egreso',
        l.isPending ? 'Pendiente' : 'Asentado'
      ]);
    } else {
      // Consolidated
      headers = ['Módulo/Origen', 'Descripción/Nombre', 'Cliente/Detalle', 'Monto Financiero', 'Estado'];
      servicesData.forEach(s => rows.push(['Servicio Digital', s.name, s.clientName, `$ ${s.revenue}`, s.isPaid ? 'Pagado' : 'Pendiente']));
      updatesData.forEach(u => rows.push(['Actualización ANT', u.warehouse, u.finalClientName, `$ ${u.chargedRate}`, u.isPaid ? 'Pagado' : 'Pendiente']));
      ledgerData.forEach(l => rows.push(['Tesorería Movimiento', l.category, l.description || '-', `$ ${l.amount}`, l.isPending ? 'Pendiente' : 'Liquidado']));
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF with Autotable representation
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header Style
    doc.setFillColor(30, 41, 59); // deep slate
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('Helvetica', 'bold');
    doc.text(settings?.companyName?.toUpperCase() || 'CONTROL FINANCIERO', 14, 18);

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    const moduloTitle = module === 'consolidated' ? 'REPORTE GENERAL INTEGRADO' :
                        module === 'services' ? 'MÓDULO: SERVICIOS DIGITALES' :
                        module === 'updates' ? 'MÓDULO: ACTUALIZACIONES ANT (VEHÍCULOS)' :
                        'MÓDULO: MOVIMIENTOS EN TESORERÍA / CAJA';
                        
    doc.text(moduloTitle, 14, 25);
    doc.text(`Rango del Reporte: ${startDate} al ${endDate}`, 14, 30);
    doc.text(`Fecha Impresión: ${new Date().toLocaleDateString()}`, 155, 30);

    // Consolidated Metrics summary block for the PDF
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.text('Resumen del Ejercicio Financiero en este Rango:', 14, 52);

    autoTable(doc, {
      startY: 56,
      head: [['Métrica Financiera', 'Monto Consolidado de Referencia']],
      body: [
        ['Total Ingresos Estimados / Totales', formatCurrency(metrics.totalIncome)],
        ['Total Egresos / Costos / Consumo', formatCurrency(metrics.totalExpense)],
        ['Utilidad Neta del Ejercicio', formatCurrency(metrics.netProfit)],
        ['Saldos / Facturación Pendientes de Cobro', formatCurrency(metrics.pendingPayments)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } }
    });

    // Content table depending on active module
    const listY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.text('Detalle de Registros Coincidentes:', 14, listY);

    let head: string[][] = [];
    let body: any[][] = [];

    if (module === 'services') {
      head = [['Servicios Digitales / Cuenta', 'Cliente', 'Costo', 'PVP', 'Vence', 'Estado']];
      body = servicesData.map(s => [
        s.name,
        s.clientName,
        formatCurrency(s.cost),
        formatCurrency(s.revenue),
        s.expirationDate || '-',
        s.isPaid ? 'PAGADO' : 'PENDIENTE'
      ]);
    } else if (module === 'updates') {
      head = [['Establecimiento / Ref', 'Cliente Final', 'Tarifa Cobra', 'Estado Pago', 'Fecha Realización']];
      body = updatesData.map(u => [
        u.warehouse || u.intermediaryName || 'Varios',
        u.finalClientName,
        formatCurrency(u.chargedRate),
        u.isPaid ? 'PAGADO' : 'PENDIENTE',
        u.date || u.updated || '-'
      ]);
    } else if (module === 'ledger') {
      head = [['Fecha', 'Categoría / Detalle', 'Descripción', 'Surgimiento', 'Monto']];
      body = ledgerData.map(l => [
        l.date,
        l.category,
        l.description || '-',
        l.amount > 0 ? 'INGRESO' : 'EGRESO',
        formatCurrency(l.amount)
      ]);
    } else {
      // Consolidated output
      head = [['Módulo', 'Origen / Concepto', 'Beneficiario / Cliente', 'Suma Relacionada', 'Estado']];
      servicesData.forEach(s => body.push(['Servicios Digitales', s.name, s.clientName, formatCurrency(s.revenue), s.isPaid ? 'PAGADO' : 'PENDIENTE']));
      updatesData.forEach(u => body.push(['Actualización (ANT)', u.warehouse, u.finalClientName, formatCurrency(u.chargedRate), u.isPaid ? 'PAGADO' : 'PENDIENTE']));
      ledgerData.forEach(l => body.push(['Movimiento Caja', l.category, l.description || '-', formatCurrency(l.amount), l.isPending ? 'PENDIENTE' : 'LIQUIDADO']));
    }

    autoTable(doc, {
      startY: listY + 4,
      head: head,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
      didParseCell: function(data) {
        if (data.section === 'body' && (data.column.index === 2 || data.column.index === 3 || data.column.index === 4)) {
          // color amounts representation safely if we can matches number
          const textVal = String(data.cell.raw);
          if (textVal.includes('-') && data.column.index === 4) {
             data.cell.styles.textColor = [220, 38, 38];
          }
        }
      }
    });

    // Save File
    doc.save(`Reporte_Financiero_${module}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredServicesData = servicesData.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (s.name?.toLowerCase().includes(term) || s.clientName?.toLowerCase().includes(term) || s.category?.toLowerCase().includes(term));
  });

  const filteredUpdatesData = updatesData.filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (u.warehouse?.toLowerCase().includes(term) || u.finalClientName?.toLowerCase().includes(term) || u.intermediaryName?.toLowerCase().includes(term));
  });

  const filteredLedgerData = ledgerData.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (l.category?.toLowerCase().includes(term) || l.description?.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 lg:px-8 py-6">
      {/* Visual Header card */}
      <div className={cn("p-6 rounded-3xl border relative overflow-hidden text-left shadow-sm", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className={cn("text-2xl font-black uppercase tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <BarChart3 className="w-6 h-6 text-indigo-500" />
              Módulo de Reportes & Estadísticas
            </h1>
            <p className={cn("text-xs font-semibold select-none", isDark ? "text-slate-400" : "text-slate-500")}>
              Conectado al motor Firestore de alta fidelidad. Genere, descargue o exporte balances en tiempo real.
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-slate-200 dark:border-slate-705"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              CSV Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/10"
            >
              <FileText className="w-4 h-4" />
              Exportar Reporte (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* Primary Configuration filters drawer */}
      <div className={cn("p-6 rounded-3xl border text-left", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Module filter */}
          <div className="space-y-1.5Col">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1">
              <Database className="w-3 h-3" /> Módulo / Fuente de Información
            </label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value as ReportModule)}
              className={cn("w-full mt-2 p-3.5 rounded-xl border text-xs font-bold outline-none", isDark ? "bg-slate-950 border-slate-805 text-white" : "bg-slate-50 border-slate-150 focus:bg-white")}
            >
              <option value="consolidated">General (Consolidado)</option>
              <option value="services">Servicios Digitales solamente</option>
              <option value="updates">Actualizaciones ANT solamente</option>
              <option value="ledger">Movimientos de Tesorería (Caja)</option>
            </select>
          </div>

          {/* Date presets selection */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Rango Preconfigurado
            </label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as DatePreset)}
              className={cn("w-full mt-2 p-3.5 rounded-xl border text-xs font-bold outline-none", isDark ? "bg-slate-950 border-slate-805 text-white" : "bg-slate-50 border-slate-150 focus:bg-white")}
            >
              <option value="today">Hoy Comercial</option>
              <option value="week">Últimos 7 Días</option>
              <option value="month">Este Mes / Últimos 30 días</option>
              <option value="custom">Rango Personalizado</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 block">Fecha Inicio</label>
            <input
              type="date"
              value={startDate}
              disabled={preset !== 'custom'}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn("w-full mt-2 p-3 rounded-xl border text-xs font-bold outline-none", isDark ? "bg-slate-950 border-slate-805 text-white" : "bg-slate-50 border-slate-150 focus:bg-white disabled:opacity-50")}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 block">Fecha Término</label>
            <input
              type="date"
              value={endDate}
              disabled={preset !== 'custom'}
              onChange={(e) => setEndDate(e.target.value)}
              className={cn("w-full mt-2 p-3 rounded-xl border text-xs font-bold outline-none", isDark ? "bg-slate-950 border-slate-805 text-white" : "bg-slate-50 border-slate-150 focus:bg-white disabled:opacity-50")}
            />
          </div>
        </div>
      </div>

      {/* Analytics statistics counters panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <div className={cn("p-5 rounded-2xl border flex items-center gap-4 transition-all hover:-translate-y-0.5", isDark ? "bg-slate-900 border-slate-850" : "bg-white border-slate-100 shadow-sm")}>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Ingresos</span>
            <div className="text-lg font-mono font-bold text-emerald-600">{formatCurrency(metrics.totalIncome)}</div>
          </div>
        </div>

        <div className={cn("p-5 rounded-2xl border flex items-center gap-4 transition-all hover:-translate-y-0.5", isDark ? "bg-slate-900 border-slate-850" : "bg-white border-slate-100 shadow-sm")}>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Gastos/Costo</span>
            <div className="text-lg font-mono font-bold text-rose-500">{formatCurrency(metrics.totalExpense)}</div>
          </div>
        </div>

        <div className={cn("p-5 rounded-2xl border flex items-center gap-4 transition-all hover:-translate-y-0.5", isDark ? "bg-slate-900 border-slate-850" : "bg-white border-slate-100 shadow-sm")}>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Utilidad Neta</span>
            <div className={cn("text-lg font-mono font-bold", metrics.netProfit >= 0 ? "text-indigo-500" : "text-rose-500")}>
              {formatCurrency(metrics.netProfit)}
            </div>
          </div>
        </div>

        <div className={cn("p-5 rounded-2xl border flex items-center gap-4 transition-all hover:-translate-y-0.5", isDark ? "bg-slate-900 border-slate-850" : "bg-white border-slate-100 shadow-sm")}>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Por Cobrar (Saldos)</span>
            <div className="text-lg font-mono font-bold text-amber-500">{formatCurrency(metrics.pendingPayments)}</div>
          </div>
        </div>
      </div>

      {/* Main consolidated matching table */}
      <div className={cn("p-6 rounded-3xl border overflow-hidden text-left space-y-4", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
        {/* Centered Search Bar */}
        <div className="flex justify-center w-full">
          <div className="relative w-full max-w-xl">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
              <Search className="w-5 h-5 animate-pulse text-indigo-500" />
            </span>
            <input
              type="text"
              placeholder="🔍 Búsqueda general en reportes (por concepto, cliente, correo o detalle)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-inner text-center tracking-wide",
                isDark 
                  ? "border-slate-850 bg-slate-950/45 text-white placeholder-slate-500 focus:bg-slate-950" 
                  : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white"
              )}
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 border-b border-slate-100/10 pb-3">
          <span className="text-xs font-black uppercase tracking-widest text-sky-500">
            Registros Coincidentes (Totales: {filteredServicesData.length + filteredUpdatesData.length + filteredLedgerData.length})
          </span>
          {loading && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100/10 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2.5 pb-3">Módulo / Origen</th>
                <th className="py-2.5 pb-3">Concepto / Detalle</th>
                <th className="py-2.5 pb-3">Cliente / Tercero</th>
                <th className="py-2.5 pb-3 text-right">Monto</th>
                <th className="py-2.5 pb-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/5 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Sincronizando información de bases de datos...</td>
                </tr>
              ) : (filteredServicesData.length + filteredUpdatesData.length + filteredLedgerData.length) === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Ningún registro coincide con la búsqueda o el rango seleccionado.</td>
                </tr>
              ) : (
                <>
                  {(module === 'consolidated' || module === 'services') ? filteredServicesData.map(s => (
                    <tr key={s.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-3 text-slate-400">Servicios Digitales</td>
                      <td className="py-3 font-bold">{s.name}</td>
                      <td className="py-3 text-slate-550 dark:text-slate-350">{s.clientName}</td>
                      <td className="py-3 text-right font-mono text-emerald-500 font-bold">{formatCurrency(s.revenue)}</td>
                      <td className="py-3 text-center">
                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black tracking-wide uppercase", s.isPaid ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-505")}>
                          {s.isPaid ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  )) : null}

                  {(module === 'consolidated' || module === 'updates') ? filteredUpdatesData.map(u => (
                    <tr key={u.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-3 text-slate-400">Actualización (ANT)</td>
                      <td className="py-3 font-bold">{u.warehouse || 'Oficina / Almacén'}</td>
                      <td className="py-3 text-slate-550 dark:text-slate-350">{u.finalClientName}</td>
                      <td className="py-3 text-right font-mono text-emerald-500 font-bold">{formatCurrency(u.chargedRate)}</td>
                      <td className="py-3 text-center">
                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black tracking-wide uppercase", u.isPaid ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-505")}>
                          {u.isPaid ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  )) : null}

                  {(module === 'consolidated' || module === 'ledger') ? filteredLedgerData.map(l => (
                    <tr key={l.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-3 text-slate-400">Tesorería (Libro)</td>
                      <td className="py-3 font-bold">{l.category}</td>
                      <td className="py-3 text-slate-550 dark:text-slate-350">{l.description || '-'}</td>
                      <td className={cn("py-3 text-right font-mono font-bold", l.amount >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {l.amount >= 0 ? `+${formatCurrency(l.amount)}` : formatCurrency(l.amount)}
                      </td>
                      <td className="py-3 text-center">
                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black tracking-wide uppercase", l.isPending ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700")}>
                          {l.isPending ? 'Pendiente' : 'Asentado'}
                        </span>
                      </td>
                    </tr>
                  )) : null}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
