import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('documentType') || undefined;
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const year = yearParam ? parseInt(yearParam, 10) : undefined;

    // Obtener usuario actual. Si no hay sesión, no filtramos por usuario
    let userId: number | null = null;
    try {
      const user = await getCurrentUser();
      if (user?.id) userId = user.id;
    } catch {
      // ignore
    }

    let rows: any[] = [];

    const byUser = userId !== null;

    if (documentType && month && year) {
      rows = byUser
        ? await sql`
            SELECT * FROM uploaded_files
            WHERE user_id = ${userId}
              AND document_type = ${documentType}
              AND month = ${month}
              AND year = ${year}
            ORDER BY year DESC, month DESC, document_type
          ` as any[]
        : await sql`
            SELECT * FROM uploaded_files
            WHERE document_type = ${documentType}
              AND month = ${month}
              AND year = ${year}
            ORDER BY year DESC, month DESC, document_type
          ` as any[];
    } else if (documentType && month) {
      rows = byUser
        ? await sql`
            SELECT * FROM uploaded_files
            WHERE user_id = ${userId}
              AND document_type = ${documentType}
              AND month = ${month}
            ORDER BY year DESC, month DESC, document_type
          ` as any[]
        : await sql`
            SELECT * FROM uploaded_files
            WHERE document_type = ${documentType}
              AND month = ${month}
            ORDER BY year DESC, month DESC, document_type
          ` as any[];
    } else if (documentType && year) {
      rows = byUser
        ? await sql`
            SELECT * FROM uploaded_files
            WHERE user_id = ${userId}
              AND document_type = ${documentType}
              AND year = ${year}
            ORDER BY year DESC, month DESC, document_type
          ` as any[]
        : await sql`
            SELECT * FROM uploaded_files
            WHERE document_type = ${documentType}
              AND year = ${year}
            ORDER BY year DESC, month DESC, document_type
          ` as any[];
    } else if (documentType) {
      rows = byUser
        ? await sql`
            SELECT * FROM uploaded_files
            WHERE user_id = ${userId}
              AND document_type = ${documentType}
            ORDER BY year DESC, month DESC, document_type
          ` as any[]
        : await sql`
            SELECT * FROM uploaded_files
            WHERE document_type = ${documentType}
            ORDER BY year DESC, month DESC, document_type
          ` as any[];
    } else if (month && year) {
      rows = byUser
        ? await sql`
            SELECT * FROM uploaded_files
            WHERE user_id = ${userId}
              AND month = ${month}
              AND year = ${year}
            ORDER BY year DESC, month DESC, document_type
          ` as any[]
        : await sql`
            SELECT * FROM uploaded_files
            WHERE month = ${month}
              AND year = ${year}
            ORDER BY year DESC, month DESC, document_type
          ` as any[];
    } else if (month) {
      rows = byUser
        ? await sql`
            SELECT * FROM uploaded_files
            WHERE user_id = ${userId}
              AND month = ${month}
            ORDER BY year DESC, month DESC, document_type
          ` as any[]
        : await sql`
            SELECT * FROM uploaded_files
            WHERE month = ${month}
            ORDER BY year DESC, month DESC, document_type
          ` as any[];
    } else if (year) {
      rows = byUser
        ? await sql`
            SELECT * FROM uploaded_files
            WHERE user_id = ${userId}
              AND year = ${year}
            ORDER BY year DESC, month DESC, document_type
          ` as any[]
        : await sql`
            SELECT * FROM uploaded_files
            WHERE year = ${year}
            ORDER BY year DESC, month DESC, document_type
          ` as any[];
    } else {
      rows = byUser
        ? await sql`
            SELECT * FROM uploaded_files
            WHERE user_id = ${userId}
            ORDER BY year DESC, month DESC, document_type
          ` as any[]
        : await sql`
            SELECT * FROM uploaded_files
            ORDER BY year DESC, month DESC, document_type
          ` as any[];
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in GET /api/analiticas/uploads:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
