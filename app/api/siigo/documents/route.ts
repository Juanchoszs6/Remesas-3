import { NextResponse } from 'next/server';
import { obtenerTokenSiigo } from '@/lib/siigo/auth';

const SIIGO_BASE_URL = process.env.SIIGO_BASE_URL || 'https://api.siigo.com/v1';
const PARTNER_ID = process.env.SIIGO_PARTNER_ID || 'RemesasYMensajes';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type') || 'FC';
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '50';
    const includeDependencies = searchParams.get('includeDependencies') === 'true';

    // 🔑 Obtener token
    const token = await obtenerTokenSiigo();
    if (!token) {
      return NextResponse.json(
        { error: 'No se pudo obtener el token de autenticación' },
        { status: 401 }
      );
    }

    // 🔀 Mapear tipo de documento → endpoint
    let apiUrl: URL;
    switch (documentType) {
      case 'FC': // 👈 Facturas de compra
        apiUrl = new URL(`${SIIGO_BASE_URL}/purchases`);
        apiUrl.searchParams.append('document_type', 'FC');
        break;
      case 'ND':
        apiUrl = new URL(`${SIIGO_BASE_URL}/debit-notes`);
        break;
      case 'DS':
        apiUrl = new URL(`${SIIGO_BASE_URL}/support-documents`);
        break;
      case 'RP':
        apiUrl = new URL(`${SIIGO_BASE_URL}/payment-receipts`);
        break;
      default: // 👈 Facturas de venta
        apiUrl = new URL(`${SIIGO_BASE_URL}/invoices`);
    }

    // Paginación
    apiUrl.searchParams.append('page', page);
    apiUrl.searchParams.append('page_size', pageSize);

    if (includeDependencies) {
      apiUrl.searchParams.append('include_dependencies', 'true');
    }

    console.log('➡️ Request a Siigo:', apiUrl.toString());

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Partner-Id': PARTNER_ID,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Error desconocido');
      console.error('❌ Error Siigo:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: errorText },
        { status: response.status }
      );
    }

    let responseData = await response.json();
    let documents = Array.isArray(responseData) ? responseData : responseData.results || [];
    
    // Calculate total for RP documents
    if (documentType === 'RP' && Array.isArray(documents)) {
      documents = documents.map(doc => {
        // Calcular la suma de TODOS los ítems sin importar si son débito o crédito
        const total = doc.items?.reduce((sum: number, item: any) => {
          // Sumar el valor absoluto de todos los ítems
          const value = Math.abs(Number(item.value) || 0);
          console.log(`Sumando ítem:`, { 
            value: item.value, 
            movement: item.account?.movement,
            parsed: value
          });
          return sum + value;
        }, 0) || 0;

        console.log(`Documento RP ${doc.number || doc.id} - Total calculado:`, total, 'Items:', doc.items?.length);
        
        return {
          ...doc,
          total: total
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: documents,
      pagination: responseData.pagination || null,
      type: documentType,
      url: apiUrl.toString()
    });

  } catch (error) {
    console.error('🔥 Error en /api/siigo/documents:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
