import { executeSQL } from './db';
import { randomUUID } from 'crypto';

interface User {
  id: string;
  email: string;
  role: string;
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  try {
    // Échapper les valeurs pour éviter les injections SQL
    const escapedEmail = email.replace(/'/g, "''");
    
    const query = `SELECT id, email, role, password FROM "User" WHERE email = '${escapedEmail}'`;
    const result = await executeSQL(query);
    
    if (!result) {
      return null;
    }
    
    // Extraire les informations de l'utilisateur
    const [id, dbEmail, role, dbPassword] = result.split('|').map(item => item.trim());
    
    // Vérifier le mot de passe (dans une application réelle, il faudrait utiliser bcrypt)
    if (dbPassword !== password) {
      return null;
    }
    
    return { id, email: dbEmail, role };
  } catch (error) {
    console.error("Erreur lors de la vérification de l'utilisateur:", error);
    return null;
  }
}

export async function createSession(userId: string): Promise<string> {
  const sessionToken = randomUUID();
  const sessionId = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours
  
  const query = `INSERT INTO "Session" (id, "sessionToken", "userId", expires, "createdAt", "updatedAt") 
                 VALUES ('${sessionId}', '${sessionToken}', '${userId}', '${expiresAt.toISOString()}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
  
  await executeSQL(query);
  
  // Mettre à jour la dernière connexion de l'utilisateur
  const updateQuery = `UPDATE "User" SET "lastLogin" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE id = '${userId}'`;
  await executeSQL(updateQuery);
  
  return sessionToken;
}

export async function getSessionData(sessionToken: string): Promise<{user: User, expires: Date} | null> {
  try {
    // Échapper la valeur pour éviter les injections SQL
    const escapedToken = sessionToken.replace(/'/g, "''");
    
    const query = `SELECT s.id, s.expires, u.id as userId, u.email, u.role 
                   FROM "Session" s 
                   JOIN "User" u ON s."userId" = u.id 
                   WHERE s."sessionToken" = '${escapedToken}' 
                   AND s.expires > CURRENT_TIMESTAMP`;
    
    const result = await executeSQL(query);
    
    if (!result) {
      return null;
    }
    
    // Extraire les informations de session
    const [sessionId, expires, userId, email, role] = result.split('|').map(item => item.trim());
    
    return {
      user: { id: userId, email, role },
      expires: new Date(expires)
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des données de session:', error);
    return null;
  }
}
