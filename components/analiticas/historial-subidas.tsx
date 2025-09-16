"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Trash2, Loader2 } from "lucide-react";
import type { DocumentType } from "@/types/document.types";

// Definir tipos
const DOCUMENT_TYPES = ["FC", "ND", "DS", "RP"] as const;

type UploadedRow = {
  id: number;
  file_name: string;
  document_type: DocumentType;
  month: number;
  year: number;
  total_value: number | string;
  processed_rows: number;
  uploaded_at: string;
};

interface HistorialSubidasProps {
  documentType?: DocumentType | "ALL";
  onDeleted?: () => Promise<void> | void;
}

export function HistorialSubidas({ documentType = "ALL", onDeleted }: HistorialSubidasProps) {
  const [rows, setRows] = useState<UploadedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "ALL">(documentType);
  const [monthFilter, setMonthFilter] = useState<number | "ALL">("ALL");
  const [yearFilter, setYearFilter] = useState<number | "ALL">("ALL");
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (typeFilter && typeFilter !== "ALL") params.set("documentType", typeFilter);
    if (monthFilter !== "ALL") params.set("month", String(monthFilter));
    if (yearFilter !== "ALL") params.set("year", String(yearFilter));
    return params.toString() ? `?${params.toString()}` : "";
  }, [typeFilter, monthFilter, yearFilter]);

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analiticas/uploads${query}`);
      const result = await response.json();

      if (result.success) {
        // Asegurarse de que los valores numéricos sean tratados correctamente
        const formattedData = (result.data || []).map((row: any) => ({
          ...row,
          total_value: Number(row.total_value) || 0,
          month: Number(row.month) || 1,
          year: Number(row.year) || new Date().getFullYear(),
          processed_rows: Number(row.processed_rows) || 0
        }));

        setRows(formattedData);
        setError(null);
      } else {
        throw new Error(result.error || 'Error al cargar el historial');
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar el historial');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    // Construir opciones a partir de los datos cargados o últimos 5 años
    const yearsFromData = Array.from(new Set(rows.map(r => r.year))).sort((a,b) => b - a);
    if (yearsFromData.length > 0) return yearsFromData;
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, [rows, currentYear]);

  const handleDelete = async (row: UploadedRow) => {
    if (!confirm(`¿Estás seguro de eliminar el registro de ${row.file_name}?`)) return;
    
    const toastId = toast.loading(`Eliminando ${row.file_name}...`);
    try {
      setIsDeleting(row.id);
      
      // Ensure month and year are numbers
      // Ensure we have valid month and year values
      const month = typeof row.month === 'string' ? parseInt(row.month, 10) : row.month;
      const year = typeof row.year === 'string' ? parseInt(row.year, 10) : row.year;
      
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        throw new Error("Mes o año inválido en el registro");
      }
      
      const res = await fetch("/api/analiticas/eliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: row.file_name,
          documentType: row.document_type,
          month: month,
          year: year,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.details || "No se pudo eliminar el registro");
      }

      await load();
      if (onDeleted) await onDeleted();
      toast.success("Registro eliminado", { id: toastId });
    } catch (error) {
      console.error('Error deleting record:', error);
      const msg = error instanceof Error ? error.message : 'Error al eliminar el registro';
      toast.error("Error eliminando registro", { id: toastId, description: msg });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (typeFilter === 'ALL' || monthFilter === 'ALL' || yearFilter === 'ALL') {
      toast.error("Selecciona un tipo, mes y año específicos para eliminar");
      return;
    }

    // Ensure month and year are numbers
    const month = Number(monthFilter);
    const year = Number(yearFilter);

    if (isNaN(month) || isNaN(year)) {
      toast.error("Mes o año inválido");
      return;
    }

    if (!confirm(`¿Eliminar todos los registros de ${typeFilter} del ${month.toString().padStart(2, '0')}/${year}?`)) return;

    const toastId = toast.loading(`Eliminando registros...`);
    try {
      setIsDeleting(-1);
      const response = await fetch('/api/analiticas/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentType: typeFilter, 
          month: month,
          year: year
        })
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || result?.details || 'Error al eliminar los registros');
      }

      await load();
      if (onDeleted) await onDeleted();
      toast.success(`Se eliminaron ${result.deletedCount || 0} registros`, { id: toastId });
    } catch (error) {
      console.error('Error deleting records:', error);
      const msg = error instanceof Error ? error.message : 'Error al eliminar los registros';
      toast.error("Error eliminando registros", { id: toastId, description: msg });
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const formatMoney = (v: number) =>
    new Intl.NumberFormat("es-CO", { 
      style: "currency", 
      currency: "COP", 
      maximumFractionDigits: 0 
    }).format(Number(v || 0));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Historial de Subidas</h3>
          <button
            onClick={load}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded hover:bg-blue-50 disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Cargando..." : "Actualizar"}
          </button>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Tipo</label>
          <select
            className="px-3 py-2 border rounded-md text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'ALL')}
          >
            <option value="ALL">Todos</option>
            <option value="FC">FC</option>
            <option value="RP">RP</option>
            <option value="DS">DS</option>
            <option value="ND">ND</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Mes</label>
          <select
            className="px-3 py-2 border rounded-md text-sm"
            value={monthFilter}
            onChange={(e) => {
              const value = e.target.value;
              setMonthFilter(value === 'ALL' ? 'ALL' : Number(value));
            }}
          >
            <option value="ALL">Todos</option>
            {monthNames.map((m, i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Año</label>
          <select
            className="px-3 py-2 border rounded-md text-sm"
            value={yearFilter}
            onChange={(e) => {
              const value = e.target.value;
              setYearFilter(value === 'ALL' ? 'ALL' : Number(value));
            }}
          >
            <option value="ALL">Todos</option>
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 px-3 py-2 rounded border hover:bg-blue-50"
            disabled={loading}
            title="Aplicar filtros"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> {loading ? 'Cargando...' : 'Aplicar'}
          </button>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center text-sm text-red-600 hover:text-red-800 px-3 py-2 rounded border hover:bg-red-50"
            disabled={loading}
            title="Eliminar todo del filtro"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Eliminar del mes
          </button>
        </div>
      </div>

      <div className="overflow-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2">Fecha</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Mes</th>
              <th className="text-left px-3 py-2">Año</th>
              <th className="text-left px-3 py-2">Total</th>
              <th className="text-left px-3 py-2">Filas</th>
              <th className="text-left px-3 py-2">Archivo</th>
              <th className="text-right px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-6">
                  {loading ? "Cargando..." : "No hay registros"}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(r.uploaded_at).toLocaleString("es-CO")}
                </td>
                <td className="px-3 py-2">{r.document_type}</td>
                <td className="px-3 py-2">{String(r.month).padStart(2, "0")}</td>
                <td className="px-3 py-2">{r.year}</td>
                <td className="px-3 py-2">{formatMoney(r.total_value)}</td>
                <td className="px-3 py-2">{r.processed_rows}</td>
                <td className="px-3 py-2 truncate max-w-xs" title={r.file_name}>{r.file_name}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(r);
                    }}
                    className="inline-flex items-center text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                    disabled={loading || isDeleting === r.id}
                    title="Quitar factura"
                  >
                    {isDeleting === r.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    {isDeleting === r.id ? 'Eliminando...' : 'Quitar factura'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
