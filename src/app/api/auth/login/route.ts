import { NextResponse } from 'next/server';
import { verifyUser, createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Vérifier les entrées
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email et mot de passe sont requis' },
        { status: 400 }
      );
    }

    // Vérifier l'utilisateur avec notre fonction d'authentification
    const user = await verifyUser(email, password);
    
    if (!user) {
      return NextResponse.json(
        { message: 'Identifiants invalides' },
        { status: 401 }
      );
    }
    
    // Créer une session pour l'utilisateur
    const sessionToken = await createSession(user.id);
    
    // Retourner un cookie avec le jeton de session
    const response = NextResponse.json(
      { 
        success: true,
        user: { id: user.id, email: user.email, role: user.role }
      },
      { status: 200 }
    );
    
    // Définir le cookie de session
    response.cookies.set({
      name: 'xo_provisioning_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return NextResponse.json(
      { message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
