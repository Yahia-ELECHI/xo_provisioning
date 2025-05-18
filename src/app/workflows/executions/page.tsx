'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
}

export default function ExecutionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalExecutions, setTotalExecutions] = useState(0);
  
  // Paramètres de pagination
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  
  // Filtres
  const [workflowId, setWorkflowId] = useState<string | undefined>(
    searchParams.get('workflowId') || undefined
  );
  const [status, setStatus] = useState<string | undefined>(
    searchParams.get('status') || undefined
  );
  
  // Fonction pour récupérer les exécutions
  const fetchExecutions = async (params: Record<string, any> = {}) => {
    try {
      setLoading(true);
      
      // Construction des paramètres de requête
      const queryParams = new URLSearchParams();
      
      // Ajout des paramètres de requête
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      
      // Requête à l'API
      const response = await fetch(`/api/n8n/executions?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des exécutions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Données reçues:', data);
      setExecutions(data || []);
      setTotalExecutions(data.length); // À mettre à jour si l'API renvoie un total
    } catch (error) {
      console.error('Erreur lors de la récupération des exécutions:', error);
      setError(`Erreur lors de la récupération des exécutions: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les exécutions au chargement de la page et lorsque les filtres changent
  useEffect(() => {
    fetchExecutions({
      limit,
      offset,
      workflowId,
      status
    });
  }, [limit, offset, workflowId, status]);

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

  // Fonction pour gérer la pagination
  const handlePagination = (newOffset: number) => {
    setOffset(newOffset);
  };

  // Fonction pour filtrer par workflow
  const handleFilterByWorkflow = (id?: string) => {
    setWorkflowId(id);
    setOffset(0); // Réinitialiser l'offset lors du changement de filtre
  };

  // Fonction pour filtrer par statut
  const handleFilterByStatus = (newStatus?: string) => {
    setStatus(newStatus);
    setOffset(0); // Réinitialiser l'offset lors du changement de filtre
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <Link href="/workflows" className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
              &larr; Workflows
            </Link>
            <h1 className="text-2xl font-bold">Exécutions des Workflows</h1>
          </div>
          <p className="text-sm text-gray-600">Historique et statut des exécutions des workflows n8n</p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading && executions.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-lg">Chargement des exécutions...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Erreur</p>
              <p>{error}</p>
              <button 
                onClick={() => fetchExecutions({ limit, offset, workflowId, status })}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filtres */}
              <div className="bg-white shadow sm:rounded-lg p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Filtre par workflow */}
                    <div className="flex-1 min-w-[200px]">
                      <label htmlFor="workflow-filter" className="block text-sm font-medium text-gray-700 mb-1">
                        Workflow
                      </label>
                      <select
                        id="workflow-filter"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        value={workflowId || ''}
                        onChange={(e) => handleFilterByWorkflow(e.target.value || undefined)}
                      >
                        <option value="">Tous les workflows</option>
                        {/* Option dynamique à implémenter en récupérant la liste des workflows */}
                      </select>
                    </div>
                    
                    {/* Filtre par statut */}
                    <div className="flex-1 min-w-[200px]">
                      <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                      </label>
                      <select
                        id="status-filter"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        value={status || ''}
                        onChange={(e) => handleFilterByStatus(e.target.value || undefined)}
                      >
                        <option value="">Tous les statuts</option>
                        <option value="success">Succès</option>
                        <option value="error">Erreur</option>
                        <option value="waiting">En attente</option>
                        <option value="running">En cours</option>
                        <option value="terminated">Terminé</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-end">
                    <button 
                      onClick={() => fetchExecutions({ limit, offset: 0, workflowId, status })}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Actualiser
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Tableau des exécutions */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-3 border-b">
                  <h2 className="text-lg font-medium text-gray-900">
                    Liste des exécutions ({executions.length})
                    {workflowId && <span className="ml-2 text-sm text-gray-500">Filtré par workflow: {workflowId}</span>}
                    {status && <span className="ml-2 text-sm text-gray-500">Statut: {status}</span>}
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflow</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Démarré le</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terminé le</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durée</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {executions.length > 0 ? (
                        executions.map((execution) => (
                          <tr 
                            key={execution.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/workflows/executions/${execution.id}`)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{execution.id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {execution.workflowName ? (
                                <Link 
                                  href={`/workflows/${execution.workflowId}`}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-900"
                                >
                                  {execution.workflowName}
                                </Link>
                              ) : (
                                <div className="text-sm text-gray-500">{execution.workflowId}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderStatus(execution)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{formatDate(execution.startedAt)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{formatDate(execution.stoppedAt)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {calculateDuration(execution.startedAt, execution.stoppedAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-3">
                                <Link 
                                  href={`/workflows/executions/${execution.id}`}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Détails
                                </Link>
                                <a 
                                  href={`${N8N_URL}/workflow/${execution.workflowId}/executions/${execution.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-900"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Voir dans n8n
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                            Aucune exécution trouvée
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {executions.length > 0 && (
                  <div className="px-4 py-3 flex items-center justify-between border-t">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => handlePagination(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                          offset === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Précédent
                      </button>
                      <button
                        onClick={() => handlePagination(offset + limit)}
                        disabled={executions.length < limit}
                        className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                          executions.length < limit
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Suivant
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Affichage de <span className="font-medium">{offset + 1}</span> à{' '}
                          <span className="font-medium">{offset + executions.length}</span> sur{' '}
                          <span className="font-medium">{totalExecutions}</span> résultats
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => handlePagination(Math.max(0, offset - limit))}
                            disabled={offset === 0}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                              offset === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            &laquo; Précédent
                          </button>
                          <button
                            onClick={() => handlePagination(offset + limit)}
                            disabled={executions.length < limit}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                              executions.length < limit
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            Suivant &raquo;
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
