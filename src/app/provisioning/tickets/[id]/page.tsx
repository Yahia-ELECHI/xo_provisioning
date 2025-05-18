'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import JsonViewer from '@/components/JsonViewer';
import JsonEditor from '@/components/JsonEditor';

// Interface pour le ticket
interface Ticket {
  id: number;
  subject: string;
  created_at: string;
  type_of_request: string;
  classifier?: string;
  status?: string;
  form_data: any;
  extra_details: any;
}

// Types d'édition possibles
type EditableField = 'subject' | 'type_of_request' | 'classifier' | 'status' | 'form_data' | 'extra_details';

// Interface pour les champs en cours d'édition
interface EditingState {
  subject: boolean;
  type_of_request: boolean;
  classifier: boolean;
  status: boolean;
  form_data: boolean;
  extra_details: boolean;
}

export default function TicketDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
  
  // État pour suivre les champs en édition
  const [editing, setEditing] = useState<EditingState>({
    subject: false,
    type_of_request: false,
    classifier: false,
    status: false,
    form_data: false,
    extra_details: false
  });
  
  // États temporaires pour les valeurs en édition
  const [editedSubject, setEditedSubject] = useState<string>('');
  const [editedTypeOfRequest, setEditedTypeOfRequest] = useState<string>('');
  const [editedClassifier, setEditedClassifier] = useState<string>('');
  const [editedStatus, setEditedStatus] = useState<string>('');

  // Charger les détails du ticket
  useEffect(() => {
    const fetchTicketDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tickets/${params.id}`);
        if (!response.ok) {
          throw new Error(`Erreur lors de la récupération du ticket: ${response.statusText}`);
        }
        const data = await response.json();
        setTicket(data);
        
        // Initialiser les valeurs d'édition
        if (data) {
          setEditedSubject(data.subject || '');
          setEditedTypeOfRequest(data.type_of_request || '');
          setEditedClassifier(data.classifier || '');
          setEditedStatus(data.status || 'ouvert');
        }
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors du chargement des détails du ticket');
      } finally {
        setLoading(false);
      }
    };
    
    // Vérifier l'authentification
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (!data.success) {
          router.push('/login');
        } else {
          // Charger les détails du ticket si l'authentification est réussie
          fetchTicketDetails();
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [params.id, router]);

  // Fonction pour supprimer le ticket
  const deleteTicket = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) {
      return;
    }
    
    setDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/tickets/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }
      
      // Rediriger vers la liste des tickets
      router.push('/provisioning');
      
    } catch (err: any) {
      console.error('Erreur de suppression:', err);
      setDeleteError(err.message || 'Erreur lors de la suppression du ticket');
      setDeleting(false);
    }
  };
  
  // Fonction pour activer l'édition d'un champ
  const startEditing = (field: EditableField) => {
    setEditing(prev => ({
      ...prev,
      [field]: true
    }));
    setUpdateError(null);
    setUpdateSuccess(false);
  };
  
  // Fonction pour annuler l'édition d'un champ
  const cancelEditing = (field: EditableField) => {
    setEditing(prev => ({
      ...prev,
      [field]: false
    }));
    
    // Réinitialiser les valeurs éditées
    if (ticket) {
      if (field === 'subject') setEditedSubject(ticket.subject || '');
      if (field === 'type_of_request') setEditedTypeOfRequest(ticket.type_of_request || '');
      if (field === 'classifier') setEditedClassifier(ticket.classifier || '');
      if (field === 'status') setEditedStatus(ticket.status || 'ouvert');
    }
  };
  
  // Fonction pour mettre à jour le ticket
  const updateTicket = async (updatedData: Partial<Ticket>) => {
    if (!ticket) return;
    
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    
    try {
      const response = await fetch(`/api/tickets/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }
      
      const result = await response.json();
      
      // Mettre à jour le ticket dans l'état local
      setTicket(result.ticket);
      
      // Réinitialiser tous les états d'édition
      setEditing({
        subject: false,
        type_of_request: false,
        classifier: false,
        status: false,
        form_data: false,
        extra_details: false
      });
      
      setUpdateSuccess(true);
      
      // Masquer le message de succès après 3 secondes
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Erreur de mise à jour:', err);
      setUpdateError(err.message || 'Erreur lors de la mise à jour du ticket');
    } finally {
      setUpdating(false);
    }
  };
  
  // Fonction pour sauvegarder un champ texte
  const saveTextField = (field: 'subject' | 'type_of_request' | 'classifier' | 'status') => {
    if (!ticket) return;
    
    let value = '';
    switch (field) {
      case 'subject':
        value = editedSubject;
        break;
      case 'type_of_request':
        value = editedTypeOfRequest;
        break;
      case 'classifier':
        value = editedClassifier;
        break;
      case 'status':
        value = editedStatus;
        break;
    }
    
    // Créer l'objet de mise à jour
    const updateData = { [field]: value };
    updateTicket(updateData);
  };
  
  // Fonction pour sauvegarder les données JSON
  const saveJsonField = (field: 'form_data' | 'extra_details', data: any) => {
    if (!ticket) return;
    updateTicket({ [field]: data });
  };
  
  // Format de la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Détail du ticket</h1>
            <Link 
              href="/provisioning" 
              className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Retour à la liste
            </Link>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Afficher les détails du ticket
  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Détail du ticket #{ticket?.id}</h1>
            <div className="flex space-x-2">
              <Link 
                href="/provisioning" 
                className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Retour à la liste
              </Link>
              <button
                onClick={deleteTicket}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
          
          {/* Message d'erreur ou de succès */}
          {updateError && (
            <div className="p-3 bg-red-100 text-red-700 border-b border-red-200">
              {updateError}
            </div>
          )}
          {updateSuccess && (
            <div className="p-3 bg-green-100 text-green-700 border-b border-green-200">
              Ticket mis à jour avec succès!
            </div>
          )}
          
          {deleteError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {deleteError}
            </div>
          )}
          
          {ticket && (
            <div className="space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Informations générales</h2>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-gray-500">ID:</span>
                      <span className="ml-2 font-medium">{ticket.id}</span>
                    </div>
                    <div className="p-4">
                      {/* Sujet - éditable */}
                      <div className="flex items-center mb-4">
                        {editing.subject ? (
                          <div className="w-full">
                            <input 
                              type="text" 
                              className="w-full p-2 border rounded-md text-2xl font-bold" 
                              value={editedSubject}
                              onChange={(e) => setEditedSubject(e.target.value)}
                            />
                            <div className="flex space-x-2 mt-2">
                              <button 
                                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                                onClick={() => saveTextField('subject')}
                                disabled={updating}
                              >
                                {updating ? 'Enregistrement...' : 'Enregistrer'}
                              </button>
                              <button 
                                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
                                onClick={() => cancelEditing('subject')}
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full flex justify-between items-center">
                            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
                            <button 
                              className="ml-2 text-blue-600 hover:text-blue-800 px-2 py-1 text-sm"
                              onClick={() => startEditing('subject')}
                            >
                              ✏️ Modifier
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {/* Statut - éditable */}
                        <div>
                          <span className="text-gray-500">Statut:</span>
                          {editing.status ? (
                            <div className="mt-1">
                              <select
                                className="w-full p-2 border rounded-md"
                                value={editedStatus}
                                onChange={(e) => setEditedStatus(e.target.value)}
                              >
                                <option value="ouvert">Ouvert</option>
                                <option value="en cours">En cours</option>
                                <option value="résolu">Résolu</option>
                                <option value="fermé">Fermé</option>
                              </select>
                              <div className="flex space-x-2 mt-1">
                                <button 
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                                  onClick={() => saveTextField('status')}
                                  disabled={updating}
                                >
                                  {updating ? '...' : 'OK'}
                                </button>
                                <button 
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
                                  onClick={() => cancelEditing('status')}
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span className={`ml-2 font-medium px-2 py-1 rounded-full text-xs ${ticket.status === 'ouvert' ? 'bg-blue-100 text-blue-800' : 
                                                                              ticket.status === 'en cours' ? 'bg-yellow-100 text-yellow-800' : 
                                                                              ticket.status === 'résolu' ? 'bg-green-100 text-green-800' : 
                                                                              ticket.status === 'fermé' ? 'bg-gray-100 text-gray-800' : 
                                                                              'bg-blue-100 text-blue-800'}`}>
                                {ticket.status || 'ouvert'}
                              </span>
                              <button 
                                className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                                onClick={() => startEditing('status')}
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Type de demande - éditable */}
                        <div>
                          <span className="text-gray-500">Type de demande:</span>
                          {editing.type_of_request ? (
                            <div className="mt-1">
                              <input 
                                type="text" 
                                className="w-full p-2 border rounded-md" 
                                value={editedTypeOfRequest}
                                onChange={(e) => setEditedTypeOfRequest(e.target.value)}
                              />
                              <div className="flex space-x-2 mt-1">
                                <button 
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                                  onClick={() => saveTextField('type_of_request')}
                                  disabled={updating}
                                >
                                  {updating ? '...' : 'OK'}
                                </button>
                                <button 
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
                                  onClick={() => cancelEditing('type_of_request')}
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span className="ml-2 font-medium">{ticket.type_of_request}</span>
                              <button 
                                className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                                onClick={() => startEditing('type_of_request')}
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Classification - éditable */}
                        <div>
                          <span className="text-gray-500">Classification:</span>
                          {editing.classifier ? (
                            <div className="mt-1">
                              <select
                                className="w-full p-2 border rounded-md" 
                                value={editedClassifier}
                                onChange={(e) => setEditedClassifier(e.target.value)}
                              >
                                <option value="">-- Sélectionner --</option>
                                <option value="CHANGE">CHANGE</option>
                                <option value="INCIDENT">INCIDENT</option>
                                <option value="Potential Incident Marked As Change">Potential Incident Marked As Change</option>
                                <option value="Potential Change Marked As Incident">Potential Change Marked As Incident</option>
                              </select>
                              <div className="flex space-x-2 mt-1">
                                <button 
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                                  onClick={() => saveTextField('classifier')}
                                  disabled={updating}
                                >
                                  {updating ? '...' : 'OK'}
                                </button>
                                <button 
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
                                  onClick={() => cancelEditing('classifier')}
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span className="ml-2 font-medium">{ticket.classifier || '-'}</span>
                              <button 
                                className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                                onClick={() => startEditing('classifier')}
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500">Date de création:</span>
                          <span className="ml-2 font-medium">{formatDate(ticket.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Données du formulaire */}
              {ticket.form_data && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold">Données du formulaire</h2>
                    {!editing.form_data ? (
                      <button 
                        className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm"
                        onClick={() => startEditing('form_data')}
                      >
                        ✏️ Modifier
                      </button>
                    ) : null}
                  </div>
                  
                  {editing.form_data ? (
                    <JsonEditor 
                      data={ticket.form_data} 
                      onSave={(data) => saveJsonField('form_data', data)} 
                      onCancel={() => cancelEditing('form_data')}
                    />
                  ) : (
                    <JsonViewer data={ticket.form_data} />
                  )}
                </div>
              )}
              
              {/* Détails supplémentaires */}
              {ticket.extra_details && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold">Détails supplémentaires</h2>
                    {!editing.extra_details ? (
                      <button 
                        className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm"
                        onClick={() => startEditing('extra_details')}
                      >
                        ✏️ Modifier
                      </button>
                    ) : null}
                  </div>
                  
                  {editing.extra_details ? (
                    <JsonEditor 
                      data={ticket.extra_details} 
                      onSave={(data) => saveJsonField('extra_details', data)} 
                      onCancel={() => cancelEditing('extra_details')}
                    />
                  ) : (
                    <JsonViewer data={ticket.extra_details} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
