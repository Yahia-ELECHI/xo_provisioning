import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Permettre l'accès aux ressources publiques et aux routes publiques
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') ||
    publicRoutes.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }
  
  const sessionToken = request.cookies.get('xo_provisioning_session')?.value;
  
  // Si aucun jeton de session n'est présent, rediriger vers la page de connexion
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  try {
    // Vérification de la session gérée côté API
    // Le middleware ne peut pas exécuter de code serveur qui utilise exec
    
    // Continue la requête
    return NextResponse.next();
    
  } catch (error) {
    console.error('Erreur de middleware:', error);
    
    // En cas d'erreur, rediriger vers la page de connexion par sécurité
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!api/auth/login|_next/static|_next/image|favicon.ico).*)'],
};
