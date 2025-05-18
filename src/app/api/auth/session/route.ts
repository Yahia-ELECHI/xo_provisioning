import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionData } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Obtenir les cookies de la requête directement depuis les headers
    const sessionCookie = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('xo_provisioning_session='));
    
    const sessionToken = sessionCookie ? sessionCookie.split('=')[1].trim() : null;

    if (!sessionToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Non authentifié' 
      }, { status: 401 });
    }

    // Vérifier la validité de la session
    const sessionData = await getSessionData(sessionToken);
    
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Session invalide' 
      }, { status: 401 });
    }

    // Retourner les informations de l'utilisateur
    return NextResponse.json({
      success: true,
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email,
        role: sessionData.user.role
      }
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la session:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur de serveur'
    }, { status: 500 });
  }
}
