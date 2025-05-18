'use client';

import { useState, useEffect, useMemo } from 'react';
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
  tags?: string[];
}

// Type pour le champ de tri
type SortField = 'name' | 'id' | 'active' | 'createdAt' | 'updatedAt';

// Type pour la direction de tri
type SortDirection = 'asc' | 'desc';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeFilter, setActiveFilter] = useState<boolean | null>(true); // Filtre par défaut sur les workflows actifs
  

  // Fonction pour récupérer les workflows depuis n8n
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      
      // Créer un endpoint spécifique pour n8n
      const response = await fetch('/api/n8n/workflows', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des workflows: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Données reçues:', data);
      setWorkflows(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des workflows:', error);
      setError(`Erreur lors de la récupération des workflows: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les workflows au chargement de la page
  useEffect(() => {
    fetchWorkflows();
  }, []);
  
  // Fonction pour trier les workflows
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Si c'est déjà le champ de tri, on inverse la direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Sinon, on change le champ de tri et on met la direction par défaut (asc)
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Workflows filtrés et triés
  const filteredAndSortedWorkflows = useMemo(() => {
    // D'abord on filtre
    const filtered = workflows.filter(workflow => {
      // Filtre par terme de recherche
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = workflow.name.toLowerCase().includes(searchLower);
      const idMatch = workflow.id.toLowerCase().includes(searchLower);
      const tagMatch = workflow.tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false;
      
      // Filtre par statut actif
      const activeMatch = activeFilter === null || workflow.active === activeFilter;
      
      return (nameMatch || idMatch || tagMatch) && activeMatch;
    });
    
    // Ensuite on trie
    return [...filtered].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Traitement spécial pour les dates
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Comparaison en fonction de la direction
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [workflows, searchTerm, sortField, sortDirection]);

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

  // Fonction pour afficher le statut en français
  const renderStatus = (active: boolean) => {
    return active ? (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
        Actif
      </span>
    ) : (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
        Inactif
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b bg-white">
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-gray-600">Gestion des workflows n8n</p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-lg">Chargement des workflows...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Erreur</p>
              <p>{error}</p>
              <button 
                onClick={fetchWorkflows}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="flex flex-col gap-4 px-4 py-3 border-b">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <h2 className="text-lg font-medium text-gray-900">Liste des workflows ({filteredAndSortedWorkflows.length}/{workflows.length})</h2>
                    <Link
                      href="/workflows/executions"
                      className="ml-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <span className="mr-1">Voir les exécutions</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select 
                        className="block px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                        value={activeFilter === null ? "all" : activeFilter ? "active" : "inactive"}
                        onChange={(e) => {
                          if (e.target.value === "all") setActiveFilter(null);
                          else if (e.target.value === "active") setActiveFilter(true);
                          else setActiveFilter(false);
                        }}
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="active">Actifs</option>
                        <option value="inactive">Inactifs</option>
                      </select>
                    </div>
                    <button 
                      onClick={fetchWorkflows}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Actualiser
                    </button>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" aria-hidden="true" fill="none" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Rechercher par nom, ID ou tag..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        Nom
                        {sortField === 'name' && (
                          <span className="ml-1 inline-block">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('id')}
                      >
                        ID
                        {sortField === 'id' && (
                          <span className="ml-1 inline-block">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('active')}
                      >
                        Statut
                        {sortField === 'active' && (
                          <span className="ml-1 inline-block">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('createdAt')}
                      >
                        Créé le
                        {sortField === 'createdAt' && (
                          <span className="ml-1 inline-block">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('updatedAt')}
                      >
                        Mis à jour le
                        {sortField === 'updatedAt' && (
                          <span className="ml-1 inline-block">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedWorkflows.length > 0 ? (
                      filteredAndSortedWorkflows.map((workflow) => (
                        <tr key={workflow.id} className="cursor-pointer hover:bg-gray-50" onClick={() => window.location.href = `/workflows/${workflow.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{workflow.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{workflow.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatus(workflow.active)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{formatDate(workflow.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{formatDate(workflow.updatedAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a 
                              href={`${N8N_URL}/workflow/${workflow.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Éditer
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : searchTerm ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                          Aucun workflow ne correspond à votre recherche "{searchTerm}"
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                          Aucun workflow trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
