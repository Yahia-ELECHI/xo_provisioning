import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionData } from '@/lib/auth';

// Informations d'identification pour n8n
const N8N_CREDENTIALS = {
  email: 'echiyahya@live.fr',
  password: 'Gss@2025'
};

export async function GET(request: Request) {
  try {
    // Vérifier que l'utilisateur est authentifié - suivant les recommandations Next.js
    const cookieStore = await cookies();
    const sessionCookie = await cookieStore.get('xo_provisioning_session');
    const sessionToken = sessionCookie?.value;

    if (!sessionToken) {
      return NextResponse.json({ 
        error: 'Non autorisé - Session non trouvée' 
      }, { status: 401 });
    }

    // Vérifier la session
    const session = await getSessionData(sessionToken);

    if (!session) {
      return NextResponse.json({ 
        error: 'Non autorisé - Session invalide ou expirée' 
      }, { status: 401 });
    }

    // Retourner les informations d'authentification n8n directement
    return NextResponse.json({
      email: N8N_CREDENTIALS.email,
      password: N8N_CREDENTIALS.password
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des informations d\'authentification n8n:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
}
