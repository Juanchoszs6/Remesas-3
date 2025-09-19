import { NextResponse } from 'next/server';
import { obtenerTokenSiigo } from '@/lib/siigo/auth';

const SIIGO_BASE_URL = 'https://api.siigo.com/v1';

export async function GET(request: Request) {
  try {
    // Obtener el token de autenticación
    const token = await obtenerTokenSiigo();
    if (!token) {
      return NextResponse.json(
        { error: 'No se pudo obtener el token de autenticación' },
        { status: 401 }
      );
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '100'; // Máximo permitido por Siigo

    // Construir URL con parámetros de paginación
    const url = new URL(`${SIIGO_BASE_URL}/vouchers`);
    const params = new URLSearchParams({
      page,
      page_size: pageSize,
    });
    url.search = params.toString();
    
    console.log('Realizando petición a:', url.toString());

    // Obtener el Partner-Id de las variables de entorno
    const partnerId = process.env.SIIGO_PARTNER_ID || 'RemesasYMensajes';
    
    // Realizar la petición a la API de Siigo
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Partner-Id': partnerId,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error en la respuesta de Siigo:', errorData);
      return NextResponse.json(
        { 
          error: 'Error al obtener los recibos de caja',
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Respuesta de Siigo recibida:', data);

    // Transformar los datos al formato esperado por el frontend
    const transformVoucherToInvoice = (voucher: any) => ({
      id: voucher.id,
      number: voucher.number?.toString() || 'N/A',
      name: voucher.name || `RC-${voucher.number}`,
      date: voucher.date,
      type: 'RC',
      total: voucher.items?.reduce((sum: number, item: any) => {
        // Sumar solo los valores de débito (pagos)
        return item.account?.movement === 'Debit' ? sum + (parseFloat(item.value) || 0) : sum;
      }, 0) || 0,
      status: 'posted', // Asumimos que si está en la API, está publicado
      created_at: voucher.metadata?.created || new Date().toISOString(),
      updated_at: voucher.metadata?.last_updated || null,
      customer: {
        id: voucher.customer?.id || '',
        name: voucher.customer?.name || 'Cliente no especificado',
        identification: voucher.customer?.identification || '',
        branch_office: voucher.customer?.branch_office?.toString() || '0'
      },
      items: voucher.items?.map((item: any) => ({
        id: `item-${Math.random().toString(36).substr(2, 9)}`,
        code: item.account?.code || '',
        description: item.description || 'Sin descripción',
        quantity: 1,
        price: parseFloat(item.value) || 0,
        total: parseFloat(item.value) || 0,
        movement: item.account?.movement || 'Debit'
      })) || [],
      payments: [{
        id: `pay-${Math.random().toString(36).substr(2, 9)}`,
        method: 'Efectivo', // O podrías extraer esto de los items de débito
        value: voucher.items?.reduce((sum: number, item: any) => {
          return item.account?.movement === 'Debit' ? sum + (parseFloat(item.value) || 0) : sum;
        }, 0) || 0,
        due_date: voucher.date,
        status: 'paid'
      }],
      document_type: {
        id: 'RC',
        name: 'Recibo de Caja',
        code: 'RC'
      },
      metadata: voucher.metadata || {}
    });

    // Aplicar la transformación a cada voucher
    const transformedData = {
      ...data,
      results: Array.isArray(data.results) 
        ? data.results.map(transformVoucherToInvoice)
        : [],
      // Mantener la paginación si existe
      pagination: data.pagination
    };

    console.log('Datos transformados:', transformedData);
    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('Error en la API de recibos de caja:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
