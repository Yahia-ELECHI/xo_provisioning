'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/sidebar/Sidebar';

// URL de base de n8n
const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || 'https://192.168.10.50:5678';

// Interface pour les exécutions
interface Execution {
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

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer l'exécution spécifique
  const fetchExecution = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/n8n/executions/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération de l'exécution: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Données exécution reçues:', data);
      setExecution(data);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'exécution:', error);
      setError(`Erreur lors de la récupération de l'exécution: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer l'exécution au chargement de la page
  useEffect(() => {
    if (id) {
      fetchExecution();
    }
  }, [id]);

  // Fonction pour formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Fonction pour calculer la durée d'exécution
  const calculateDuration = (startedAt: string, stoppedAt?: string) => {
    if (!stoppedAt) return 'En cours...';
    
    const start = new Date(startedAt).getTime();
    const end = new Date(stoppedAt).getTime();
    const durationMs = end - start;
    
    if (durationMs < 1000) {
      return `${durationMs} ms`;
    } else if (durationMs < 60000) {
      return `${Math.round(durationMs / 1000)} sec`;
    } else {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.round((durationMs % 60000) / 1000);
      return `${minutes} min ${seconds} sec`;
    }
  };

  // Fonction pour afficher le statut
  const renderStatus = (execution: Execution) => {
    if (!execution.finished && !execution.stoppedAt) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          En cours
        </span>
      );
    }
    
    if (execution.status === 'success' || (execution.finished && !execution.status)) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          Succès
        </span>
      );
    }
    
    if (execution.status === 'error') {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          Erreur
        </span>
      );
    }

    if (execution.status === 'terminated') {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Terminé
        </span>
      );
    }
    
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
        {execution.status || 'Inconnu'}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/workflows/executions')}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              &larr; Retour
            </button>
            <h1 className="text-2xl font-bold">
              {loading ? 'Chargement...' : `Détails de l'exécution ${execution?.id.slice(0, 8)}...`}
            </h1>
            {execution && renderStatus(execution)}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-lg">Chargement de l'exécution...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Erreur</p>
              <p>{error}</p>
              <button 
                onClick={fetchExecution}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : execution ? (
            <div className="space-y-6">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Informations de l'exécution</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Détails et propriétés.</p>
                </div>
                <div className="border-t border-gray-200">
                  <dl>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{execution.id}</dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Workflow</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <Link 
                          href={`/workflows/${execution.workflowId}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {execution.workflowName || execution.workflowId}
                        </Link>
                      </dd>
                    </div>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Statut</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {renderStatus(execution)}
                      </dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Mode</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{execution.mode}</dd>
                    </div>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Démarré le</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(execution.startedAt)}</dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Terminé le</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(execution.stoppedAt)}</dd>
                    </div>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Durée</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {calculateDuration(execution.startedAt, execution.stoppedAt)}
                      </dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Dernier nœud exécuté</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{execution.lastNodeExecuted || 'N/A'}</dd>
                    </div>
                    {execution.retryOf && (
                      <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Nouvelle tentative de</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <Link 
                            href={`/workflows/executions/${execution.retryOf}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {execution.retryOf}
                          </Link>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Actions</h3>
                  <div className="mt-5 flex gap-3">
                    <a 
                      href={`${N8N_URL}/workflow/${execution.workflowId}/executions/${execution.id}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Voir dans n8n
                    </a>
                    <Link 
                      href={`/workflows/${execution.workflowId}`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Voir le workflow
                    </Link>
                  </div>
                </div>
              </div>

              {execution.nodeExecutionOrder && execution.nodeExecutionOrder.length > 0 && (
                <div className="bg-white shadow sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Ordre d'exécution des nœuds</h3>
                    <div className="mt-3 overflow-auto max-h-64">
                      <ul className="space-y-2">
                        {execution.nodeExecutionOrder.map((node, index) => (
                          <li key={index} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                            {index + 1}. {node}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {execution.data && (
                <div className="bg-white shadow sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Données d'exécution</h3>
                    <div className="mt-3">
                      <div className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(execution.data, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">Aucune information disponible pour cette exécution.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
