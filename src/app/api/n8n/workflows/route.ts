import { NextResponse } from 'next/server';
import https from 'https';

// URL de base de n8n
const N8N_URL = process.env.N8N_URL || 'https://192.168.10.50:5678';
// Clé API n8n (récupérée depuis les variables d'environnement)
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1M2Q0MDg3Yy1lY2Q1LTRhYzMtYTAzOC0wMTQxZTZiMWJkOTAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ3MjI1NjQyfQ.AFe04bKJvIy-_ylqQVOvB0C5IIIv6dg7UF_f1Pj1QEk';

// Fonction pour récupérer les workflows depuis n8n
async function fetchWorkflowsFromN8n(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Options pour la requête HTTP
    const options = {
      hostname: new URL(N8N_URL).hostname,
      port: new URL(N8N_URL).port || 443,
      path: '/api/v1/workflows',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
      },
      rejectUnauthorized: false // Important pour les certificats auto-signés
    };

    // Création et envoi de la requête
    const req = https.request(options, (res) => {
      // Si le code de statut n'est pas 200, on rejette la promesse
      if (res.statusCode !== 200) {
        console.error(`Erreur lors de la récupération des workflows depuis n8n: ${res.statusCode} ${res.statusMessage}`);
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
          const data = JSON.parse(responseBody);
          resolve(data.data || []);
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

    // Finalisation de la requête
    req.end();
  });
}

// Interface pour les workflows
interface WorkflowData {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

// Fonction pour normaliser les données des workflows
function normalizeWorkflows(workflows: any[]): WorkflowData[] {
  return workflows.map(workflow => {
    // Extraction des propriétés requises et conversion au format attendu
    return {
      id: workflow.id?.toString() || '',
      name: workflow.name?.toString() || 'Sans nom',
      active: workflow.active === true, // Conversion en booléen
      createdAt: workflow.createdAt || new Date().toISOString(),
      updatedAt: workflow.updatedAt || new Date().toISOString(),
      tags: Array.isArray(workflow.tags) ? workflow.tags.map((tag: any) => tag.toString()) : []
    };
  });
}

// Gestion de la requête GET
export async function GET() {
  try {
    console.log('[API n8n/workflows] Récupération des workflows depuis n8n');
    console.log(`[API n8n/workflows] URL n8n: ${N8N_URL}`);
    
    // Récupération des workflows depuis n8n
    const rawWorkflows = await fetchWorkflowsFromN8n();
    console.log(`[API n8n/workflows] ${rawWorkflows.length} workflows récupérés`);
    
    // Normalisation des données avant de les renvoyer
    const normalizedWorkflows = normalizeWorkflows(rawWorkflows);
    console.log('[API n8n/workflows] Données normalisées avec succès');
    
    // Retour des workflows normalisés au client
    return NextResponse.json(normalizedWorkflows);
  } catch (error) {
    console.error('[API n8n/workflows] Erreur:', error);
    
    // Retour d'une erreur au client
    return NextResponse.json(
      { error: `Erreur lors de la récupération des workflows: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
