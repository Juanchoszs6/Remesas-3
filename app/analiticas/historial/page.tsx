'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HistorialSubidas } from '@/components/analiticas/historial-subidas';

export default function HistorialAnaliticasPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Subidas</h1>
          <p className="text-muted-foreground">Consulta y elimina archivos cargados previamente por tipo y mes.</p>
        </div>
        <Link
          href="/analiticas"
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
        >
          ← Volver a Analíticas
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>
            Usa los filtros para seleccionar Tipo, Mes y Año. Puedes eliminar por fila o por el mes completo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistorialSubidas onDeleted={async () => { /* la página del panel refrescará al volver */ }} />
        </CardContent>
      </Card>
    </div>
  );
}
