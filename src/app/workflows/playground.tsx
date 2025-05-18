import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';

// URL de base de n8n
const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || 'https://192.168.10.50:5678';

// Interface pour les nœuds de workflow
interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
}

// Interface pour les connexions entre nœuds
interface WorkflowConnection {
  source: string;
  sourceOutput: string;
  target: string;
  targetInput: string;
}

// Interface pour un workflow
interface Workflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: Record<string, WorkflowConnection[]>;
  settings?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Interface pour une exécution de workflow
interface Execution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  status: string;
  workflowId: string;
  data: Record<string, any>;
  workflowData?: {
    id: string;
    name: string;
  };
}

// Interface pour les props du composant Playground
interface PlaygroundProps {
  authToken: string | null;
  onDebugLog: (message: string) => void;
}

export const Playground: React.FC<PlaygroundProps> = ({ authToken, onDebugLog }) => {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [workflowDetails, setWorkflowDetails] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [executionData, setExecutionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'executions'>('details');

  // Vérification du token d'authentification
  if (!authToken) {
    return <div>Erreur: Aucun jeton d'authentification fourni</div>;
  }

  // Fonction pour récupérer les workflows
  const fetchWorkflows = useCallback(async () => {
    if (!authToken) return;
    
    setLoading(true);
    try {
      onDebugLog(`${new Date().toISOString()} - Récupération des workflows`);
      
      const response = await fetch('/api/n8n/proxy?path=/api/v1/workflows', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': authToken
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des workflows: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setWorkflows(data.data || []);
      onDebugLog(`${new Date().toISOString()} - ${data.data?.length || 0} workflows récupérés`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors de la récupération des workflows: ${errorMessage}`);
      onDebugLog(`${new Date().toISOString()} - Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [authToken, onDebugLog]);

  // Fonction pour récupérer les détails d'un workflow
  const fetchWorkflowDetails = useCallback(async (workflowId: string) => {
    if (!authToken) return null;
    
    try {
      onDebugLog(`${new Date().toISOString()} - Récupération des détails du workflow ${workflowId}`);
      
      const response = await fetch(`/api/n8n/proxy?path=/api/v1/workflows/${workflowId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': authToken
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des détails du workflow: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      onDebugLog(`${new Date().toISOString()} - Détails du workflow ${workflowId} récupérés`);
      return data.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors de la récupération des détails du workflow: ${errorMessage}`);
      onDebugLog(`${new Date().toISOString()} - Erreur: ${errorMessage}`);
      return null;
    }
  }, [authToken, onDebugLog]);

  // Fonction pour exécuter un workflow
  const executeWorkflow = useCallback(async (workflowId: string) => {
    if (!authToken) return null;
    
    setExecutionLoading(true);
    try {
      onDebugLog(`${new Date().toISOString()} - Exécution du workflow ${workflowId}`);
      
      const response = await fetch(`/api/n8n/proxy?path=/api/v1/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': authToken
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de l'exécution du workflow: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      onDebugLog(`${new Date().toISOString()} - Workflow ${workflowId} exécuté avec succès`);
      
      // Rafraîchir la liste des exécutions
      if (selectedWorkflow) {
        await fetchWorkflowExecutions(selectedWorkflow);
      }
      
      return data.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors de l'exécution du workflow: ${errorMessage}`);
      onDebugLog(`${new Date().toISOString()} - Erreur: ${errorMessage}`);
      return null;
    } finally {
      setExecutionLoading(false);
    }
  }, [authToken, onDebugLog, selectedWorkflow]);

  // Fonction pour récupérer les exécutions d'un workflow
  const fetchWorkflowExecutions = useCallback(async (workflowId: string) => {
    if (!authToken) {
      onDebugLog(`${new Date().toISOString()} - Impossible de récupérer les exécutions: pas de token d'authentification`);
      return [];
    }
    
    setExecutionLoading(true);
    try {
      onDebugLog(`${new Date().toISOString()} - Récupération des exécutions du workflow ${workflowId}`);
      
      const response = await fetch(`/api/n8n/proxy?path=/api/v1/executions?workflowId=${workflowId}&limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': authToken
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des exécutions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const executions = data.data || [];
      setExecutions(executions);
      onDebugLog(`${new Date().toISOString()} - ${executions.length} exécutions récupérées`);
      return executions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors de la récupération des exécutions: ${errorMessage}`);
      onDebugLog(`${new Date().toISOString()} - Erreur: ${errorMessage}`);
      return [];
    } finally {
      setExecutionLoading(false);
    }
  }, [authToken, onDebugLog]);

  // Fonction pour récupérer les détails d'une exécution
  const fetchExecutionDetails = useCallback(async (executionId: string) => {
    if (!authToken) return null;
    
    try {
      onDebugLog(`${new Date().toISOString()} - Récupération des détails de l'exécution ${executionId}`);
      
      const response = await fetch(`/api/n8n/proxy?path=/api/v1/executions/${executionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': authToken
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des détails de l'exécution: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      onDebugLog(`${new Date().toISOString()} - Détails de l'exécution ${executionId} récupérés`);
      return data.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors de la récupération des détails de l'exécution: ${errorMessage}`);
      onDebugLog(`${new Date().toISOString()} - Erreur: ${errorMessage}`);
      return null;
    }
  }, [authToken, onDebugLog]);

  // Effet pour charger les workflows au montage du composant
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Effet pour charger les détails du workflow sélectionné
  useEffect(() => {
    const loadWorkflowDetails = async () => {
      if (selectedWorkflow) {
        const details = await fetchWorkflowDetails(selectedWorkflow);
        setWorkflowDetails(details);
        
        // Charger les exécutions du workflow
        await fetchWorkflowExecutions(selectedWorkflow);
      } else {
        setWorkflowDetails(null);
        setExecutions([]);
        setSelectedExecution(null);
        setExecutionData(null);
      }
    };
    
    loadWorkflowDetails();
  }, [selectedWorkflow, fetchWorkflowDetails, fetchWorkflowExecutions]);

  // Effet pour charger les détails de l'exécution sélectionnée
  useEffect(() => {
    const loadExecutionDetails = async () => {
      if (selectedExecution) {
        const details = await fetchExecutionDetails(selectedExecution);
        setExecutionData(details);
      } else {
        setExecutionData(null);
      }
    };
    
    loadExecutionDetails();
  }, [selectedExecution, fetchExecutionDetails]);

  // Rendu du composant
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Playground n8n</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Liste des workflows */}
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Workflows</h2>
          {loading ? (
            <p>Chargement des workflows...</p>
          ) : (
            <ul className="space-y-2">
              {workflows.map((workflow) => (
                <li
                  key={workflow.id}
                  className={`p-3 mb-2 rounded cursor-pointer hover:bg-gray-100 ${
                    selectedWorkflow === workflow.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedWorkflow(workflow.id)}
                >
                  <div className="font-medium">{workflow.name}</div>
                  <div className="text-sm text-gray-500">
                    {workflow.description || 'Aucune description'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="md:col-span-2">
          <h4 className="text-lg font-medium mb-3">Détails du workflow</h4>
          
          {selectedWorkflow ? (
            workflowDetails ? (
              <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                <div className="mb-4">
                  <h5 className="text-xl font-bold">{workflowDetails.name}</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    {workflowDetails.description || 'Aucune description'}
                  </p>
                </div>

                <div className="border-b">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium ${
                        activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('details')}
                    >
                      Détails
                    </button>
                    <button
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium ${
                          activeTab === 'executions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      onClick={() => setActiveTab('executions')}
                    >
                      Exécutions
                    </button>
                  </nav>
                </div>

                {activeTab === 'details' && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h6 className="font-medium mb-2">Informations générales</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500">ID</span>
                            <span>{workflowDetails.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Statut</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              workflowDetails.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {workflowDetails.active ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Créé le</span>
                            <span>{new Date(workflowDetails.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Mis à jour le</span>
                            <span>{new Date(workflowDetails.updatedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h6 className="font-medium mb-2">Nœuds</h6>
                        <div className="space-y-2">
                          {workflowDetails.nodes.map((node) => (
                            <div key={node.id} className="flex justify-between">
                              <span className="text-gray-500">{node.type}</span>
                              <span>{node.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => executeWorkflow(workflowDetails.id)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                        disabled={executionLoading}
                      >
                        {executionLoading ? 'En cours...' : 'Exécuter le workflow'}
                      </button>
                      <a
                        href={`${N8N_URL}/workflow/${workflowDetails.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-2"
                      >
                        Ouvrir dans n8n
                      </a>
                    </div>
                  </div>
                )}

                {activeTab === 'executions' && (
                  <div className="mt-4">
                    {executions.length > 0 ? (
                      <div className="space-y-4">
                        {executions.map((execution) => (
                          <div
                            key={execution.id}
                            className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                              selectedExecution === execution.id ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                            onClick={() => setSelectedExecution(execution.id)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h6 className="font-medium">Exécution #{execution.id}</h6>
                                <p className="text-sm text-gray-500">
                                  {new Date(execution.startedAt).toLocaleString()}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                execution.status === 'success' ? 'bg-green-100 text-green-800' :
                                execution.status === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {execution.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-500">Aucune exécution pour ce workflow</p>
                        <button
                          onClick={() => executeWorkflow(workflowDetails.id)}
                          className="mt-2 text-blue-500 hover:text-blue-600"
                        >
                          Exécuter le workflow
                        </button>
                      </div>
                    )}

                    {selectedExecution && executionData && (
                      <div className="mt-4">
                        <h6 className="font-medium mb-2">Résultat de l'exécution</h6>
                        <div className="bg-gray-100 p-3 rounded-md">
                          <pre className="text-xs overflow-x-auto max-h-[200px]">
                            {JSON.stringify(executionData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              </div>
            )
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Sélectionnez un workflow pour voir ses détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
