import { NextResponse } from 'next/server';
import https from 'https';

// URL de base de n8n
const N8N_URL = process.env.N8N_URL || 'https://192.168.10.50:5678';
// Clé API n8n (récupérée depuis les variables d'environnement)
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1M2Q0MDg3Yy1lY2Q1LTRhYzMtYTAzOC0wMTQxZTZiMWJkOTAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ3MjI1NjQyfQ.AFe04bKJvIy-_ylqQVOvB0C5IIIv6dg7UF_f1Pj1QEk';

// Fonction pour récupérer les exécutions depuis n8n - simplifiée sans paramètres
async function fetchExecutionsFromN8n(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Options pour la requête HTTP - exactement comme pour les workflows
    const options = {
      hostname: new URL(N8N_URL).hostname,
      port: new URL(N8N_URL).port || 443,
      path: '/api/v1/executions', // Chemin fixe sans paramètres
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
      },
      rejectUnauthorized: false // Important pour les certificats auto-signés
    };

    console.log('[API n8n/executions] Requête vers /api/v1/executions');

    // Création et envoi de la requête
    const req = https.request(options, (res) => {
      // Si le code de statut n'est pas 200, on rejette la promesse
      if (res.statusCode !== 200) {
        console.error(`Erreur lors de la récupération des exécutions depuis n8n: ${res.statusCode} ${res.statusMessage}`);
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

// Interface pour les exécutions normalisées
interface ExecutionData {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowName?: string;
  status?: string;
  lastNodeExecuted?: string;
}

// Fonction pour normaliser les données des exécutions
function normalizeExecutions(executions: any[]): ExecutionData[] {
  return executions.map(execution => {
    // Extraction des propriétés requises et conversion au format attendu
    return {
      id: execution.id?.toString() || '',
      finished: execution.finished === true,
      mode: execution.mode || 'unknown',
      retryOf: execution.retryOf,
      retrySuccessId: execution.retrySuccessId,
      startedAt: execution.startedAt || new Date().toISOString(),
      stoppedAt: execution.stoppedAt,
      workflowId: execution.workflowId?.toString() || '',
      workflowName: execution.workflowName,
      status: execution.status,
      lastNodeExecuted: execution.lastNodeExecuted
    };
  });
}

// Gestion de la requête GET
export async function GET(request: Request) {
  try {
    // Récupération des paramètres de requête
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0;
    const workflowId = url.searchParams.get('workflowId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    
    console.log(`[API n8n/executions] Récupération des exécutions depuis n8n`);
    console.log(`[API n8n/executions] Paramètres: limit=${limit}, offset=${offset}, workflowId=${workflowId}, status=${status}`);
    
    // Construction des paramètres pour l'API n8n
    const queryParams = {
      limit,
      offset,
      workflowId,
      status
    };
    
    // Récupération des exécutions depuis n8n - sans paramètres
    const executions = await fetchExecutionsFromN8n();
    console.log(`[API n8n/executions] ${executions.length} exécutions récupérées`);
    
    // Normalisation des données avant de les renvoyer
    const normalizedExecutions = normalizeExecutions(executions);
    console.log('[API n8n/executions] Données normalisées avec succès');
    
    // Retour des exécutions normalisées au client
    return NextResponse.json(normalizedExecutions);
  } catch (error) {
    console.error('[API n8n/executions] Erreur:', error);
    
    // Retour d'une erreur au client
    return NextResponse.json(
      { error: `Erreur lors de la récupération des exécutions: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
