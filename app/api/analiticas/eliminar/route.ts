import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, documentType, month, year, deleteAllWithName } = body || {};

    // Intentar obtener usuario actual; fallback temporal al usuario 1
    let userId = 1;
    try {
      const user = await getCurrentUser();
      if (user?.id) userId = user.id;
    } catch (e) {
      // Si falla auth, continuar con userId por defecto (para entornos de desarrollo)
    }

    if (!fileName && !(documentType && month && year)) {
      return NextResponse.json(
        { success: false, error: 'Parámetros insuficientes', details: 'Se requiere fileName o (documentType, month, year)' },
        { status: 400 }
      );
    }

    let rows: Array<any> = [];

    if (fileName && (!documentType || !month || !year || deleteAllWithName)) {
      // Eliminar por nombre de archivo
      if (deleteAllWithName) {
        // Eliminar para cualquier usuario (uso controlado)
        rows = await sql`
          DELETE FROM uploaded_files
          WHERE file_name = ${fileName}
          RETURNING *
        ` as any;
      } else {
        // Intentar con user_id primero
        rows = await sql`
          DELETE FROM uploaded_files
          WHERE user_id = ${userId} AND file_name = ${fileName}
          RETURNING *
        ` as any;
        // Si no se encontró, intentar sin user_id
        if (!Array.isArray(rows) || rows.length === 0) {
          rows = await sql`
            DELETE FROM uploaded_files
            WHERE file_name = ${fileName}
            RETURNING *
          ` as any;
        }
      }
    } else if (documentType && month && year) {
      // Eliminar por combinación (usuario, tipo, mes, año) y opcionalmente por nombre
      if (fileName) {
        rows = await sql`
          DELETE FROM uploaded_files
          WHERE user_id = ${userId}
            AND document_type = ${documentType}
            AND month = ${month}
            AND year = ${year}
            AND file_name = ${fileName}
          RETURNING *
        ` as any;
        if (!Array.isArray(rows) || rows.length === 0) {
          rows = await sql`
            DELETE FROM uploaded_files
            WHERE document_type = ${documentType}
              AND month = ${month}
              AND year = ${year}
              AND file_name = ${fileName}
            RETURNING *
          ` as any;
        }
      } else {
        rows = await sql`
          DELETE FROM uploaded_files
          WHERE user_id = ${userId}
            AND document_type = ${documentType}
            AND month = ${month}
            AND year = ${year}
          RETURNING *
        ` as any;
        if (!Array.isArray(rows) || rows.length === 0) {
          rows = await sql`
            DELETE FROM uploaded_files
            WHERE document_type = ${documentType}
              AND month = ${month}
              AND year = ${year}
            RETURNING *
          ` as any;
        }
      }
    }

    const deletedCount = Array.isArray(rows) ? rows.length : 0;

    if (deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron registros para eliminar' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error('Error en /api/analiticas/eliminar:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: message },
      { status: 500 }
    );
  }
}
