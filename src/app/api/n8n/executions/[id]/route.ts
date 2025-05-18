import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

// URL de base de n8n
const N8N_URL = process.env.N8N_URL || 'https://192.168.10.50:5678';
// Clé API n8n (récupérée depuis les variables d'environnement)
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1M2Q0MDg3Yy1lY2Q1LTRhYzMtYTAzOC0wMTQxZTZiMWJkOTAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ3MjI1NjQyfQ.AFe04bKJvIy-_ylqQVOvB0C5IIIv6dg7UF_f1Pj1QEk';

// Fonction pour récupérer une exécution spécifique depuis n8n
async function fetchExecutionFromN8n(id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Options pour la requête HTTP
    const options = {
      hostname: new URL(N8N_URL).hostname,
      port: new URL(N8N_URL).port || 443,
      path: `/api/v1/executions/${id}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
      },
      rejectUnauthorized: false // Important pour les certificats auto-signés
    };

    console.log(`[API n8n/executions/${id}] Requête vers /api/v1/executions/${id}`);

    // Création et envoi de la requête
    const req = https.request(options, (res) => {
      // Si le code de statut n'est pas 200, on rejette la promesse
      if (res.statusCode !== 200) {
        console.error(`Erreur lors de la récupération de l'exécution depuis n8n: ${res.statusCode} ${res.statusMessage}`);
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
          console.log(`[API n8n/executions/${id}] Réponse brute: ${responseBody.substring(0, 200)}...`);
          
          const parsedData = JSON.parse(responseBody);
          console.log(`[API n8n/executions/${id}] Données analysées:`, JSON.stringify(parsedData).substring(0, 200));
          
          // La réponse peut être directe ou contenir un objet data
          const data = parsedData.data || parsedData;
          console.log(`[API n8n/executions/${id}] Données extraites:`, JSON.stringify(data).substring(0, 200));
          
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

    // Finalisation de la requête
    req.end();
  });
}

// Interface pour l'exécution normalisée
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
  data?: any;
  nodeExecutionOrder?: string[];
  nodeExecutionStats?: any;
}

// Fonction pour normaliser les données de l'exécution avec traitement amélioré du statut
function normalizeExecution(execution: any): ExecutionData {
  // Détermination du statut en se basant sur la logique de la liste globale
  let status = execution.status;
  
  // Si l'exécution est terminée (finished=true) et qu'il n'y a pas d'erreur,
  // c'est un succès, même si le statut n'est pas explicitement indiqué
  if (execution.finished === true && !status) {
    status = 'success';
  }
  
  // Si l'exécution a une date de fin mais que le statut est manquant, on la considère comme terminée avec succès
  if (execution.stoppedAt && !status) {
    status = 'success';
  }
  
  // Si l'exécution n'est pas terminée (finished=false) et n'a pas de date de fin, c'est qu'elle est en cours
  if (execution.finished === false && !execution.stoppedAt && !status) {
    status = 'running';
  }
  
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
    status: status,
    lastNodeExecuted: execution.lastNodeExecuted,
    data: execution.data,
    nodeExecutionOrder: execution.nodeExecutionOrder,
    nodeExecutionStats: execution.nodeExecutionStats
  };
}

// Gestion de la requête GET pour une exécution spécifique
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    // Utilisez les paramètres directement sans essayer de les extraire
    if (!params || !params.id) {
      return NextResponse.json({ error: 'ID d\'exécution manquant' }, { status: 400 });
    }
    
    const id = params.id.toString();
    console.log(`[API n8n/executions/${id}] Récupération de l'exécution depuis n8n`);
    
    // Récupération de l'exécution depuis n8n
    const execution = await fetchExecutionFromN8n(id);
    console.log(`[API n8n/executions/${id}] Exécution récupérée avec succès`);
    
    // Normalisation des données avant de les renvoyer
    const normalizedExecution = normalizeExecution(execution);
    
    // Retour de l'exécution normalisée au client
    return NextResponse.json(normalizedExecution);
  } catch (error) {
    console.error('[API n8n/executions] Erreur:', error);
    
    // Retour d'une erreur au client
    return NextResponse.json(
      { error: `Erreur lors de la récupération de l'exécution: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
