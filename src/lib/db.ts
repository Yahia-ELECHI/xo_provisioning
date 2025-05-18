import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function executeSQL(query: string): Promise<string> {
  // Définir les paramètres de connexion
  const PGUSER = 'postgres';
  const PGPASSWORD = 'postgres';
  const PGHOST = 'localhost';
  const PGDATABASE = 'postgres';
  
  // Exécuter la commande SQL en utilisant PGPASSWORD comme variable d'environnement
  // Cette méthode est conforme à la préférence d'utilisation de la commande en ligne
  const sqlCommand = `PGPASSWORD=${PGPASSWORD} psql -U ${PGUSER} -h ${PGHOST} -d ${PGDATABASE} -t -c "${query.replace(/"/g, '\\"')}"`;  
  
  try {
    const { stdout } = await execPromise(sqlCommand);
    return stdout.trim();
  } catch (error) {
    console.error('Erreur SQL:', error);
    throw new Error(`Erreur d'exécution SQL: ${error}`);
  }
}
