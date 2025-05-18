import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { executeSQL } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // Obtenir les cookies de la requête directement depuis les headers
    const sessionCookie = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('xo_provisioning_session='));
    
    const sessionToken = sessionCookie ? sessionCookie.split('=')[1].trim() : null;

    if (sessionToken) {
      // Échapper la valeur pour éviter les injections SQL
      const escapedToken = sessionToken.replace(/'/g, "''");
      
      // Supprimer la session de la base de données
      const query = `DELETE FROM "Session" WHERE "sessionToken" = '${escapedToken}'`;
      await executeSQL(query);
    }

    // Créer une réponse et supprimer le cookie
    const response = NextResponse.json({ success: true });
    
    // Supprimer le cookie en le définissant avec une date d'expiration passée
    response.cookies.set({
      name: 'xo_provisioning_session',
      value: '',
      expires: new Date(0),
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur de serveur'
    }, { status: 500 });
  }
}
