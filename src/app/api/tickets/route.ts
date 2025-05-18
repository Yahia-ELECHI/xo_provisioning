import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Fonction pour sanitizer les données JSON contenant des balises d'images
const sanitizeJsonData = (data: any): any => {
  if (!data) return data;
  
  // Si c'est une chaîne, essayer de parser en JSON
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return sanitizeJsonData(parsed); // Sanitize le JSON parsé
    } catch (e) {
      // Si ce n'est pas un JSON valide, sanitize la chaîne directement
      return sanitizeImgTags(data);
    }
  }
  
  // Si c'est un tableau, sanitize chaque élément
  if (Array.isArray(data)) {
    return data.map(item => sanitizeJsonData(item));
  }
  
  // Si c'est un objet, sanitize chaque propriété
  if (typeof data === 'object' && data !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeJsonData(value);
    }
    return result;
  }
  
  // Si c'est une chaîne, sanitize les balises img
  if (typeof data === 'string') {
    return sanitizeImgTags(data);
  }
  
  // Pour les autres types, retourner tel quel
  return data;
};

// Fonction pour sanitizer les balises img dans une chaîne
const sanitizeImgTags = (text: string): string => {
  if (typeof text !== 'string') return text;
  
  // Remplacer toutes les balises img par un message
  if (text.includes('<img') && (text.includes('src=') || text.includes('data-outlook-trace'))) {
    return text.replace(
      /<img[^>]*>/gi,
      '[Image: Voir dans l\'email original du ticket]'
    );
  }
  
  return text;
};

// Interface pour la structure de réponse
export interface Ticket {
  id: number;
  subject: string;
  created_at: string;
  type_of_request: string;
  classifier: string;
  form_data?: any;
  extra_details?: any;
}

// Interface pour les paramètres de requête
interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export async function GET(request: NextRequest) {
  console.log('API /api/tickets - Début de la requête GET');
  try {
    // Extraction des paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    
    // Valeurs par défaut pour éviter les problèmes de valeurs indéfinies
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    
    const params: QueryParams = {
      page,
      pageSize,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      search: searchParams.get('search') || ''
    };
    
    console.log('Paramètres de requête:', params);

    // Construction de la requête SQL pour le comptage total
    const countQuery = params.search 
      ? `SELECT COUNT(*) FROM tickets_voip WHERE subject ILIKE '%${params.search}%' OR type_of_request ILIKE '%${params.search}%' OR classifier ILIKE '%${params.search}%'`
      : 'SELECT COUNT(*) FROM tickets_voip';
      
    console.log('Requête de comptage:', countQuery);
    
    // Exécution de la requête de comptage
    const { stdout: countOutput } = await execPromise(`sudo -u postgres psql -t -c "${countQuery}"`);
    const totalCount = parseInt(countOutput.trim());
    console.log('Nombre total de tickets:', totalCount);
    
    // Calcul de l'offset pour la pagination
    const offset = ((params.page || 1) - 1) * (params.pageSize || 10);
    
    // Construction de la requête SQL pour les données avec tri et recherche
    let dataQuery = 'SELECT id, subject, created_at, type_of_request, classifier, status FROM tickets_voip';
    
    // Ajout du filtre de recherche si nécessaire
    if (params.search) {
      dataQuery += ` WHERE subject ILIKE '%${params.search}%' OR type_of_request ILIKE '%${params.search}%' OR classifier ILIKE '%${params.search}%'`;
    }
    
    // Ajout du tri
    dataQuery += ` ORDER BY ${params.sortBy} ${params.sortOrder}`;
    
    // Ajout de la pagination
    dataQuery += ` LIMIT ${params.pageSize} OFFSET ${offset}`;
    
    console.log('Requête de données:', dataQuery);
    
    // Exécution de la requête de données - format exact pour parser correctement les résultats
    console.log("Exécution de la requête SQL:", `sudo -u postgres psql -c "SET client_encoding TO 'UTF8';" -c "\\x" -c "${dataQuery}"`);
    const { stdout: dataOutput } = await execPromise(`sudo -u postgres psql -c "SET client_encoding TO 'UTF8';" -c "\\x" -c "${dataQuery}"`);
    
    // Imprimer un extrait des données brutes pour débogage
    console.log("Extrait des données brutes reçues:", dataOutput.substring(0, 200) + '...');
    
    // Traitement du résultat et sanitization des données
    const rawRecords = parsePostgresExtendedOutput(dataOutput);
    // Sanitizer les résultats pour éviter les problèmes avec les balises d'images
    const records = sanitizeJsonData(rawRecords);
    console.log(`Nombre de tickets récupérés: ${records.length}`);
    console.log("Premier ticket (après sanitization):", records.length > 0 ? JSON.stringify(records[0]).substring(0, 100) + '...' : 'Aucun');
    
    // Calcul du nombre total de pages
    const totalPages = Math.ceil(totalCount / (params.pageSize || 10));
    console.log(`Nombre total de pages: ${totalPages}`);
    
    return NextResponse.json({
      data: records,
      pagination: {
        total: totalCount,
        page: params.page,
        pageSize: params.pageSize,
        totalPages
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des tickets:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tickets' },
      { status: 500 }
    );
  } finally {
    console.log('API /api/tickets - Fin de la requête GET');
  }
}

// Fonction pour analyser la sortie du format étendu de PostgreSQL
function parsePostgresExtendedOutput(output: string): Ticket[] {
  console.log('Début du parsing des données PostgreSQL');
  
  // Tableau pour stocker tous les tickets
  const tickets: Ticket[] = [];
  
  try {
    // Expression régulière pour identifier les enregistrements
    const recordRegex = /-\[ RECORD (\d+) \]-+([\s\S]*?)(?=-\[ RECORD |$)/g;
    
    // Trouver tous les enregistrements dans la sortie
    let match;
    let count = 0;
    
    // Option 1: Utiliser regex avec matchAll (plus propre mais peut être moins compatible)
    const matches = [...output.matchAll(recordRegex)];
    console.log(`Nombre d'enregistrements trouvés avec regex: ${matches.length}`);
    
    for (const match of matches) {
      count++;
      const recordContent = match[2];
      const ticket: any = {};
      
      // Analyser chaque ligne de l'enregistrement
      const lines = recordContent.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.includes('|')) {
          const [key, ...valueParts] = line.split('|');
          const value = valueParts.join('|').trim(); // Réassembler au cas où la valeur contient un pipe
          
          if (key && key.trim()) {
            const trimmedKey = key.trim();
            if (trimmedKey === 'id') {
              ticket[trimmedKey] = parseInt(value || '0');
            } else {
              ticket[trimmedKey] = value;
            }
          }
        }
      }
      
      if (Object.keys(ticket).length > 0) {
        tickets.push(ticket as Ticket);
      }
    }
    
    // Si aucun ticket n'est trouvé avec la méthode regex, essayer une méthode plus simple
    if (tickets.length === 0) {
      console.log('Méthode regex a échoué, utilisation de la méthode manuelle');
      
      // Diviser par les séparateurs d'enregistrements
      const blocks = output.split('-[ RECORD').filter(block => block.trim());
      console.log(`Nombre de blocs identifiés: ${blocks.length}`);
      
      for (const block of blocks) {
        const ticket: any = {};
        const lines = block.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          // Ignorer la première ligne qui contient le numéro d'enregistrement
          if (line.startsWith(' ]---') || !line.includes('|')) continue;
          
          const [key, ...valueParts] = line.split('|');
          const value = valueParts.join('|').trim();
          
          if (key && key.trim()) {
            const trimmedKey = key.trim();
            if (trimmedKey === 'id') {
              ticket[trimmedKey] = parseInt(value || '0');
            } else {
              ticket[trimmedKey] = value;
            }
          }
        }
        
        if (Object.keys(ticket).length > 0) {
          tickets.push(ticket as Ticket);
        }
      }
    }
    
    console.log(`Total de ${tickets.length} tickets extraits avec succès`);
    return tickets;
  } catch (error) {
    console.error('Erreur lors du parsing des données PostgreSQL:', error);
    console.error(error);
    return [];
  }
}
