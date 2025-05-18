import { NextResponse } from 'next/server';
import { executeSQL } from '@/lib/db';

export async function GET() {
  try {
    // Récupérer tous les utilisateurs avec une requête SQL directe
    const query = `
      SELECT u.id, u.email, u.name, u.role, u."lastLogin", u."isActive", u."createdAt", u."updatedAt", 
             a.theme, a.language, a.notifications
      FROM "User" u
      LEFT JOIN "AccountSettings" a ON u.id = a."userId"
      ORDER BY u."createdAt" DESC
    `;
    
    const usersData = await executeSQL(query);
    
    // Analyser les résultats
    const users = usersData.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const [
          id, email, name, role, lastLogin, isActive, createdAt, updatedAt,
          theme, language, notifications
        ] = line.split('|').map(item => item.trim());
        
        return {
          id,
          email,
          name,
          role,
          lastLogin: lastLogin ? new Date(lastLogin).toISOString() : null,
          isActive: isActive === 't',
          createdAt: new Date(createdAt).toISOString(),
          updatedAt: new Date(updatedAt).toISOString(),
          settings: {
            theme: theme || 'system',
            language: language || 'fr',
            notifications: notifications === 't'
          }
        };
      });
    
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, role } = body;
    
    // Validation des données
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }
    
    // Vérifier si l'email existe déjà
    const checkQuery = `SELECT id FROM "User" WHERE email = '${email.replace(/'/g, "''")}'`;
    const existingUser = await executeSQL(checkQuery);
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }
    
    // Générer un ID unique
    const userId = crypto.randomUUID();
    
    // Créer l'utilisateur
    const userQuery = `
      INSERT INTO "User" (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
      VALUES (
        '${userId}',
        '${email.replace(/'/g, "''")}',
        '${(name || '').replace(/'/g, "''")}',
        '${password.replace(/'/g, "''")}',
        '${(role || 'user').replace(/'/g, "''")}',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `;
    
    await executeSQL(userQuery);
    
    // Créer les paramètres du compte
    const settingsId = crypto.randomUUID();
    const settingsQuery = `
      INSERT INTO "AccountSettings" (id, "userId", theme, language, notifications)
      VALUES (
        '${settingsId}',
        '${userId}',
        'system',
        'fr',
        true
      )
    `;
    
    await executeSQL(settingsQuery);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Utilisateur créé avec succès',
      userId 
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    );
  }
}
