import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Fonction pour sanitizer les données JSON contenant des balises d'images
const sanitizeJsonData = (data: any): any => {
  if (!data) {
    console.log('sanitizeJsonData: données nulles ou indéfinies');
    return data;
  }
  
  // Si c'est une chaîne, essayer de parser en JSON
  if (typeof data === 'string') {
    console.log('sanitizeJsonData: traitement d\'une chaîne, longueur=', data.length);
    console.log('sanitizeJsonData: début de la chaîne:', data.substring(0, 50));
    console.log('sanitizeJsonData: contient des balises img?', data.includes('<img'));
    
    // Traitement spécial pour les chaînes avec balises d'image
    if (data.includes('<img')) {
      // Sanitize d'abord les balises d'image
      console.log('sanitizeJsonData: sanitization préventive des balises img');
      const preSanitized = sanitizeImgTags(data);
      
      // Essayer de parser la chaîne sanitizée
      try {
        console.log('sanitizeJsonData: tentative de parsing de la chaîne pré-sanitizée');
        const parsed = JSON.parse(preSanitized);
        console.log('sanitizeJsonData: parsing réussi après pré-sanitization');
        return sanitizeJsonData(parsed); // Traitement récursif
      } catch (parseError: any) {
        console.log('sanitizeJsonData: erreur parsing après pré-sanitization:', parseError.message);
        // Retourner la version sanitizée mais non-parsée
        return preSanitized;
      }
    }
    
    // Approche standard de parsing JSON
    try {
      console.log('sanitizeJsonData: tentative de parsing JSON');
      const parsed = JSON.parse(data);
      console.log('sanitizeJsonData: parsing JSON réussi, traitement récursif');
      return sanitizeJsonData(parsed); // Sanitize le JSON parsé
    } catch (e: any) {
      console.log('sanitizeJsonData: erreur de parsing JSON:', e.message);
      // Si ce n'est pas un JSON valide, sanitize la chaîne directement
      console.log('sanitizeJsonData: application de sanitizeImgTags');
      return sanitizeImgTags(data);
    }
  }
  
  // Si c'est un tableau, sanitize chaque élément
  if (Array.isArray(data)) {
    console.log('sanitizeJsonData: traitement d\'un tableau de', data.length, 'éléments');
    return data.map(item => sanitizeJsonData(item));
  }
  
  // Si c'est un objet, sanitize chaque propriété
  if (typeof data === 'object' && data !== null) {
    console.log('sanitizeJsonData: traitement d\'un objet avec', Object.keys(data).length, 'propriétés');
    console.log('sanitizeJsonData: clés de l\'objet:', Object.keys(data));
    
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      console.log(`sanitizeJsonData: traitement de la propriété "${key}"`);
      
      if (key === 'form_data' || key === 'extra_details') {
        console.log(`sanitizeJsonData: inspection spéciale de ${key}:`);
        console.log(`  - type:`, typeof value);
        if (typeof value === 'string') {
          console.log(`  - longueur:`, value.length);
          console.log(`  - début:`, value.substring(0, 50));
          console.log(`  - contient <img>:`, value.includes('<img'));
        } else if (typeof value === 'object' && value !== null) {
          console.log(`  - clés:`, Object.keys(value));
        }
      }
      
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

// Fonction pour réparer les chaînes JSON tronquées contenant des balises img
const repairJsonWithImageTags = (jsonString: string): string => {
  console.log('repairJsonWithImageTags: tentative de réparation d\'un JSON avec balises img');
  
  // Si la chaîne contient detailedInstructions et des balises <img>
  if (jsonString.includes('detailedInstructions') && jsonString.includes('<img')) {
    console.log('repairJsonWithImageTags: structure detailedInstructions détectée');
    
    // Vérifier si la structure est incomplète
    const openBraces = (jsonString.match(/{/g) || []).length;
    const closeBraces = (jsonString.match(/}/g) || []).length;
    
    if (openBraces > closeBraces) {
      console.log('repairJsonWithImageTags: structure JSON incomplète détectée');
      
      // Remplacer les balises img d'abord
      let repaired = jsonString.replace(
        /<img[^>]*>/gi,
        '[Image: Voir dans l\'email original du ticket]'
      );
      
      // Ajouter les accolades manquantes 
      for (let i = 0; i < (openBraces - closeBraces); i++) {
        repaired += '"}';
      }
      
      console.log('repairJsonWithImageTags: JSON réparé');
      return repaired;
    }
  }
  
  return jsonString;
};

// Fonction pour sanitizer les balises img dans une chaîne
const sanitizeImgTags = (text: string): string => {
  if (typeof text !== 'string') {
    console.log('sanitizeImgTags: valeur non-string ignorée');
    return text;
  }
  
  // Déboguer le contenu de la chaîne
  console.log(`sanitizeImgTags: analyse d'une chaîne de ${text.length} caractères`);
  console.log(`sanitizeImgTags: début de la chaîne: "${text.substring(0, 50)}"`);
  
  // Vérifier si c'est une possible chaîne JSON contenant des balises img
  if (text.startsWith('{') && text.includes('<img')) {
    console.log('sanitizeImgTags: détection de potentiel JSON avec balises img');
    try {
      const repaired = repairJsonWithImageTags(text);
      if (repaired !== text) {
        try {
          // Tester si le JSON réparé est valide
          JSON.parse(repaired);
          console.log('sanitizeImgTags: réparation réussie, JSON valide');
          return repaired;
        } catch (e) {
          console.log('sanitizeImgTags: JSON réparé invalide, continuation avec approche standard');
        }
      }
    } catch (e) {
      console.log('sanitizeImgTags: erreur lors de la réparation du JSON');
    }
  }
  
  // Remplacer toutes les balises img par un message
  const hasImgTag = text.includes('<img');
  
  if (hasImgTag) {
    console.log('sanitizeImgTags: balises d\'image détectées, remplacement en cours...');
    
    // Utiliser une expression régulière plus robuste
    const sanitized = text.replace(
      /<img[^>]*?(?:src|border|width|height|data-outlook-trace|style)[^>]*?>/gi,
      '[Image: Voir dans l\'email original du ticket]'
    );
    
    // Si le premier remplacement n'a rien changé, essayer une regex plus simple
    if (sanitized === text) {
      console.log('sanitizeImgTags: première regex sans effet, essai avec regex simple');
      const simpleSanitized = text.replace(
        /<img[^>]*>/gi,
        '[Image: Voir dans l\'email original du ticket]'
      );
      
      if (simpleSanitized !== text) {
        console.log('sanitizeImgTags: remplacement avec regex simple réussi');
        return simpleSanitized;
      }
    } else {
      console.log(`sanitizeImgTags: remplacement réussi, nouvelle longueur: ${sanitized.length}`);
      return sanitized;
    }
  }
  
  console.log('sanitizeImgTags: aucune balise d\'image à sanitizer');
  return text;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== DÉBUT GET TICKET ===');
  console.log('API /api/tickets/[id] - Début de la requête GET');
  try {
    // Dans Next.js 13+, params doit être attendu avant d'accéder à ses propriétés
    // Mais nous pouvons récupérer l'ID directement depuis l'URL aussi
    const url = request.url;
    const segments = url.split('/');
    const ticketId = segments[segments.length - 1];
    
    console.log('URL de la requête:', url);
    console.log('ID du ticket extrait:', ticketId);
    
    // Vérifier si l'ID est un nombre valide
    if (!/^\d+$/.test(ticketId)) {
      console.log('ID de ticket invalide:', ticketId);
      return NextResponse.json(
        { error: 'ID de ticket invalide' },
        { status: 400 }
      );
    }
    
    // Requête SQL pour récupérer les détails du ticket
    const query = `SELECT * FROM tickets_voip WHERE id = ${ticketId}`;
    console.log('Requête SQL:', query);
    
    // Récupérer les données du ticket depuis PostgreSQL
    // Utiliser -X pour éviter que psql essaie de changer de répertoire
    const { stdout, stderr } = await execPromise(`cd /tmp && sudo -u postgres psql -X -c "SET client_encoding TO 'UTF8';" -c "\\x" -c "SELECT * FROM tickets_voip WHERE id = ${ticketId}"`);
    
    if (stderr) {
      console.error('Erreur PostgreSQL:', stderr);
      return NextResponse.json({ error: 'Erreur lors de la récupération du ticket' }, { status: 500 });
    }
    
    // Détecter et sanitizer les balises d'image dans le stdout brut
    let sanitizedStdout = stdout;
    if (stdout.includes('<img')) {
      console.log('Détection de balises <img> dans le stdout brut, sanitization préventive...');
      sanitizedStdout = stdout.replace(
        /<img[^>]*>/gi,
        '[Image: Voir dans l\'email original du ticket]'
      );
    }
    
    console.log('Données brutes reçues pour le ticket:', sanitizedStdout.slice(0, 100) + '...');
    
    try {
      // Analyser les données de sortie PostgreSQL
      console.log('Analyse du résultat de la BDD');
      
      // Sanitize les balises d'image dans la sortie de PostgreSQL
      if (sanitizedStdout.includes('<img')) {
        console.log('ATTENTION: stdout contient des balises <img> avant le parsing');
        const imgTagMatches = sanitizedStdout.match(/<img[^>]*>/g) || [];
        console.log(`Nombre de balises <img> détectées dans stdout: ${imgTagMatches.length}`);
        if (imgTagMatches.length > 0) {
          console.log(`Exemple de balise <img>: ${imgTagMatches[0]}`);
        }
        
        // Traitement spécial pour le champ form_data
        sanitizedStdout = sanitizedStdout.replace(
          /form_data\s+\|\s+([^\|]+<img[^>]*>[^\|]*)/g,
          (match) => match.replace(/<img[^>]*>/gi, '[Image: Voir dans l\'email original du ticket]')
        );
      }
      
      const rawTicket = parsePostgresExtendedOutput(sanitizedStdout);
      console.log('Ticket parsé depuis PostgreSQL:', typeof rawTicket);
      
      if (!rawTicket) {
        console.log('Ticket non trouvé ou erreur de parsing pour ID:', ticketId);
        return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });
      }
      
      // Analyser la structure du ticket pour déboguer
      console.log('Structure du ticket brut:', Object.keys(rawTicket));
      
      // Traitement spécial pour form_data contenant des balises d'image
      if (rawTicket.form_data && typeof rawTicket.form_data === 'string' && rawTicket.form_data.includes('<img')) {
        console.log('Inspection du champ form_data:');
        console.log('- Type:', typeof rawTicket.form_data);
        console.log('- form_data contient des balises <img>, sanitization spéciale');
        
        // Sanitizer directement sans essayer de parser d'abord
        rawTicket.form_data = sanitizeImgTags(rawTicket.form_data);
        
        // Vérifier si form_data est maintenant un JSON valide
        try {
          const parsedFormData = JSON.parse(rawTicket.form_data);
          rawTicket.form_data = parsedFormData; // Remplacer par l'objet parsé
          console.log('- form_data sanitizé avec succès et parsé en objet');
        } catch (formDataError: any) {
          console.log('- form_data sanitizé mais toujours pas un JSON valide:', formDataError.message);
          console.log('- conservation de form_data comme chaîne sanitizée');
        }
      } else if (rawTicket.form_data) {
        console.log('Inspection du champ form_data:');
        console.log('- Type:', typeof rawTicket.form_data);
        
        if (typeof rawTicket.form_data === 'string') {
          try {
            // Essayer de parser pour voir si c'est un JSON valide
            JSON.parse(rawTicket.form_data);
            console.log('- form_data est une chaîne JSON valide');
          } catch (e: any) {
            console.log('- form_data est une chaîne mais pas un JSON valide:', e.message);
            console.log('- début de form_data:', rawTicket.form_data.substring(0, 100));
            console.log('- form_data contient des balises <img>:', rawTicket.form_data.includes('<img'));
          }
        } else if (typeof rawTicket.form_data === 'object') {
          console.log('- form_data est déjà un objet avec propriétés:', Object.keys(rawTicket.form_data));
        }
      }
      
      // Faire de même pour extra_details
      if (rawTicket.extra_details) {
        console.log('Inspection du champ extra_details:');
        console.log('- Type:', typeof rawTicket.extra_details);
        
        if (typeof rawTicket.extra_details === 'string') {
          try {
            const parsed = JSON.parse(rawTicket.extra_details);
            console.log('- extra_details est un JSON valide avec propriétés:', Object.keys(parsed));
          } catch (e: any) {
            console.log('- extra_details est une chaîne mais pas un JSON valide:', e.message);
            console.log('- début de extra_details:', rawTicket.extra_details.substring(0, 100));
            console.log('- extra_details contient des balises <img>:', rawTicket.extra_details.includes('<img'));
          }
        } else if (typeof rawTicket.extra_details === 'object') {
          console.log('- extra_details est déjà un objet avec propriétés:', Object.keys(rawTicket.extra_details));
        }
      }
      
      console.log('Début de la sanitization des données du ticket');
      const ticket = sanitizeJsonData(rawTicket);
      console.log('Sanitization terminée');
      console.log('Ticket traité:', JSON.stringify(ticket).substring(0, 100) + '...');
      
      // Ajouter une vérification finale du ticket sanitizé
      console.log('Vérification finale du ticket sanitizé:');
      console.log('- Type:', typeof ticket);
      console.log('- Structure:', Object.keys(ticket));
      
      if (ticket.form_data) {
        console.log('- form_data après sanitization:');
        console.log('  - Type:', typeof ticket.form_data);
        if (typeof ticket.form_data === 'string' && ticket.form_data.includes('<img')) {
          console.log('  - ATTENTION: form_data contient encore des balises <img> après sanitization!');
        }
      }
      
      if (ticket.extra_details) {
        console.log('- extra_details après sanitization:');
        console.log('  - Type:', typeof ticket.extra_details);
        if (typeof ticket.extra_details === 'string' && ticket.extra_details.includes('<img')) {
          console.log('  - ATTENTION: extra_details contient encore des balises <img> après sanitization!');
        }
      }
      
      console.log('Retour du ticket sanitizé en réponse JSON');
      return NextResponse.json(ticket);
    } catch (parseError: any) {
      console.error('Erreur lors du parsing des données PostgreSQL:', parseError);
      return NextResponse.json(
        { error: 'Erreur lors du traitement des données du ticket' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Erreur lors de la récupération du ticket:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du ticket' },
      { status: 500 }
    );
  } finally {
    console.log('API /api/tickets/[id] - Fin de la requête GET');
    console.log('=== FIN GET TICKET ===');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API /api/tickets/[id] - Début de la requête DELETE');
  try {
    // Récupérer l'ID directement depuis l'URL
    const url = request.url;
    const segments = url.split('/');
    const ticketId = segments[segments.length - 1];
    
    console.log('Suppression du ticket avec ID:', ticketId);
    
    // Vérifier si l'ID est un nombre valide
    if (!/^\d+$/.test(ticketId)) {
      console.log('ID de ticket invalide pour suppression:', ticketId);
      return NextResponse.json(
        { error: 'ID de ticket invalide' },
        { status: 400 }
      );
    }
        
    // Requête SQL pour supprimer le ticket
    const query = `DELETE FROM tickets_voip WHERE id = ${ticketId}`;
    console.log('Requête de suppression:', query);
        
    // Exécution de la requête - utiliser -X pour éviter les problèmes de permission
    const { stdout } = await execPromise(`cd /tmp && sudo -u postgres psql -X -c "${query}"`);
        
    console.log('Résultat de la suppression:', stdout);
        
    return NextResponse.json({ success: true, message: 'Ticket supprimé avec succès' });
        
  } catch (error) {
    console.error('Erreur lors de la suppression du ticket:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du ticket' },
      { status: 500 }
    );
  } finally {
    console.log('API /api/tickets/[id] - Fin de la requête DELETE');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API /api/tickets/[id] - Début de la requête PATCH');
  try {
    // Récupérer l'ID directement depuis l'URL
    const url = request.url;
    const segments = url.split('/');
    const ticketId = segments[segments.length - 1];
    
    console.log('Mise à jour du ticket avec ID:', ticketId);
    
    // Vérifier si l'ID est un nombre valide
    if (!/^\d+$/.test(ticketId)) {
      console.log('ID de ticket invalide pour mise à jour:', ticketId);
      return NextResponse.json(
        { error: 'ID de ticket invalide' },
        { status: 400 }
      );
    }
    
    // Récupérer les données de la requête et les sanitizer
    const rawRequestData = await request.json();
    const requestData = sanitizeJsonData(rawRequestData);
    console.log('Données de mise à jour sanitizées:', requestData);
    
    // Valider les données reçues
    if (!requestData || Object.keys(requestData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée fournie pour la mise à jour' },
        { status: 400 }
      );
    }
    
    // Extraire les champs à mettre à jour
    const { subject, type_of_request, classifier, form_data, extra_details, status } = requestData;
    
    // Construire la partie SET de la requête SQL
    const updateParts = [];
    if (subject !== undefined) updateParts.push(`subject = '${subject.replace(/'/g, "''")}'`);
    if (type_of_request !== undefined) updateParts.push(`type_of_request = '${type_of_request.replace(/'/g, "''")}'`);
    if (classifier !== undefined) updateParts.push(`classifier = '${classifier?.replace(/'/g, "''") || ''}'`);
    if (status !== undefined) updateParts.push(`status = '${status.replace(/'/g, "''")}'`);
    
    // Gérer les champs JSON
    if (form_data !== undefined) {
      const formDataJson = typeof form_data === 'string' ? form_data : JSON.stringify(form_data);
      updateParts.push(`form_data = '${formDataJson.replace(/'/g, "''")}'::jsonb`);
    }
    
    if (extra_details !== undefined) {
      const extraDetailsJson = typeof extra_details === 'string' ? extra_details : JSON.stringify(extra_details);
      updateParts.push(`extra_details = '${extraDetailsJson.replace(/'/g, "''")}'::jsonb`);
    }
    
    // Si aucun champ à mettre à jour
    if (updateParts.length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ valide à mettre à jour' },
        { status: 400 }
      );
    }
    
    // Construire la requête SQL complète
    const query = `UPDATE tickets_voip SET ${updateParts.join(', ')} WHERE id = ${ticketId} RETURNING *`;
    console.log('Requête de mise à jour:', query);
    
    // Exécuter la requête SQL avec l'option -X pour éviter les problèmes de permission
    const { stdout } = await execPromise(`cd /tmp && sudo -u postgres psql -X -t -c "\\x" -c "${query}"`);
    
    // Si aucun résultat, le ticket n'a pas été trouvé
    if (!stdout.trim()) {
      return NextResponse.json(
        { error: 'Ticket non trouvé' },
        { status: 404 }
      );
    }
    
    // Traiter le résultat et sanitizer les données
    const rawTicket = parsePostgresExtendedOutput(stdout);
    const updatedTicket = sanitizeJsonData(rawTicket);
    
    return NextResponse.json({
      success: true,
      message: 'Ticket mis à jour avec succès',
      ticket: updatedTicket
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du ticket:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du ticket' },
      { status: 500 }
    );
  } finally {
    console.log('API /api/tickets/[id] - Fin de la requête PATCH');
  }
}

// Fonction pour analyser la sortie du format étendu de PostgreSQL
function parsePostgresExtendedOutput(output: string): any {
  const record: any = {};
  
  // Diviser la sortie en lignes
  const lines = output.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Ligne de données au format "clé | valeur"
    if (line.includes('|')) {
      const [key, value] = line.split('|').map(part => part.trim());
      if (key && value !== undefined) {
        // Convertir les types de données selon le nom de la colonne
        if (key === 'id') {
          record[key] = parseInt(value);
        } else if (key === 'form_data' || key === 'extra_details') {
          try {
            record[key] = value ? JSON.parse(value) : null;
          } catch (e) {
            record[key] = value;
          }
        } else {
          record[key] = value;
        }
      }
    }
  }
  
  return record;
}
