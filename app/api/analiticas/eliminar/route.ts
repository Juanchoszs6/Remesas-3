import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, fileName, documentType, month, year, deleteAllWithName } = body || {};

    // Intentar obtener usuario actual; fallback temporal al usuario 1
    let userId = 1;
    try {
      const user = await getCurrentUser();
      if (user?.id) userId = user.id;
    } catch (e) {
      // Si falla auth, continuar con userId por defecto (para entornos de desarrollo)
      console.warn('No se pudo obtener el usuario actual, usando ID 1');
    }

    // Validar parámetros de entrada
    if (id) {
      // Eliminación por ID
      const result = await sql`
        DELETE FROM uploaded_files
        WHERE id = ${id} AND (user_id = ${userId} OR ${userId} = 1)
        RETURNING *
      ` as any[];

      if (result && Array.isArray(result) && result.length > 0) {
        return NextResponse.json({ 
          success: true, 
          deletedCount: result.length,
          data: result.length === 1 ? result[0] : result
        });
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: 'No se encontraron registros para eliminar',
            details: 'Verifica los parámetros e inténtalo de nuevo'
          },
          { status: 404 }
        );
      }
    }
    
    // Validar parámetros para eliminación por mes/año/tipo
    if (!fileName && !(documentType && month !== undefined && year !== undefined)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parámetros insuficientes', 
          details: 'Se requiere id, fileName o (documentType, month, year)' 
        },
        { status: 400 }
      );
    }

    let result;
    
    if (fileName) {
      // Eliminar por nombre de archivo
      if (deleteAllWithName) {
        // Eliminar para cualquier usuario (solo para admin/desarrollo)
        result = await sql`
          DELETE FROM uploaded_files
          WHERE file_name = ${fileName}
          RETURNING *
        ` as any[];
      } else {
        // Intentar con user_id primero
        result = await sql`
          DELETE FROM uploaded_files
          WHERE user_id = ${userId} AND file_name = ${fileName}
          RETURNING *
        ` as any[];
        
        // Si no se encontró, intentar sin user_id (para compatibilidad)
        if (!Array.isArray(result) || result.length === 0) {
          result = await sql`
            DELETE FROM uploaded_files
            WHERE file_name = ${fileName}
            RETURNING *
          ` as any[];
        }
      }
    } else if (documentType && month !== undefined && year !== undefined) {
      // Asegurarse de que month y year sean números
      const monthNum = typeof month === 'string' ? parseInt(month, 10) : Number(month);
      const yearNum = typeof year === 'string' ? parseInt(year, 10) : Number(year);
      
      if (isNaN(monthNum) || isNaN(yearNum)) {
        return NextResponse.json(
          { success: false, error: 'Mes o año inválido' },
          { status: 400 }
        );
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
