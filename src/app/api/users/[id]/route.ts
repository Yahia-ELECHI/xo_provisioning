import { NextResponse } from 'next/server';
import { executeSQL } from '@/lib/db';

// Récupérer un utilisateur spécifique
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Échapper l'ID pour éviter les injections SQL
    const sanitizedId = id.replace(/'/g, "''");
    
    // Requête SQL pour récupérer l'utilisateur et ses paramètres
    const query = `
      SELECT u.id, u.email, u.name, u.role, u."lastLogin", u."isActive", u."createdAt", u."updatedAt", 
             a.theme, a.language, a.notifications
      FROM "User" u
      LEFT JOIN "AccountSettings" a ON u.id = a."userId"
      WHERE u.id = '${sanitizedId}'
    `;
    
    const userData = await executeSQL(query);
    
    if (!userData) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    
    // Analyser les résultats
    const [
      userId, email, name, role, lastLogin, isActive, createdAt, updatedAt,
      theme, language, notifications
    ] = userData.split('|').map(item => item.trim());
    
    const user = {
      id: userId,
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
    
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// Mettre à jour un utilisateur
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { email, name, role, isActive, password, settings } = body;
    
    // Échapper l'ID pour éviter les injections SQL
    const sanitizedId = id.replace(/'/g, "''");
    
    // Vérifier si l'utilisateur existe
    const checkQuery = `SELECT id FROM "User" WHERE id = '${sanitizedId}'`;
    const existingUser = await executeSQL(checkQuery);
    
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    
    // Construire la requête de mise à jour pour l'utilisateur
    let updateFields = [];
    
    if (email) updateFields.push(`email = '${email.replace(/'/g, "''")}'`);
    if (name !== undefined) updateFields.push(`name = '${(name || '').replace(/'/g, "''")}'`);
    if (role) updateFields.push(`role = '${role.replace(/'/g, "''")}'`);
    if (isActive !== undefined) updateFields.push(`"isActive" = ${isActive}`);
    if (password) updateFields.push(`password = '${password.replace(/'/g, "''")}'`);
    
    updateFields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    
    if (updateFields.length > 0) {
      const updateQuery = `
        UPDATE "User"
        SET ${updateFields.join(', ')}
        WHERE id = '${sanitizedId}'
      `;
      
      await executeSQL(updateQuery);
    }
    
    // Mettre à jour les paramètres si fournis
    if (settings) {
      const settingsFields = [];
      
      if (settings.theme) settingsFields.push(`theme = '${settings.theme.replace(/'/g, "''")}'`);
      if (settings.language) settingsFields.push(`language = '${settings.language.replace(/'/g, "''")}'`);
      if (settings.notifications !== undefined) settingsFields.push(`notifications = ${settings.notifications}`);
      
      if (settingsFields.length > 0) {
        // Vérifier si les paramètres existent déjà
        const checkSettingsQuery = `SELECT id FROM "AccountSettings" WHERE "userId" = '${sanitizedId}'`;
        const existingSettings = await executeSQL(checkSettingsQuery);
        
        if (existingSettings) {
          // Mettre à jour les paramètres existants
          const updateSettingsQuery = `
            UPDATE "AccountSettings"
            SET ${settingsFields.join(', ')}
            WHERE "userId" = '${sanitizedId}'
          `;
          
          await executeSQL(updateSettingsQuery);
        } else {
          // Créer de nouveaux paramètres
          const settingsId = crypto.randomUUID();
          const createSettingsQuery = `
            INSERT INTO "AccountSettings" (id, "userId", theme, language, notifications)
            VALUES (
              '${settingsId}',
              '${sanitizedId}',
              '${(settings.theme || 'system').replace(/'/g, "''")}',
              '${(settings.language || 'fr').replace(/'/g, "''")}',
              ${settings.notifications !== undefined ? settings.notifications : true}
            )
          `;
          
          await executeSQL(createSettingsQuery);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Utilisateur mis à jour avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la mise à jour de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// Supprimer un utilisateur (désactivation logique)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Échapper l'ID pour éviter les injections SQL
    const sanitizedId = id.replace(/'/g, "''");
    
    // Vérifier si l'utilisateur existe
    const checkQuery = `SELECT id FROM "User" WHERE id = '${sanitizedId}'`;
    const existingUser = await executeSQL(checkQuery);
    
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    
    // Plutôt que de supprimer l'utilisateur, nous le désactivons
    const deactivateQuery = `
      UPDATE "User"
      SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = '${sanitizedId}'
    `;
    
    await executeSQL(deactivateQuery);
    
    // Supprimer également toutes les sessions de l'utilisateur
    const deleteSessionsQuery = `
      DELETE FROM "Session"
      WHERE "userId" = '${sanitizedId}'
    `;
    
    await executeSQL(deleteSessionsQuery);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Utilisateur désactivé avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la désactivation de l\'utilisateur:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la désactivation de l\'utilisateur' },
      { status: 500 }
    );
  }
}
