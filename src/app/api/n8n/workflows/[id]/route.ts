import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { IncomingMessage } from 'http';

// URL de base de n8n
const N8N_URL = process.env.N8N_URL || 'https://192.168.10.50:5678';
// Clé API n8n (récupérée depuis les variables d'environnement)
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1M2Q0MDg3Yy1lY2Q1LTRhYzMtYTAzOC0wMTQxZTZiMWJkOTAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ3MjI1NjQyfQ.AFe04bKJvIy-_ylqQVOvB0C5IIIv6dg7UF_f1Pj1QEk';

// Fonction pour effectuer une requête HTTP vers l'API n8n
async function makeRequestToN8n(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // Options pour la requête HTTP
    const options = {
      hostname: new URL(N8N_URL).hostname,
      port: new URL(N8N_URL).port || 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
      },
      rejectUnauthorized: false // Important pour les certificats auto-signés
    };

    // Création et envoi de la requête
    const req = https.request(options, (res: IncomingMessage) => {
      // Traitement des codes de statut d'erreur
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        console.error(`Erreur lors de la communication avec n8n: ${res.statusCode} ${res.statusMessage}`);
        reject(new Error(`Erreur HTTP: ${res.statusCode}`));
        return;
      }

      // Récupération et concaténation des données
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      
      // Traitement final lorsque toutes les données sont reçues
      res.on('end', () => {
        try {
          const responseBody = Buffer.concat(chunks).toString('utf-8');
          if (!responseBody) {
            resolve({});
            return;
          }
          const data = JSON.parse(responseBody);
          resolve(data);
        } catch (error) {
          console.error('Erreur lors du parsing de la réponse n8n:', error);
          reject(error);
        }
      });
    });

    // Gestion des erreurs de requête
    req.on('error', (error) => {
      console.error('Erreur lors de la communication avec n8n:', error);
      reject(error);
    });

    // Envoi du body si présent
    if (body) {
      req.write(JSON.stringify(body));
    }

    // Finalisation de la requête
    req.end();
  });
}

// Fonction pour récupérer un workflow spécifique depuis n8n
async function fetchWorkflowFromN8n(id: string): Promise<any> {
  return makeRequestToN8n('GET', `/api/v1/workflows/${id}`);
}

// Interface pour le workflow normalisé
interface WorkflowData {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
  connections: any;
  settings: any;
  staticData?: any;
  tags?: string[];
  pinData?: any;
  versionId?: string;
}

// Fonction pour normaliser les données du workflow
function normalizeWorkflow(workflow: any): WorkflowData {
  return {
    id: workflow.id?.toString() || '',
    name: workflow.name?.toString() || 'Sans nom',
    active: workflow.active === true,
    createdAt: workflow.createdAt || new Date().toISOString(),
    updatedAt: workflow.updatedAt || new Date().toISOString(),
    nodes: workflow.nodes || [],
    connections: workflow.connections || {},
    settings: workflow.settings || {},
    staticData: workflow.staticData,
    tags: Array.isArray(workflow.tags) ? workflow.tags.map((tag: any) => tag.toString()) : [],
    pinData: workflow.pinData,
    versionId: workflow.versionId
  };
}

// Fonction pour mettre à jour un workflow sur n8n
async function updateWorkflowOnN8n(id: string, updates: any): Promise<any> {
  try {
    // Récupération du workflow existant pour extraction des nœuds
    console.log(`Récupération du workflow existant pour mise à jour`);
    const existingWorkflow = await fetchWorkflowFromN8n(id);
    
    // Utilisation exacte du format qui a fonctionné avec curl
    // Pas de simplification ou d'optimisation pour garantir la compatibilité
    console.log(`Préparation du payload avec le format exact qui a fonctionné en tests curl`);
    
    // Format exact qui a fonctionné lors des tests curl
    const updatePayload = {
      // Propriété à mettre à jour
      name: updates.name || existingWorkflow.name,
      
      // Ces propriétés sont OBLIGATOIRES et doivent être exactement celles du workflow existant
      nodes: existingWorkflow.nodes,
      connections: existingWorkflow.connections,
      settings: existingWorkflow.settings,
      staticData: existingWorkflow.staticData
    };
    
    // Utilisation du format exact qui a fonctionné dans les tests curl
    console.log(`Envoi du payload avec le format exact: ${JSON.stringify(Object.keys(updatePayload))}`);
    
    // Envoi des données avec exactement le même format que celui utilisé dans curl
    return makeRequestToN8n('PUT', `/api/v1/workflows/${id}`, updatePayload);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du workflow: ${error}`);
    throw error; 
  }
}

// Fonction pour activer/désactiver un workflow sur n8n
async function toggleWorkflowActiveState(id: string, active: boolean): Promise<any> {
  // L'API n8n exige une méthode POST pour activer/désactiver les workflows
  return makeRequestToN8n('POST', `/api/v1/workflows/${id}/${active ? 'activate' : 'deactivate'}`);
}

// Gestion de la requête GET pour un workflow spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Dans Next.js App Router, il faut s'assurer que params est awaité correctement
  const id = params?.id ? String(params.id) : '';
  
  try {
    // Vérification des paramètres
    if (!id) {
      return NextResponse.json({ error: 'ID de workflow manquant' }, { status: 400 });
    }
    
    console.log(`[API n8n/workflows/${id}] Récupération du workflow depuis n8n`);
    
    // Récupération du workflow depuis n8n
    const workflow = await fetchWorkflowFromN8n(id);
    console.log(`[API n8n/workflows/${id}] Workflow récupéré avec succès`);
    
    // Normalisation des données avant de les renvoyer
    const normalizedWorkflow = normalizeWorkflow(workflow);
    
    // Retour du workflow normalisé au client
    return NextResponse.json(normalizedWorkflow);
  } catch (error) {
    console.error('[API n8n/workflows] Erreur:', error);
    
    // Retour d'une erreur au client
    return NextResponse.json(
      { error: `Erreur lors de la récupération du workflow: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// Gestion de la requête PUT pour mettre à jour un workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Dans Next.js App Router, il faut s'assurer que params est awaité correctement
  const id = params?.id ? String(params.id) : '';
  
  try {
    // Vérification des paramètres
    if (!id) {
      return NextResponse.json({ error: 'ID de workflow manquant' }, { status: 400 });
    }
    
    // Récupération du corps de la requête
    const requestBody = await request.json();
    console.log(`[API n8n/workflows/${id}] Mise à jour du workflow`);
    
    // Déterminer si c'est une mise à jour complète ou juste un changement d'état actif/inactif
    let result;
    
    if (requestBody.hasOwnProperty('active') && Object.keys(requestBody).length === 1) {
      // C'est juste un changement d'état actif/inactif
      console.log(`[API n8n/workflows/${id}] Changement d'état actif: ${requestBody.active}`);
      result = await toggleWorkflowActiveState(id, requestBody.active);
    } else {
      // C'est une mise à jour complète du workflow
      console.log(`[API n8n/workflows/${id}] Mise à jour complète du workflow`);
      result = await updateWorkflowOnN8n(id, requestBody);
    }
    
    console.log(`[API n8n/workflows/${id}] Workflow mis à jour avec succès`);
    
    // Normalisation des données avant de les renvoyer
    const normalizedWorkflow = normalizeWorkflow(result);
    
    // Retour du workflow normalisé au client
    return NextResponse.json(normalizedWorkflow);
  } catch (error) {
    console.error('[API n8n/workflows] Erreur lors de la mise à jour:', error);
    
    // Retour d'une erreur au client
    return NextResponse.json(
      { error: `Erreur lors de la mise à jour du workflow: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}