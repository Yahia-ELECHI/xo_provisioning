'use client';

import React, { useState, useEffect } from 'react';

interface JsonEditorProps {
  data: any;
  title?: string;
  onSave: (data: any) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

// Fonction pour sanitizer les balises d'images dans une chaîne JSON
const sanitizeJsonForEditing = (jsonString: string): string => {
  if (typeof jsonString !== 'string') return jsonString;
  
  // Chercher des objets JSON contenants des balises <img>
  try {
    // Tenter de parser pour voir si c'est un JSON valide
    const obj = JSON.parse(jsonString);
    
    // Fonction récursive pour parcourir et sanitizer l'objet
    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      // Si c'est un tableau, traiter chaque élément
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      // Pour les objets, traiter chaque propriété
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.includes('<img') && value.includes('src=')) {
          // Remplacer les balises <img> par un texte indicatif
          result[key] = value.replace(
            /<img[^>]*>/gi, 
            '[Image: Voir dans l\'email original du ticket]'
          );
        } else if (typeof value === 'object' && value !== null) {
          // Traiter récursivement les objets imbriqués
          result[key] = sanitizeObject(value);
        } else {
          // Conserver les autres valeurs telles quelles
          result[key] = value;
        }
      }
      return result;
    };
    
    // Sanitizer et reconvertir en JSON
    const sanitizedObj = sanitizeObject(obj);
    return JSON.stringify(sanitizedObj, null, 2);
  } catch (e) {
    // Si le parsing échoue, essayer de remplacer directement les balises img
    return jsonString.replace(
      /<img[^>]+src\s*=\s*['"]([^'"]+)['"][^>]*>/gi,
      '[Image: Voir dans l\'email original du ticket]'
    );
  }
};

export default function JsonEditor({ data, title, onSave, onCancel, readOnly = false }: JsonEditorProps) {
  // Convertir les données en chaîne JSON formatée pour l'édition
  const [jsonString, setJsonString] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Convertir en string si ce n'est pas déjà le cas
      let jsonData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      
      // Sanitizer les balises d'images avant l'affichage
      jsonData = sanitizeJsonForEditing(jsonData);
      
      setJsonString(jsonData);
    } catch (err) {
      console.error('Erreur lors de la conversion des données en JSON:', err);
      setError('Erreur lors de la conversion des données');
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonString(e.target.value);
    setError(null); // Réinitialiser l'erreur lors de la modification
  };

  const handleSave = () => {
    try {
      const parsedData = JSON.parse(jsonString);
      onSave(parsedData);
    } catch (err) {
      console.error('Format JSON invalide:', err);
      setError('Format JSON invalide');
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      
      <div className="mb-4">
        <textarea
          className={`w-full h-64 p-3 border rounded-md font-mono text-sm ${error ? 'border-red-500' : 'border-gray-300'}`}
          value={jsonString}
          onChange={handleChange}
          disabled={readOnly}
        />
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
      
      {!readOnly && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}
