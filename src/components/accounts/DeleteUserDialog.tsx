'use client';

import { useState } from 'react';

interface DeleteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted: () => void;
  userId: string | null;
  userEmail: string;
}

export default function DeleteUserDialog({ 
  isOpen, 
  onClose, 
  onUserDeleted, 
  userId, 
  userEmail 
}: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!userId) return;
    
    setIsDeleting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la désactivation de l\'utilisateur');
      }
      
      // Fermer la boîte de dialogue et rafraîchir la liste
      onClose();
      onUserDeleted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Désactiver le compte utilisateur</h2>
        
        <p className="mb-4 text-gray-600">
          Êtes-vous sûr de vouloir désactiver le compte de <span className="font-semibold">{userEmail}</span> ?
        </p>
        
        <p className="mb-4 text-sm text-gray-500">
          Cette action désactivera l'accès de l'utilisateur à l'application mais conservera ses données. 
          L'utilisateur ne pourra plus se connecter jusqu'à ce que son compte soit réactivé.
        </p>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isDeleting ? 'Désactivation...' : 'Désactiver le compte'}
          </button>
        </div>
      </div>
    </div>
  );
}
