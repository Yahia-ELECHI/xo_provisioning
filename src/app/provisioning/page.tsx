'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Interfaces
interface Ticket {
  id: number;
  subject: string;
  created_at: string;
  type_of_request: string;
  classifier: string;
  status?: string;
}

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface TicketsResponse {
  data: Ticket[];
  pagination: PaginationData;
}

export default function ProvisioningPage() {
  // États pour les données et les paramètres
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ 
    total: 0, 
    page: 1, 
    pageSize: 10, 
    totalPages: 0 
  });
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Fonction pour charger les tickets
  const loadTickets = async (page = 1) => {
    console.log('Début du chargement des tickets, page:', page);
    setLoading(true);
    try {
      // Construction de l'URL avec les paramètres
      const url = new URL('/api/tickets', window.location.origin);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('pageSize', pagination.pageSize.toString());
      url.searchParams.append('sortBy', sortBy);
      url.searchParams.append('sortOrder', sortOrder);
      
      if (searchQuery) {
        url.searchParams.append('search', searchQuery);
      }
      
      console.log('URL de requête:', url.toString());
      const response = await fetch(url.toString());
      const data: TicketsResponse = await response.json();
      
      console.log('Tickets reçus:', data.data.length);
      console.log('Pagination:', data.pagination);
      
      setTickets(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Erreur lors du chargement des tickets:', error);
    } finally {
      setLoading(false);
      if (initialLoad) setInitialLoad(false);
      console.log('Fin du chargement des tickets');
    }
  };

  // Vérification d'authentification et chargement initial
  useEffect(() => {
    console.log('Initialisation de la page des tickets, tri:', sortBy, sortOrder, 'recherche:', searchQuery);
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (!data.success) {
          router.push('/login');
        } else {
          // Charger les tickets seulement si l'authentification est réussie
          loadTickets(pagination.page);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [sortBy, sortOrder, searchQuery]); // Recharger quand ces paramètres changent

  // Gestionnaire pour le changement de page
  const handlePageChange = (newPage: number) => {
    console.log('Changement de page demandé:', newPage);
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
      loadTickets(newPage);
    } else {
      console.log('Page demandée hors limites:', newPage, 'max:', pagination.totalPages);
    }
  };

  // Gestionnaire pour le tri
  const handleSort = (column: string) => {
    console.log('Tri demandé sur la colonne:', column);
    if (sortBy === column) {
      // Inverser l'ordre si on clique sur la même colonne
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      console.log('Inversion de l\'ordre:', newOrder);
      setSortOrder(newOrder);
    } else {
      // Nouvelle colonne, définir ordre descendant par défaut
      console.log('Nouvelle colonne de tri:', column);
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Gestionnaire pour la recherche
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Recherche demandée:', search);
    setSearchQuery(search);
    setPagination({ ...pagination, page: 1 }); // Retourner à la première page
  };

  // Format de la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Affichage du loader pendant le chargement initial
  if (initialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Provisioning - Tickets VOIP</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between mb-6">
          <h2 className="text-xl font-semibold">Liste des tickets</h2>
          
          {/* Formulaire de recherche */}
          <form onSubmit={handleSearch} className="mt-4 md:mt-0 flex">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Rechercher
            </button>
          </form>
        </div>

        {/* Tableau des tickets */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('id')}
                >
                  ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('subject')}
                >
                  Sujet {sortBy === 'subject' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('type_of_request')}
                >
                  Type {sortBy === 'type_of_request' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('classifier')}
                >
                  Classification {sortBy === 'classifier' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('status')}
                >
                  Statut {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('created_at')}
                >
                  Date {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Aucun ticket trouvé
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/provisioning/tickets/${ticket.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.type_of_request}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.classifier || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ticket.status === 'ouvert' ? 'bg-blue-100 text-blue-800' : 
                                                                                ticket.status === 'en cours' ? 'bg-yellow-100 text-yellow-800' : 
                                                                                ticket.status === 'résolu' ? 'bg-green-100 text-green-800' : 
                                                                                ticket.status === 'fermé' ? 'bg-gray-100 text-gray-800' : 
                                                                                'bg-blue-100 text-blue-800'}`}>
                        {ticket.status || 'ouvert'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(ticket.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-700">
              Affichage de {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1} à {Math.min(pagination.page * pagination.pageSize, pagination.total)} sur {pagination.total} résultats
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`px-3 py-1 rounded-md ${pagination.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Précédent
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                // Afficher au maximum 5 pages autour de la page courante
                let pageNumber;
                if (pagination.totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (pagination.page <= 3) {
                  pageNumber = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNumber = pagination.totalPages - 4 + i;
                } else {
                  pageNumber = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`px-3 py-1 rounded-md ${pagination.page === pageNumber ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className={`px-3 py-1 rounded-md ${pagination.page === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
