import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Socket.IO için WebSocket upgrade işlemleri
  if (request.nextUrl.pathname.startsWith('/api/socket') || 
      request.nextUrl.pathname.startsWith('/api/socketio')) {
    
    const response = NextResponse.next();
    
    // WebSocket protokol yükseltmesi için gerekli
    response.headers.set('Upgrade', request.headers.get('upgrade') || '');
    response.headers.set('Connection', request.headers.get('connection') || '');
    response.headers.set('Sec-WebSocket-Key', request.headers.get('sec-websocket-key') || '');
    response.headers.set('Sec-WebSocket-Version', request.headers.get('sec-websocket-version') || '');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/socket/:path*', '/api/socketio/:path*'],
};