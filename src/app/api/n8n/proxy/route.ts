import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import { cookies } from 'next/headers';

// URL de base de n8n
const N8N_URL = process.env.N8N_URL || 'https://192.168.10.50:5678';

// Crée un nouveau message d'erreur avec des détails
function createDetailedError(message: string, details?: any): Error {
  const error = new Error(message);
  if (details) {
    (error as any).details = details;
  }
  return error;
}

// Transmet une requête à n8n et renvoie la réponse
async function proxyRequest(request: NextRequest, path: string): Promise<Response> {
  try {
    // Construire l'URL complète pour n8n
    const url = new URL(path, N8N_URL);
    const isHttps = url.protocol === 'https:';

    // Récupérer le corps de la requête pour le transmettre
    let body: string | null = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    // Récupérer les en-têtes de la requête
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Filtrer les en-têtes qui ne doivent pas être transmis
      if (
        !['host', 'connection', 'content-length'].includes(key.toLowerCase())
      ) {
        headers[key] = value;
      }
    });

    // Ajouter les cookies de l'application à la requête n8n
    try {
      const cookieStore = await cookies();
      
      // Vérifier si getAll existe avant de l'appeler
      if (typeof cookieStore.getAll === 'function') {
        const cookieList = cookieStore.getAll();
        
        if (cookieList && cookieList.length > 0) {
          headers['Cookie'] = cookieList
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join('; ');
          console.log(`[Proxy n8n] Cookies transmis: ${cookieList.length}`);
        }
      }
    } catch (error) {
      console.error(`[Proxy n8n] Erreur de récupération des cookies:`, error);
    }

    // Journaliser les détails de la requête pour le débogage
    console.log(`[Proxy n8n] ${request.method} vers: ${url.toString()}`);
    console.log(`[Proxy n8n] En-têtes: ${JSON.stringify(headers)}`);

    // Créer et envoyer la requête à n8n
    return await new Promise((resolve, reject) => {
      const requestOptions = {
        method: request.method,
        headers: headers,
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        rejectUnauthorized: false // Important pour les certificats auto-signés
      };

      const clientRequest = (isHttps ? https : http).request(
        requestOptions,
        (proxyResponse) => {
          // Construire une réponse avec les données reçues de n8n
          const chunks: Buffer[] = [];
          proxyResponse.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          proxyResponse.on('end', () => {
            const responseBody = Buffer.concat(chunks).toString('utf-8');
            
            // Récupérer les en-têtes de la réponse
            const responseHeaders: Record<string, string> = {};
            Object.keys(proxyResponse.headers).forEach(key => {
              const value = proxyResponse.headers[key];
              if (value !== undefined) {
                // Convertir les tableaux en chaînes séparées par des virgules
                responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value as string;
              }
            });

            // Gérer spécifiquement les en-têtes Set-Cookie pour maintenir la session
            const setCookieHeader = proxyResponse.headers['set-cookie'];
            if (setCookieHeader) {
              // Traitement spécial pour les cookies
              const modifiedCookies: string[] = [];
              
              if (Array.isArray(setCookieHeader)) {
                // Traiter chaque cookie dans le tableau
                setCookieHeader.forEach(cookie => {
                  if (typeof cookie === 'string') {
                    // Adapter le cookie pour qu'il fonctionne dans notre domaine
                    const modifiedCookie = cookie
                      .replace(/; secure/gi, '')
                      .replace(/; SameSite=Lax/gi, '; SameSite=None')
                      .replace(/; SameSite=Strict/gi, '; SameSite=None');
                    modifiedCookies.push(modifiedCookie);
                  }
                });
              } else if (typeof setCookieHeader === 'string') {
                // Cas d'un seul cookie
                const modifiedCookie = setCookieHeader
                  .replace(/; secure/gi, '')
                  .replace(/; SameSite=Lax/gi, '; SameSite=None')
                  .replace(/; SameSite=Strict/gi, '; SameSite=None');
                modifiedCookies.push(modifiedCookie);
              }
              
              // Assigner les cookies modifiés
              if (modifiedCookies.length > 0) {
                responseHeaders['Set-Cookie'] = modifiedCookies.join(', ');
              }
            }

            // Créer la réponse finale
            const response = new NextResponse(responseBody, {
              status: proxyResponse.statusCode || 500,
              statusText: proxyResponse.statusMessage || 'Internal Server Error',
              headers: {
                ...responseHeaders,
                'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true'
              }
            });

            resolve(response);
          });
        }
      );

      // Gérer les erreurs de la requête
      clientRequest.on('error', (error) => {
        console.error(`[Proxy n8n] Erreur de requête: ${error.message}`);
        reject(createDetailedError(`Erreur lors de la communication avec n8n: ${error.message}`, { original: error }));
      });

      // Envoyer le corps de la requête si présent
      if (body) {
        clientRequest.write(body);
      }

      clientRequest.end();
    });
  } catch (error) {
    console.error('[Proxy n8n] Erreur:', error);
    return new NextResponse(
      JSON.stringify({ error: `Erreur lors de la communication avec n8n: ${(error as Error).message}` }),
      { status: 500 }
    );
  }
}

// Gère les requêtes GET
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/';
  return proxyRequest(request, path);
}

// Gère les requêtes POST
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/';
  return proxyRequest(request, path);
}

// Gère les requêtes PUT
export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/';
  return proxyRequest(request, path);
}

// Gère les requêtes DELETE
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/';
  return proxyRequest(request, path);
}

// Gère les requêtes OPTIONS (pour CORS)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}
