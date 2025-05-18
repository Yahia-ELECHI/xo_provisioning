'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/sidebar/Sidebar';

// URL de base de n8n
const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || 'https://192.168.10.50:5678';

// Interface pour les workflows
interface Workflow {
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

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<{success: boolean; message: string} | null>(null);
  const [updatingActive, setUpdatingActive] = useState(false);
  const [updateActiveResult, setUpdateActiveResult] = useState<{success: boolean; message: string} | null>(null);
  
  // État pour l'édition du workflow
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorkflow, setEditedWorkflow] = useState<Workflow | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{success: boolean; message: string} | null>(null);
  
  // État pour l'édition du JSON du workflow
  const [jsonEditing, setJsonEditing] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonWorkflow, setJsonWorkflow] = useState<string>("");
  const [updatingJson, setUpdatingJson] = useState(false);

  // Fonction pour récupérer le workflow spécifique
  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/n8n/workflows/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération du workflow: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Données workflow reçues:', data);
      setWorkflow(data);
    } catch (error) {
      console.error('Erreur lors de la récupération du workflow:', error);
      setError(`Erreur lors de la récupération du workflow: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer le workflow au chargement de la page
  useEffect(() => {
    if (id) {
      fetchWorkflow();
    }
  }, [id]);
  
  // Trouver l'URL du webhook pour l'exécution
  // Détection et construction de l'URL du webhook pour le workflow
  const webhookInfo = useMemo(() => {
    if (!workflow?.nodes) return { url: null, node: null };
    
    // Chercher tous les noeuds de type webhook
    const webhookNodes = workflow.nodes.filter(node => 
      (node.type && (
        node.type.includes('webhook') || 
        node.type.includes('Webhook') ||
        node.type === 'n8n-nodes-base.webhook' ||
        node.type === 'n8n-nodes-base.webhookRespond'
      ))
    );
    
    // Si aucun webhook n'est trouvé, retourner null
    if (webhookNodes.length === 0) return { url: null, node: null };
    
    // Sélectionner le premier webhook trouvé
    const webhookNode = webhookNodes[0];
    let url = null;
    
    // Construction de l'URL selon le type de webhook
    if (webhookNode.webhookId) {
      url = `${N8N_URL}/webhook/${webhookNode.webhookId}`;
    } else if (webhookNode.parameters?.path) {
      url = `${N8N_URL}/webhook/${webhookNode.parameters.path}`;
    }
    
    // Retourner à la fois l'URL et le noeud pour faciliter le débogage
    return { url, node: webhookNode };
  }, [workflow]);
  
  // Extraire l'URL du webhook pour faciliter l'accès
  const webhookUrl = webhookInfo.url;
  
  // Fonction pour exécuter le workflow via son webhook
  const executeWorkflow = async () => {
    try {
      setExecuting(true);
      setExecuteResult(null);
      
      // Vérification de l'existence d'un webhook valide
      if (!webhookUrl) {
        throw new Error('Ce workflow ne possède pas de webhook pour l\'exécution');
      }
      
      console.log('Execution du workflow via webhook:', webhookUrl);
      console.log('Détails du noeud webhook:', webhookInfo.node);
      
      // Envoi de la requête au webhook (GET par défaut)
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de l'exécution du workflow: ${response.status} ${response.statusText}`);
      }
      
      // Succès
      setExecuteResult({
        success: true,
        message: 'Workflow exécuté avec succès !'
      });
      
      // Actualisation des données du workflow après exécution
      setTimeout(() => {
        fetchWorkflow();
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de l\'exécution du workflow:', error);
      setExecuteResult({
        success: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setExecuting(false);
    }
  };
  
  // Fonction pour activer ou désactiver un workflow
  const toggleWorkflowActive = async () => {
    try {
      if (!workflow) return;
      
      setUpdatingActive(true);
      setUpdateActiveResult(null);
      
      const newActiveState = !workflow.active;
      
      console.log(`Mise à jour de l'état actif du workflow ${id} vers: ${newActiveState}`);
      
      const response = await fetch(`/api/n8n/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: newActiveState })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour de l'état actif: ${response.status} ${response.statusText}`);
      }
      
      const updatedWorkflow = await response.json();
      setWorkflow(updatedWorkflow);
      
      setUpdateActiveResult({
        success: true,
        message: `Workflow ${newActiveState ? 'activé' : 'désactivé'} avec succès!`
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'activité du workflow:', error);
      setUpdateActiveResult({
        success: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setUpdatingActive(false);
    }
  };
  
  // Fonction pour activer le mode édition
  const startEditing = () => {
    // Copie du workflow pour édition
    if (workflow) {
      setEditedWorkflow({ ...workflow });
      setIsEditing(true);
    }
  };
  
  // Fonction pour annuler l'édition
  const cancelEditing = () => {
    setIsEditing(false);
    setEditedWorkflow(null);
    setUpdateResult(null);
  };
  
  // Fonction pour activer l'édition JSON
  const startJsonEditing = () => {
    if (workflow) {
      try {
        // Formatage du JSON pour une meilleure lisibilité
        const formattedJson = JSON.stringify(workflow, null, 2);
        setJsonWorkflow(formattedJson);
        setJsonEditing(true);
        setJsonError(null);
      } catch (error) {
        console.error('Erreur lors de la conversion du workflow en JSON:', error);
        setJsonError('Erreur lors de la conversion du workflow en JSON');
      }
    }
  };
  
  // Fonction pour annuler l'édition JSON
  const cancelJsonEditing = () => {
    setJsonEditing(false);
    setJsonWorkflow("");
    setJsonError(null);
  };
  
  // Fonction pour mettre à jour un workflow
  const updateWorkflow = async () => {
    try {
      if (!editedWorkflow) return;
      
      setUpdating(true);
      setUpdateResult(null);
      
      console.log(`Mise à jour complète du workflow ${id}`);
      
      const response = await fetch(`/api/n8n/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedWorkflow)
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour du workflow: ${response.status} ${response.statusText}`);
      }
      
      const updatedWorkflow = await response.json();
      setWorkflow(updatedWorkflow);
      
      setUpdateResult({
        success: true,
        message: 'Workflow mis à jour avec succès!'
      });
      
      // Quitter le mode édition après succès
      setIsEditing(false);
      setEditedWorkflow(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du workflow:', error);
      setUpdateResult({
        success: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setUpdating(false);
    }
  };
  
  // Fonction pour mettre à jour un workflow depuis le JSON
  const updateWorkflowFromJson = async () => {
    try {
      if (!jsonWorkflow) return;
      
      // Vérification que le JSON est valide
      let parsedWorkflow;
      try {
        parsedWorkflow = JSON.parse(jsonWorkflow);
      } catch (parseError) {
        setJsonError('JSON invalide. Veuillez vérifier le format.');
        return;
      }
      
      setUpdatingJson(true);
      setJsonError(null);
      
      console.log(`Mise à jour du workflow ${id} depuis JSON modifié`);
      
      const response = await fetch(`/api/n8n/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parsedWorkflow)
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour du workflow depuis JSON: ${response.status} ${response.statusText}`);
      }
      
      const updatedWorkflow = await response.json();
      setWorkflow(updatedWorkflow);
      
      // Notification de succès
      setUpdateResult({
        success: true,
        message: 'Workflow mis à jour avec succès depuis le JSON modifié!'
      });
      
      // Quitter le mode d'édition JSON
      setJsonEditing(false);
      setJsonWorkflow("");
    } catch (error) {
      console.error('Erreur lors de la mise à jour du workflow depuis JSON:', error);
      setJsonError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setUpdatingJson(false);
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/workflows')}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              &larr; Retour
            </button>
            <h1 className="text-2xl font-bold">
              {loading ? 'Chargement...' : workflow?.name || 'Détails du workflow'}
            </h1>
            {workflow?.active ? (
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Actif
              </span>
            ) : (
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                Inactif
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-lg">Chargement du workflow...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Erreur</p>
              <p>{error}</p>
              <button 
                onClick={fetchWorkflow}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : workflow ? (
            <div className="space-y-6">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Informations du workflow</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Détails et propriétés.</p>
                </div>
                <div className="border-t border-gray-200">
                  <dl>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Nom</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{workflow.name}</dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{workflow.id}</dd>
                    </div>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Statut</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {workflow.active ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Actif
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactif
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Créé le</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(workflow.createdAt)}</dd>
                    </div>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Mis à jour le</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(workflow.updatedAt)}</dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Tags</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <div className="flex flex-wrap gap-1">
                          {workflow.tags && workflow.tags.length > 0 ? (
                            workflow.tags.map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">Aucun tag</span>
                          )}
                        </div>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-3 border-b">
                  <h2 className="text-lg font-medium text-gray-900">
                    Actions
                  </h2>
                </div>
                
                <div className="p-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex mb-2 gap-3">
                      <button
                        onClick={executeWorkflow}
                        disabled={executing || !workflow?.active || !webhookUrl}
                        className={`px-4 py-2 rounded ${(workflow?.active && webhookUrl) ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} transition-colors`}
                      >
                        {executing ? 'Exécution en cours...' : webhookUrl ? 'Exécuter le workflow' : 'Pas de webhook disponible'}
                      </button>
                      
                      <button
                        onClick={toggleWorkflowActive}
                        disabled={updatingActive}
                        className={`px-4 py-2 rounded ${updatingActive ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : (workflow?.active ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700')} transition-colors`}
                      >
                        {updatingActive ? 'Mise à jour...' : (workflow?.active ? 'Désactiver' : 'Activer')}
                      </button>
                      
                      <button
                        onClick={isEditing ? cancelEditing : startEditing}
                        disabled={updating}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                      >
                        {isEditing ? 'Annuler' : 'Éditer'}
                      </button>
                      
                      <a 
                        href={`${N8N_URL}/workflow/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                      >
                        Ouvrir dans n8n
                      </a>
                    </div>
                    
                    {executeResult && (
                      <div className={`mt-2 p-3 rounded ${executeResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                        {executeResult.message}
                      </div>
                    )}
                    
                    {updateActiveResult && (
                      <div className={`mt-2 p-3 rounded ${updateActiveResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                        {updateActiveResult.message}
                      </div>
                    )}
                    
                    {updateResult && (
                      <div className={`mt-2 p-3 rounded ${updateResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                        {updateResult.message}
                      </div>
                    )}
                    
                    {isEditing && editedWorkflow && (
                      <div className="mt-4 p-4 border border-gray-200 rounded bg-white">
                        <h4 className="text-lg font-medium mb-4">Modifier le workflow</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nom du workflow
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              value={editedWorkflow.name}
                              onChange={(e) => setEditedWorkflow({...editedWorkflow, name: e.target.value})}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tags (séparés par des virgules)
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              value={(editedWorkflow.tags || []).join(', ')}
                              onChange={(e) => {
                                const tagsArray = e.target.value
                                  .split(',')
                                  .map(tag => tag.trim())
                                  .filter(tag => tag !== '');
                                setEditedWorkflow({...editedWorkflow, tags: tagsArray});
                              }}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={cancelEditing}
                              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={updateWorkflow}
                              disabled={updating}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                            >
                              {updating ? 'Enregistrement...' : 'Enregistrer les modifications'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Informations techniques</h3>
                  <div className="mt-3">
                    <div className="bg-gray-50 p-4 rounded overflow-auto">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-medium text-gray-700">Structure du workflow</h4>
                        <div>
                          {!jsonEditing ? (
                            <button
                              onClick={startJsonEditing}
                              className="ml-2 px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                            >
                              Éditer JSON
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={cancelJsonEditing}
                                className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={updateWorkflowFromJson}
                                disabled={updatingJson}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-green-300"
                              >
                                {updatingJson ? 'Mise à jour...' : 'Enregistrer JSON'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {jsonError && (
                        <div className="mb-2 p-2 bg-red-50 text-red-700 border border-red-200 rounded">
                          {jsonError}
                        </div>
                      )}
                      
                      {jsonEditing ? (
                        <textarea
                          value={jsonWorkflow}
                          onChange={(e) => setJsonWorkflow(e.target.value)}
                          className="w-full h-96 font-mono text-xs p-4 bg-gray-900 text-gray-100 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                          spellCheck="false"
                        />
                      ) : (
                        <div className="p-4 bg-gray-900 text-gray-100 rounded overflow-auto max-h-96">
                          <pre className="text-xs">{JSON.stringify(workflow, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">Aucune information disponible pour ce workflow.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
